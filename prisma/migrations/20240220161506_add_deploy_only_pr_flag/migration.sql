-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dockerComposeDirectory" TEXT NOT NULL,
    "deployOnlyOnPullRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Repository" ("createdAt", "dockerComposeDirectory", "fullName", "id", "name", "owner", "updatedAt") SELECT "createdAt", "dockerComposeDirectory", "fullName", "id", "name", "owner", "updatedAt" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
