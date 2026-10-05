-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('INBOX', 'UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('INTERNET', 'ELECTRICITY', 'GAS', 'WATER', 'MOBILE', 'RESTAURANT', 'SHOPPING', 'SUBSCRIPTION', 'RENT', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BKASH', 'NAGAD', 'BANK', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "billBoxId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "billDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "sender" TEXT,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "confirmedStatus" "BillStatus",
    "receiverId" TEXT,
    "senderId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "paymentMethod" "PaymentMethod",
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_attachments" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_billBoxId_key" ON "users"("billBoxId");

-- CreateIndex
CREATE INDEX "bills_userId_idx" ON "bills"("userId");

-- CreateIndex
CREATE INDEX "bills_userId_status_idx" ON "bills"("userId", "status");

-- CreateIndex
CREATE INDEX "bills_userId_dueDate_idx" ON "bills"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "bills_userId_category_idx" ON "bills"("userId", "category");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_attachments" ADD CONSTRAINT "bill_attachments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
