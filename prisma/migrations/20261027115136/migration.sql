/*
  Warnings:

  - The values [PAID] on the enum `BillEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `billDate` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `paymentReference` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `receivedAt` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `senderBillerId` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `senderBillerId` on the `recurring_rules` table. All the data in the column will be lost.
  - You are about to drop the `billers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BillDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- AlterEnum
BEGIN;
CREATE TYPE "BillEventType_new" AS ENUM ('CREATED', 'SENT', 'RECEIVED', 'CONFIRMED', 'PAYMENT_ADDED', 'PAYMENT_UPDATED', 'PAYMENT_DELETED', 'FULLY_PAID', 'EDITED', 'NOTE_ADDED', 'NOTE_UPDATED', 'NOTE_DELETED', 'RECURRING_GENERATED');
ALTER TABLE "bill_events" ALTER COLUMN "type" TYPE "BillEventType_new" USING ("type"::text::"BillEventType_new");
ALTER TYPE "BillEventType" RENAME TO "BillEventType_old";
ALTER TYPE "BillEventType_new" RENAME TO "BillEventType";
DROP TYPE "public"."BillEventType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "BillStatus" ADD VALUE 'PARTIALLY_PAID';

-- DropForeignKey
ALTER TABLE "billers" DROP CONSTRAINT "billers_userId_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_senderBillerId_fkey";

-- DropIndex
DROP INDEX "bills_userId_billDate_idx";

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "billDate",
DROP COLUMN "note",
DROP COLUMN "paidAmount",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentReference",
DROP COLUMN "receivedAt",
DROP COLUMN "senderBillerId",
DROP COLUMN "sentAt",
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "direction" "BillDirection" NOT NULL DEFAULT 'OUTGOING',
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT[];

-- AlterTable
ALTER TABLE "recurring_rules" DROP COLUMN "senderBillerId",
ADD COLUMN     "contactId" TEXT;

-- DropTable
DROP TABLE "billers";

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "billBoxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_payments" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");

-- CreateIndex
CREATE INDEX "contacts_userId_billBoxId_idx" ON "contacts"("userId", "billBoxId");

-- CreateIndex
CREATE INDEX "bill_payments_billId_idx" ON "bill_payments"("billId");

-- CreateIndex
CREATE INDEX "bills_userId_issueDate_idx" ON "bills"("userId", "issueDate");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
