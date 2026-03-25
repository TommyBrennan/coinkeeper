-- CreateTable
CREATE TABLE "CategoryCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestedCategoryId" TEXT,
    "correctedCategoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CategoryCorrection_userId_idx" ON "CategoryCorrection"("userId");

-- CreateIndex
CREATE INDEX "CategoryCorrection_description_idx" ON "CategoryCorrection"("description");
