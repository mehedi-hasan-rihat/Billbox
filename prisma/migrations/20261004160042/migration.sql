/*
  Warnings:

  - You are about to drop the column `sender` on the `bills` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillSource" AS ENUM ('MANUAL', 'INBOX');

-- CreateEnum
CREATE TYPE "BillEventType" AS ENUM ('CREATED', 'SENT', 'RECEIVED', 'CONFIRMED', 'PAID', 'EDITED', 'NOTE_ADDED', 'PAYMENT_UPDATED');

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "sender",
ADD COLUMN     "senderBillerId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "source" "BillSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "billers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "billBoxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_events" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "type" "BillEventType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billers_userId_idx" ON "billers"("userId");

-- CreateIndex
CREATE INDEX "billers_userId_billBoxId_idx" ON "billers"("userId", "billBoxId");

-- CreateIndex
CREATE INDEX "bill_events_billId_idx" ON "bill_events"("billId");

-- CreateIndex
CREATE INDEX "bill_events_billId_type_idx" ON "bill_events"("billId", "type");

-- CreateIndex
CREATE INDEX "bills_userId_source_idx" ON "bills"("userId", "source");

-- AddForeignKey
ALTER TABLE "billers" ADD CONSTRAINT "billers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_senderBillerId_fkey" FOREIGN KEY ("senderBillerId") REFERENCES "billers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_events" ADD CONSTRAINT "bill_events_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_events" ADD CONSTRAINT "bill_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
