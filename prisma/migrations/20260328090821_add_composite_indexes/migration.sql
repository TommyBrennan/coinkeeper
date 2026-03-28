-- CreateIndex
CREATE INDEX "ProductPrice_productId_date_idx" ON "ProductPrice"("productId", "date");

-- CreateIndex
CREATE INDEX "Receipt_userId_createdAt_idx" ON "Receipt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringRule_isActive_nextExecution_idx" ON "RecurringRule"("isActive", "nextExecution");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
