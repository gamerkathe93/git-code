import { spawn } from "child_process";
import path from "path";
import { existsSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import jsyaml from "js-yaml";
import { getRepoPath, getFileContent } from "./git";
import { db } from "./db";

interface PipelineJobDef {
  name: string;
  stage?: string;
  script: string[];
  image?: string;
  env?: Record<string, string>;
  allowFailure?: boolean;
}

interface PipelineSchedule {
  cron?: string;
  branch?: string;
}

interface PipelineConfig {
  stages?: string[];
  variables?: Record<string, string>;
  schedule?: PipelineSchedule;
  jobs: Record<string, PipelineJobDef>;
}

export function parsePipelineConfig(yaml: string): PipelineConfig | null {
  try {
    const raw = jsyaml.load(yaml) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;

    const stages = Array.isArray(raw.stages)
      ? (raw.stages as string[])
      : ["build", "test", "deploy"];

    // Global variables merged into every job
    const globalVars: Record<string, string> =
      raw.variables && typeof raw.variables === "object"
        ? (raw.variables as Record<string, string>)
        : {};

    // Schedule config
    const schedule: PipelineSchedule | undefined =
      raw.schedule && typeof raw.schedule === "object"
        ? (raw.schedule as PipelineSchedule)
        : undefined;

    const RESERVED = new Set(["stages", "image", "variables", "schedule", "default", "include", "workflow"]);

    const jobs: Record<string, PipelineJobDef> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (RESERVED.has(key)) continue;
      if (typeof val === "object" && val !== null) {
        const job = val as Record<string, unknown>;
        if (job.script) {
          // Merge global vars with per-job vars (job vars take precedence)
          const jobVars = (job.variables as Record<string, string>) ?? {};
          jobs[key] = {
            name: key,
            stage: (job.stage as string) ?? stages[0],
            script: Array.isArray(job.script)
              ? (job.script as string[])
              : [job.script as string],
            env: { ...globalVars, ...jobVars },
            allowFailure: (job.allow_failure as boolean) ?? false,
          };
        }
      }
    }

    return { stages, variables: globalVars, schedule, jobs };
  } catch (e) {
    console.error("parsePipelineConfig error:", e);
    return null;
  }
}

async function runScript(
  commands: string[],
  cwd: string,
  env: Record<string, string> = {}
): Promise<{ success: boolean; logs: string; duration: number }> {
  const start = Date.now();
  let logs = "";

  return new Promise((resolve) => {
    const script = commands.join(" && ");
    const child = spawn("bash", ["-c", script], {
      cwd: existsSync(cwd) ? cwd : "/tmp",
      env: { ...process.env, ...env },
      timeout: 5 * 60 * 1000, // 5 min max
    });

    child.stdout.on("data", (d: Buffer) => { logs += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { logs += d.toString(); });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        logs,
        duration: Math.round((Date.now() - start) / 1000),
      });
    });

    child.on("error", (err) => {
      resolve({ success: false, logs: logs + `\nError: ${err.message}`, duration: Math.round((Date.now() - start) / 1000) });
    });
  });
}

export async function runPipeline(pipelineId: string, username: string, repoName: string): Promise<void> {
  const pipeline = await db.pipeline.findUnique({ where: { id: pipelineId }, include: { jobs: true } });
  if (!pipeline) return;

  await db.pipeline.update({ where: { id: pipelineId }, data: { status: "running" } });

  // Clone bare repo to a temp working directory so scripts have a real file tree
  const repoPath = getRepoPath(username, repoName);
  const workDir = path.join(tmpdir(), `gitcode-pipeline-${pipelineId}`);
  let cleanupWorkDir = false;

  try {
  if (existsSync(repoPath)) {
    mkdirSync(path.dirname(workDir), { recursive: true });
    cleanupWorkDir = true;
    // git clone from the bare repo into workDir
    await new Promise<void>((resolve, reject) => {
      const child = spawn("git", ["clone", repoPath, workDir], { stdio: "pipe" });
      child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`git clone failed with code ${code}`)));
      child.on("error", reject);
    });
    // checkout the pipeline branch
    if (pipeline.branch && pipeline.branch !== "HEAD") {
      await new Promise<void>((resolve) => {
        const child = spawn("git", ["checkout", pipeline.branch!], { cwd: workDir, stdio: "pipe" });
        child.on("close", () => resolve());
        child.on("error", () => resolve());
      });
    }
  }

  // Try to read .gitcode.yml or .gitlab-ci.yml from repo
  let config: PipelineConfig | null = null;
  for (const configFile of [".gitcode.yml", ".gitlab-ci.yml", ".ci.yml"]) {
    const content = await getFileContent(username, repoName, configFile, pipeline.branch || "HEAD");
    if (content) {
      config = parsePipelineConfig(content);
      if (config) break;
    }
  }

  // Default config if none found
  if (!config || Object.keys(config.jobs).length === 0) {
    config = {
      stages: ["build", "test"],
      jobs: {
        build: { name: "build", stage: "build", script: ["echo 'Build step'", "ls -la"] },
        test: { name: "test", stage: "test", script: ["echo 'Test step'", "echo 'All tests passed'"] },
      },
    };
  }

  // Create jobs in DB
  await db.pipelineJob.deleteMany({ where: { pipelineId } });
  const jobIds: Record<string, string> = {};
  for (const [, jobDef] of Object.entries(config.jobs)) {
    const job = await db.pipelineJob.create({
      data: {
        pipelineId,
        name: jobDef.name,
        stage: jobDef.stage ?? "build",
        status: "pending",
      },
    });
    jobIds[jobDef.name] = job.id;
  }

  let pipelineSuccess = true;

  for (const stage of config.stages ?? ["build", "test"]) {
    const stageJobs = Object.values(config.jobs).filter((j) => j.stage === stage);
    if (stageJobs.length === 0) continue;

    // Run stage jobs (sequentially for simplicity)
    for (const jobDef of stageJobs) {
      const jobId = jobIds[jobDef.name];
      if (!jobId) continue;

      await db.pipelineJob.update({
        where: { id: jobId },
        data: { status: "running", startedAt: new Date() },
      });

      const { success, logs, duration } = await runScript(
        jobDef.script,
        cleanupWorkDir ? workDir : "/tmp",
        jobDef.env ?? {}
      );

      await db.pipelineJob.update({
        where: { id: jobId },
        data: {
          status: success ? "success" : "failed",
          logs,
          duration,
          finishedAt: new Date(),
        },
      });

      if (!success && !jobDef.allowFailure) {
        pipelineSuccess = false;
        // Cancel remaining jobs
        await db.pipelineJob.updateMany({
          where: { pipelineId, status: "pending" },
          data: { status: "canceled" },
        });
        break;
      }
    }

    if (!pipelineSuccess) break;
  }

    const completedJobs = await db.pipelineJob.findMany({ where: { pipelineId } });
    const totalDuration = completedJobs.reduce((sum: number, j: { duration: number }) => sum + (j.duration || 0), 0);
    await db.pipeline.update({
      where: { id: pipelineId },
      data: {
        status: pipelineSuccess ? "success" : "failed",
        duration: totalDuration,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Pipeline runner error:", err);
    await db.pipeline.update({
      where: { id: pipelineId },
      data: { status: "failed", updatedAt: new Date() },
    }).catch(() => {});
  } finally {
    // Clean up the temp working directory
    if (cleanupWorkDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}
