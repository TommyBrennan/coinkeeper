-- CreateTable
CREATE TABLE "ExchangeRateHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reminderDays" INTEGER,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "reminderDays", "updatedAt") SELECT "createdAt", "email", "id", "name", "reminderDays", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_fromCurrency_toCurrency_idx" ON "ExchangeRateHistory"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRateHistory_date_idx" ON "ExchangeRateHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateHistory_fromCurrency_toCurrency_date_key" ON "ExchangeRateHistory"("fromCurrency", "toCurrency", "date");
