-- CreateTable
CREATE TABLE "DailyMeetingLink" (
    "id" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingSettingId" INTEGER NOT NULL,

    CONSTRAINT "DailyMeetingLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMeetingLink_meetingDate_key" ON "DailyMeetingLink"("meetingDate");

-- AddForeignKey
ALTER TABLE "DailyMeetingLink" ADD CONSTRAINT "DailyMeetingLink_meetingSettingId_fkey" FOREIGN KEY ("meetingSettingId") REFERENCES "MeetingSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
