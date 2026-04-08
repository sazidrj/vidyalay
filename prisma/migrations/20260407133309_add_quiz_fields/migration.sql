-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "isQuiz" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
