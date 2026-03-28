/*
  Warnings:

  - Added the required column `userId` to the `Receipt` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "merchant" TEXT,
    "total" REAL,
    "currency" TEXT,
    "rawText" TEXT,
    "parsedData" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("createdAt", "currency", "id", "imagePath", "merchant", "parsedData", "processedAt", "rawText", "total") SELECT "createdAt", "currency", "id", "imagePath", "merchant", "parsedData", "processedAt", "rawText", "total" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
