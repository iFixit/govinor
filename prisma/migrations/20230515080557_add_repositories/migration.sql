-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dockerComposeDirectory" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branch" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "cloneUrl" TEXT NOT NULL,
    "dockerComposeDirectory" TEXT NOT NULL,
    "repositoryId" TEXT,
    CONSTRAINT "Branch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Branch" ("cloneUrl", "dockerComposeDirectory", "handle", "name") SELECT "cloneUrl", "dockerComposeDirectory", "handle", "name" FROM "Branch";
DROP TABLE "Branch";
ALTER TABLE "new_Branch" RENAME TO "Branch";
CREATE UNIQUE INDEX "Branch_handle_key" ON "Branch"("handle");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");
