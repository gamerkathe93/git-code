CREATE TABLE "Release" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tagName" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL DEFAULT '',
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "isPrerelease" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "repoId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "Release_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Release_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Release_repoId_tagName_key" ON "Release"("repoId", "tagName");

CREATE TABLE "WikiPage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "repoId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "WikiPage_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WikiPage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WikiPage_repoId_slug_key" ON "WikiPage"("repoId", "slug");
