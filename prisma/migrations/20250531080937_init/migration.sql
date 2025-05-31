/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentStatus` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "orderId" TEXT NOT NULL,
ADD COLUMN     "paymentStatus" TEXT NOT NULL,
ALTER COLUMN "paymentRef" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orderId_key" ON "Subscription"("orderId");
