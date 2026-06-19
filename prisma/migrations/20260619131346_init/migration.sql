-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IssueAssignee" (
    "issueId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,

    PRIMARY KEY ("issueId", "assigneeId"),
    CONSTRAINT "IssueAssignee_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueAssignee_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IssueAssignee" ("assigneeId", "issueId") SELECT "assigneeId", "issueId" FROM "IssueAssignee";
DROP TABLE "IssueAssignee";
ALTER TABLE "new_IssueAssignee" RENAME TO "IssueAssignee";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
