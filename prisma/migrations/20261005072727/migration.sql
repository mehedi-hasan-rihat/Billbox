-- CreateIndex
CREATE INDEX "bills_userId_billDate_idx" ON "bills"("userId", "billDate");

-- CreateIndex
CREATE INDEX "bills_userId_amount_idx" ON "bills"("userId", "amount");
