-- CreateTable
CREATE TABLE "_MeetingUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MeetingUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MeetingUsers_B_index" ON "_MeetingUsers"("B");

-- AddForeignKey
ALTER TABLE "_MeetingUsers" ADD CONSTRAINT "_MeetingUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingUsers" ADD CONSTRAINT "_MeetingUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
