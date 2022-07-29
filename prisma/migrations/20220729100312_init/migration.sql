-- CreateTable
CREATE TABLE "Branch" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "cloneUrl" TEXT NOT NULL,
    "dockerComposeDirectory" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_handle_key" ON "Branch"("handle");
