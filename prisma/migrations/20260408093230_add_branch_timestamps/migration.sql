-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branch" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "cloneUrl" TEXT NOT NULL,
    "dockerComposeDirectory" TEXT NOT NULL,
    "repositoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Branch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Branch" ("cloneUrl", "dockerComposeDirectory", "handle", "name", "repositoryId", "createdAt", "updatedAt") SELECT "cloneUrl", "dockerComposeDirectory", "handle", "name", "repositoryId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Branch";
DROP TABLE "Branch";
ALTER TABLE "new_Branch" RENAME TO "Branch";
CREATE UNIQUE INDEX "Branch_handle_key" ON "Branch"("handle");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
