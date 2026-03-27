-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "summary" TEXT,
    "fileName" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "GeneratedReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SavedReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "filters" TEXT NOT NULL,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFrequency" TEXT,
    "scheduleDay" INTEGER,
    "scheduleTime" TEXT,
    "nextRunAt" DATETIME,
    "lastGeneratedAt" DATETIME,
    CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedReport" ("createdAt", "description", "filters", "format", "id", "lastRunAt", "name", "updatedAt", "userId") SELECT "createdAt", "description", "filters", "format", "id", "lastRunAt", "name", "updatedAt", "userId" FROM "SavedReport";
DROP TABLE "SavedReport";
ALTER TABLE "new_SavedReport" RENAME TO "SavedReport";
CREATE INDEX "SavedReport_userId_idx" ON "SavedReport"("userId");
CREATE INDEX "SavedReport_scheduleEnabled_nextRunAt_idx" ON "SavedReport"("scheduleEnabled", "nextRunAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GeneratedReport_reportId_idx" ON "GeneratedReport"("reportId");

-- CreateIndex
CREATE INDEX "GeneratedReport_userId_idx" ON "GeneratedReport"("userId");

-- CreateIndex
CREATE INDEX "GeneratedReport_expiresAt_idx" ON "GeneratedReport"("expiresAt");
