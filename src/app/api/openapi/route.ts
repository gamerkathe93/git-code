import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "GitCode API",
    version: "1.0.0",
    description:
      "REST API for GitCode — a self-hosted GitHub-style platform. All endpoints use session-cookie auth (set via POST /api/auth/login). Pass `Content-Type: application/json` on write requests.",
    contact: { name: "GitCode", url: "https://github.com" },
  },
  servers: [{ url: "/api", description: "Current server" }],
  tags: [
    { name: "Auth", description: "Authentication & session management" },
    { name: "Repos", description: "Repository CRUD" },
    { name: "Git", description: "Branches, commits, file tree, file content" },
    { name: "Issues", description: "Issues & comments" },
    { name: "Pull Requests", description: "Pull request lifecycle" },
    { name: "Pipelines", description: "CI/CD pipeline execution" },
    { name: "Stars", description: "Starring repositories" },
    { name: "Labels", description: "Issue labels" },
    { name: "Notifications", description: "User notifications" },
    { name: "Orgs", description: "Organizations" },
    { name: "Users", description: "User profiles" },
    { name: "Search", description: "Global search" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "gitcode_session",
        description: "HTTP-only JWT cookie — obtained from POST /api/auth/login",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          email: { type: "string" },
          name: { type: "string" },
          bio: { type: "string" },
          avatarUrl: { type: "string" },
          website: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Repo: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          isPrivate: { type: "boolean" },
          defaultBranch: { type: "string" },
          language: { type: "string" },
          topics: { type: "string", description: "JSON-encoded string array" },
          license: { type: "string" },
          hasIssues: { type: "boolean" },
          hasWiki: { type: "boolean" },
          starsCount: { type: "integer" },
          forksCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          owner: { $ref: "#/components/schemas/UserMin" },
        },
      },
      UserMin: {
        type: "object",
        properties: {
          username: { type: "string" },
          name: { type: "string" },
          avatarUrl: { type: "string" },
        },
      },
      Issue: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "integer" },
          title: { type: "string" },
          body: { type: "string" },
          state: { type: "string", enum: ["open", "closed"] },
          author: { $ref: "#/components/schemas/UserMin" },
          createdAt: { type: "string", format: "date-time" },
          closedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      PullRequest: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "integer" },
          title: { type: "string" },
          body: { type: "string" },
          state: { type: "string", enum: ["open", "closed", "merged"] },
          headBranch: { type: "string" },
          baseBranch: { type: "string" },
          isDraft: { type: "boolean" },
          author: { $ref: "#/components/schemas/UserMin" },
          createdAt: { type: "string", format: "date-time" },
          mergedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Pipeline: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["pending", "running", "success", "failed", "canceled"] },
          branch: { type: "string" },
          commitSha: { type: "string" },
          commitMsg: { type: "string" },
          source: { type: "string", enum: ["push", "manual", "schedule", "api"] },
          duration: { type: "integer", description: "Seconds" },
          createdAt: { type: "string", format: "date-time" },
          jobs: { type: "array", items: { $ref: "#/components/schemas/PipelineJob" } },
        },
      },
      PipelineJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          stage: { type: "string" },
          status: { type: "string", enum: ["pending", "running", "success", "failed", "canceled"] },
          logs: { type: "string" },
          duration: { type: "integer" },
          startedAt: { type: "string", format: "date-time", nullable: true },
          finishedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string" },
          body: { type: "string" },
          author: { $ref: "#/components/schemas/UserMin" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["mention", "review_request", "push", "issue", "pull_request", "pipeline"] },
          title: { type: "string" },
          body: { type: "string" },
          isRead: { type: "boolean" },
          url: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Label: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          color: { type: "string", description: "Hex color e.g. #ff0000" },
          description: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    // ── AUTH ──────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "password", "name"],
                properties: {
                  username: { type: "string", example: "bhavish" },
                  email: { type: "string", format: "email", example: "bhavish@example.com" },
                  password: { type: "string", minLength: 8, example: "supersecret" },
                  name: { type: "string", example: "Bhavish Salian" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Account created", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/UserMin" } } } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Username or email already taken", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in and receive a session cookie",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Logged in — sets `gitcode_session` cookie", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/UserMin" } } } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Sign out and clear the session cookie",
        responses: {
          "200": { description: "Logged out" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        responses: {
          "200": { description: "Current user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Not authenticated" },
        },
      },
    },

    // ── REPOS ─────────────────────────────────────────────────────────────
    "/repos": {
      get: {
        tags: ["Repos"],
        summary: "List repositories of the current user",
        responses: {
          "200": { description: "Repo list", content: { "application/json": { schema: { type: "object", properties: { repos: { type: "array", items: { $ref: "#/components/schemas/Repo" } } } } } } },
        },
      },
      post: {
        tags: ["Repos"],
        summary: "Create a new repository",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "my-repo" },
                  description: { type: "string" },
                  isPrivate: { type: "boolean", default: false },
                  defaultBranch: { type: "string", default: "main" },
                  initReadme: { type: "boolean", default: false },
                  license: { type: "string", example: "MIT" },
                  language: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Repository created", content: { "application/json": { schema: { type: "object", properties: { repo: { $ref: "#/components/schemas/Repo" } } } } } },
          "409": { description: "Repo name already taken" },
        },
      },
    },
    "/repos/{owner}/{repo}": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" }, example: "bhavish" },
        { name: "repo", in: "path", required: true, schema: { type: "string" }, example: "my-repo" },
      ],
      get: {
        tags: ["Repos"],
        summary: "Get repository details",
        responses: {
          "200": { description: "Repository", content: { "application/json": { schema: { $ref: "#/components/schemas/Repo" } } } },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Repos"],
        summary: "Update repository settings",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  isPrivate: { type: "boolean" },
                  defaultBranch: { type: "string" },
                  hasIssues: { type: "boolean" },
                  hasWiki: { type: "boolean" },
                  topics: { type: "string" },
                  language: { type: "string" },
                  license: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated repository" },
          "403": { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Repos"],
        summary: "Delete a repository",
        responses: {
          "200": { description: "Deleted" },
          "403": { description: "Forbidden" },
        },
      },
    },

    // ── GIT ───────────────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/branches": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
      ],
      get: {
        tags: ["Git"],
        summary: "List branches",
        responses: {
          "200": { description: "Branch list", content: { "application/json": { schema: { type: "object", properties: { branches: { type: "array", items: { type: "object", properties: { name: { type: "string" }, current: { type: "boolean" } } } } } } } } },
        },
      },
    },
    "/repos/{owner}/{repo}/commits": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "branch", in: "query", schema: { type: "string" }, description: "Branch name (default: repo default branch)" },
        { name: "limit", in: "query", schema: { type: "integer", default: 30 } },
      ],
      get: {
        tags: ["Git"],
        summary: "List commits on a branch",
        responses: {
          "200": {
            description: "Commits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    commits: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sha: { type: "string" },
                          shortSha: { type: "string" },
                          message: { type: "string" },
                          author: { type: "object", properties: { name: { type: "string" }, email: { type: "string" } } },
                          date: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/repos/{owner}/{repo}/tree": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "ref", in: "query", schema: { type: "string" }, description: "Branch or commit SHA" },
        { name: "path", in: "query", schema: { type: "string" }, description: "Sub-directory path" },
      ],
      get: {
        tags: ["Git"],
        summary: "Get file tree for a directory",
        responses: {
          "200": {
            description: "Tree entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tree: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string", enum: ["blob", "tree"] },
                          path: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/repos/{owner}/{repo}/file": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "path", in: "query", schema: { type: "string" }, description: "File path" },
        { name: "ref", in: "query", schema: { type: "string" }, description: "Branch or commit SHA" },
      ],
      get: {
        tags: ["Git"],
        summary: "Get raw file content",
        responses: {
          "200": { description: "File content", content: { "application/json": { schema: { type: "object", properties: { content: { type: "string" }, path: { type: "string" }, ref: { type: "string" } } } } } },
          "404": { description: "File not found" },
        },
      },
      put: {
        tags: ["Git"],
        summary: "Create or update a file",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["path", "content", "message"],
                properties: {
                  path: { type: "string", example: "README.md" },
                  content: { type: "string", description: "Raw file content" },
                  message: { type: "string", example: "Update README" },
                  branch: { type: "string", default: "main" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "File written" },
          "403": { description: "Forbidden" },
        },
      },
    },

    // ── ISSUES ────────────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/issues": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string", enum: ["open", "closed"], default: "open" } },
      ],
      get: {
        tags: ["Issues"],
        summary: "List issues",
        responses: {
          "200": { description: "Issues", content: { "application/json": { schema: { type: "object", properties: { issues: { type: "array", items: { $ref: "#/components/schemas/Issue" } } } } } } },
        },
      },
      post: {
        tags: ["Issues"],
        summary: "Create an issue",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  labelIds: { type: "array", items: { type: "string" } },
                  milestoneId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Issue created", content: { "application/json": { schema: { type: "object", properties: { issue: { $ref: "#/components/schemas/Issue" } } } } } },
        },
      },
    },
    "/repos/{owner}/{repo}/issues/{number}": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "number", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        tags: ["Issues"],
        summary: "Get a single issue",
        responses: {
          "200": { description: "Issue", content: { "application/json": { schema: { $ref: "#/components/schemas/Issue" } } } },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Issues"],
        summary: "Update or close/reopen an issue",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  state: { type: "string", enum: ["open", "closed"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/repos/{owner}/{repo}/issues/{number}/comments": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "number", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        tags: ["Issues"],
        summary: "List issue comments",
        responses: {
          "200": { description: "Comments", content: { "application/json": { schema: { type: "object", properties: { comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } } } } } } },
        },
      },
      post: {
        tags: ["Issues"],
        summary: "Post a comment on an issue",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["body"], properties: { body: { type: "string" } } } } },
        },
        responses: {
          "201": { description: "Comment posted", content: { "application/json": { schema: { type: "object", properties: { comment: { $ref: "#/components/schemas/Comment" } } } } } },
        },
      },
    },

    // ── PULL REQUESTS ─────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/pulls": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string", enum: ["open", "closed", "merged"], default: "open" } },
      ],
      get: {
        tags: ["Pull Requests"],
        summary: "List pull requests",
        responses: {
          "200": { description: "Pull requests", content: { "application/json": { schema: { type: "object", properties: { pulls: { type: "array", items: { $ref: "#/components/schemas/PullRequest" } } } } } } },
        },
      },
      post: {
        tags: ["Pull Requests"],
        summary: "Open a pull request",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "headBranch", "baseBranch"],
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  headBranch: { type: "string", example: "feature/my-change" },
                  baseBranch: { type: "string", example: "main" },
                  isDraft: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "PR created", content: { "application/json": { schema: { type: "object", properties: { pull: { $ref: "#/components/schemas/PullRequest" } } } } } },
        },
      },
    },
    "/repos/{owner}/{repo}/pulls/{number}": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
        { name: "number", in: "path", required: true, schema: { type: "integer" } },
      ],
      patch: {
        tags: ["Pull Requests"],
        summary: "Merge, close, or reopen a PR",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["merge", "close", "reopen"] },
                  title: { type: "string" },
                  body: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated PR", content: { "application/json": { schema: { type: "object", properties: { pull: { $ref: "#/components/schemas/PullRequest" } } } } } },
          "403": { description: "Only owner can merge" },
        },
      },
    },

    // ── PIPELINES ─────────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/pipelines": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
      ],
      get: {
        tags: ["Pipelines"],
        summary: "List pipelines",
        responses: {
          "200": { description: "Pipelines", content: { "application/json": { schema: { type: "object", properties: { pipelines: { type: "array", items: { $ref: "#/components/schemas/Pipeline" } } } } } } },
        },
      },
      post: {
        tags: ["Pipelines"],
        summary: "Trigger a pipeline manually",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["branch"],
                properties: {
                  branch: { type: "string", example: "main" },
                  commitMsg: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Pipeline queued", content: { "application/json": { schema: { type: "object", properties: { pipeline: { $ref: "#/components/schemas/Pipeline" } } } } } },
        },
      },
    },

    // ── STARS ─────────────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/star": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
      ],
      post: {
        tags: ["Stars"],
        summary: "Star a repository",
        responses: {
          "200": { description: "Starred", content: { "application/json": { schema: { type: "object", properties: { starred: { type: "boolean" }, count: { type: "integer" } } } } } },
        },
      },
      delete: {
        tags: ["Stars"],
        summary: "Unstar a repository",
        responses: {
          "200": { description: "Unstarred", content: { "application/json": { schema: { type: "object", properties: { starred: { type: "boolean" }, count: { type: "integer" } } } } } },
        },
      },
    },

    // ── LABELS ────────────────────────────────────────────────────────────
    "/repos/{owner}/{repo}/labels": {
      parameters: [
        { name: "owner", in: "path", required: true, schema: { type: "string" } },
        { name: "repo", in: "path", required: true, schema: { type: "string" } },
      ],
      get: {
        tags: ["Labels"],
        summary: "List labels",
        responses: {
          "200": { description: "Labels", content: { "application/json": { schema: { type: "object", properties: { labels: { type: "array", items: { $ref: "#/components/schemas/Label" } } } } } } },
        },
      },
      post: {
        tags: ["Labels"],
        summary: "Create a label",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "color"],
                properties: {
                  name: { type: "string", example: "bug" },
                  color: { type: "string", example: "#d73a4a" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Label created", content: { "application/json": { schema: { type: "object", properties: { label: { $ref: "#/components/schemas/Label" } } } } } },
        },
      },
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications for the current user",
        parameters: [
          { name: "unread", in: "query", schema: { type: "boolean" }, description: "Filter to unread only" },
        ],
        responses: {
          "200": { description: "Notifications", content: { "application/json": { schema: { type: "object", properties: { notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } } } } } } },
        },
      },
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification(s) as read",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Mark a single notification as read" },
                  readAll: { type: "boolean", description: "Mark all notifications as read" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated" },
        },
      },
    },

    // ── ORGS ──────────────────────────────────────────────────────────────
    "/orgs": {
      get: {
        tags: ["Orgs"],
        summary: "List organizations the current user belongs to",
        responses: {
          "200": { description: "Organizations" },
        },
      },
      post: {
        tags: ["Orgs"],
        summary: "Create an organization",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "displayName"],
                properties: {
                  name: { type: "string", example: "acme" },
                  displayName: { type: "string", example: "Acme Corp" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Organization created" },
          "409": { description: "Name taken" },
        },
      },
    },

    // ── USERS ─────────────────────────────────────────────────────────────
    "/users/{username}": {
      parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["Users"],
        summary: "Get a user profile and their public repos",
        responses: {
          "200": { description: "User profile", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, repos: { type: "array", items: { $ref: "#/components/schemas/Repo" } } } } } } },
          "404": { description: "Not found" },
        },
      },
    },

    // ── SEARCH ────────────────────────────────────────────────────────────
    "/search": {
      get: {
        tags: ["Search"],
        summary: "Search repositories and users",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, example: "next.js" },
          { name: "type", in: "query", schema: { type: "string", enum: ["repos", "users"], default: "repos" } },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    repos: { type: "array", items: { $ref: "#/components/schemas/Repo" } },
                    users: { type: "array", items: { $ref: "#/components/schemas/UserMin" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
