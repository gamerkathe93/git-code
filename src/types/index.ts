export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  website: string;
  company: string;
  followers: number;
  following: number;
  publicRepos: number;
  createdAt: string;
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  description: string;
  members: number;
  repos: number;
  createdAt: string;
};

export type Repository = {
  id: string;
  name: string;
  fullName: string;
  owner: User | Organization;
  description: string;
  isPrivate: boolean;
  isForked: boolean;
  forkedFrom?: string;
  language: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  openPRs: number;
  defaultBranch: string;
  topics: string[];
  license: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
};

export type Branch = {
  id: string;
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected: boolean;
  aheadBy: number;
  behindBy: number;
  lastCommit: Commit;
  author: User;
  updatedAt: string;
};

export type Commit = {
  sha: string;
  shortSha: string;
  message: string;
  body: string;
  author: User;
  authoredAt: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  parents: string[];
};

export type TreeNode = {
  name: string;
  path: string;
  type: "file" | "tree";
  size?: number;
  sha: string;
  lastCommit: string;
  lastCommitDate: string;
};

export type PullRequest = {
  id: string;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed" | "merged" | "draft";
  author: User;
  assignees: User[];
  reviewers: User[];
  labels: Label[];
  milestone?: Milestone;
  sourceBranch: string;
  targetBranch: string;
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
  comments: number;
  reviewComments: number;
  approvals: number;
  changesRequested: number;
  mergedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  isMergeable: boolean;
};

export type Issue = {
  id: string;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  stateReason?: "completed" | "not_planned";
  author: User;
  assignees: User[];
  labels: Label[];
  milestone?: Milestone;
  comments: number;
  reactions: Reactions;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
  description: string;
};

export type Milestone = {
  id: string;
  number: number;
  title: string;
  description: string;
  state: "open" | "closed";
  dueOn?: string;
  openIssues: number;
  closedIssues: number;
  progress: number;
  createdAt: string;
};

export type Comment = {
  id: string;
  body: string;
  author: User;
  reactions: Reactions;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
};

export type Reactions = {
  thumbsUp: number;
  thumbsDown: number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
};

export type Pipeline = {
  id: string;
  number: number;
  status: "pending" | "running" | "success" | "failed" | "canceled" | "skipped";
  ref: string;
  sha: string;
  source: "push" | "pull_request" | "schedule" | "manual" | "api";
  commit: Commit;
  stages: PipelineStage[];
  duration?: number;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  triggeredBy: User;
};

export type PipelineStage = {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "failed" | "canceled" | "skipped";
  jobs: PipelineJob[];
};

export type PipelineJob = {
  id: string;
  name: string;
  stage: string;
  status: "pending" | "running" | "success" | "failed" | "canceled" | "skipped";
  duration?: number;
  startedAt?: string;
  finishedAt?: string;
  runner?: string;
  logs?: string;
};

export type Release = {
  id: string;
  tagName: string;
  name: string;
  body: string;
  isDraft: boolean;
  isPreRelease: boolean;
  author: User;
  assets: ReleaseAsset[];
  createdAt: string;
  publishedAt?: string;
  targetCommitish: string;
};

export type ReleaseAsset = {
  id: string;
  name: string;
  size: number;
  downloadCount: number;
  contentType: string;
  url: string;
};

export type Notification = {
  id: string;
  type: "mention" | "review" | "issue" | "pull_request" | "pipeline" | "commit";
  title: string;
  body: string;
  repo: string;
  url: string;
  isRead: boolean;
  createdAt: string;
};

export type WebhookEvent =
  | "push"
  | "pull_request"
  | "issues"
  | "release"
  | "pipeline"
  | "member"
  | "star"
  | "fork";

export type Webhook = {
  id: string;
  url: string;
  contentType: "json" | "form";
  secret?: string;
  events: WebhookEvent[];
  isActive: boolean;
  lastDelivery?: string;
  lastStatus?: number;
  createdAt: string;
};

export type DeployEnvironment = {
  id: string;
  name: string;
  url?: string;
  state: "active" | "inactive" | "failed";
  lastDeployment?: {
    sha: string;
    createdAt: string;
    deployedBy: User;
  };
};

export type SortOption = "newest" | "oldest" | "most-commented" | "least-commented" | "updated";
export type FilterState = "open" | "closed" | "all";
