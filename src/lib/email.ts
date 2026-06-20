import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "GitCode <noreply@gitcode.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getTransport() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    // Email not configured — log and skip
    console.log(`[email] SMTP not configured, skipping: ${opts.subject} → ${opts.to}`);
    return false;
  }
  try {
    await transport.sendMail({ from: SMTP_FROM, ...opts });
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

// Email templates
export function emailTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string): string {
  const href = ctaUrl?.startsWith("http") ? ctaUrl : `${APP_URL}${ctaUrl}`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; margin: 0; padding: 0; }
.wrapper { max-width: 560px; margin: 40px auto; }
.header { background: linear-gradient(135deg, #1d4ed8, #7c3aed); border-radius: 12px 12px 0 0; padding: 24px; display: flex; align-items: center; gap: 12px; }
.header h1 { color: #fff; margin: 0; font-size: 18px; }
.body { background: #161b22; border: 1px solid #30363d; border-top: none; border-radius: 0 0 12px 12px; padding: 28px; }
.body p { color: #c9d1d9; line-height: 1.6; margin: 0 0 16px; }
.cta { display: inline-block; background: #238636; color: #fff; text-decoration: none; border-radius: 6px; padding: 10px 20px; font-weight: 600; margin-top: 8px; }
.footer { text-align: center; color: #7d8590; font-size: 12px; margin-top: 20px; }
</style></head>
<body>
<div class="wrapper">
  <div class="header"><h1>⬡ GitCode</h1></div>
  <div class="body">
    <h2 style="color:#e6edf3;margin:0 0 16px">${title}</h2>
    ${body}
    ${ctaText && ctaUrl ? `<br><a href="${href}" class="cta">${ctaText}</a>` : ""}
  </div>
  <div class="footer">You're receiving this because you're a member of GitCode. <br>© ${new Date().getFullYear()} GitCode</div>
</div>
</body>
</html>`;
}

// Specific email senders
export async function sendMentionEmail(toEmail: string, mentionedBy: string, context: string, url: string) {
  return sendEmail({
    to: toEmail,
    subject: `${mentionedBy} mentioned you on GitCode`,
    html: emailTemplate(
      `You were mentioned`,
      `<p><strong>${mentionedBy}</strong> mentioned you in a ${context}:</p>`,
      "View comment",
      url
    ),
  });
}

export async function sendCommentEmail(toEmail: string, commenter: string, context: string, url: string) {
  return sendEmail({
    to: toEmail,
    subject: `New comment on ${context}`,
    html: emailTemplate(
      `New comment`,
      `<p><strong>${commenter}</strong> left a comment on ${context}.</p>`,
      "View comment",
      url
    ),
  });
}

export async function sendIssueEmail(toEmail: string, opener: string, repoFullName: string, title: string, url: string) {
  return sendEmail({
    to: toEmail,
    subject: `[${repoFullName}] ${title}`,
    html: emailTemplate(
      `New issue: ${title}`,
      `<p><strong>${opener}</strong> opened a new issue in <strong>${repoFullName}</strong>.</p>`,
      "View issue",
      url
    ),
  });
}

export async function sendPREmail(toEmail: string, opener: string, repoFullName: string, title: string, url: string) {
  return sendEmail({
    to: toEmail,
    subject: `[${repoFullName}] PR: ${title}`,
    html: emailTemplate(
      `New pull request: ${title}`,
      `<p><strong>${opener}</strong> opened a pull request in <strong>${repoFullName}</strong>.</p>`,
      "Review pull request",
      url
    ),
  });
}

export async function sendReviewEmail(toEmail: string, reviewer: string, state: string, prTitle: string, url: string) {
  const stateLabel = state === "approved" ? "approved your PR" : "requested changes on your PR";
  return sendEmail({
    to: toEmail,
    subject: `${reviewer} ${stateLabel}: ${prTitle}`,
    html: emailTemplate(
      `PR review: ${state === "approved" ? "✓ Approved" : "⚠ Changes requested"}`,
      `<p><strong>${reviewer}</strong> ${stateLabel} <em>${prTitle}</em>.</p>`,
      "View review",
      url
    ),
  });
}

export async function sendPipelineEmail(toEmail: string, status: string, repoFullName: string, branch: string, url: string) {
  const success = status === "success";
  return sendEmail({
    to: toEmail,
    subject: `Pipeline ${success ? "passed" : "failed"} · ${repoFullName} (${branch})`,
    html: emailTemplate(
      `Pipeline ${success ? "✓ passed" : "✗ failed"}`,
      `<p>Your pipeline on <strong>${branch}</strong> in <strong>${repoFullName}</strong> ${success ? "completed successfully" : "failed"}.</p>`,
      "View pipeline",
      url
    ),
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
  return sendEmail({
    to: toEmail,
    subject: "Reset your GitCode password",
    html: emailTemplate(
      "Password reset",
      `<p>Someone requested a password reset for your GitCode account. Click the button below to set a new password. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      "Reset password",
      resetUrl
    ),
  });
}
