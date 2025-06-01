/*
  Warnings:

  - You are about to drop the `MeetingSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meetingDesc" TEXT DEFAULT 'Join us for a GOALETE Club session to learn how to achieve any goal in life.',
ADD COLUMN     "meetingTitle" TEXT NOT NULL DEFAULT 'GOALETE Club Session';

-- DropTable
DROP TABLE "MeetingSetting";
