-- AlterTable
ALTER TABLE "FeeType" ALTER COLUMN "amount" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "feeTypeId" INTEGER NOT NULL,
    "classSectionId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE,
    "session" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeStructure_schoolId_idx" ON "FeeStructure"("schoolId");

-- CreateIndex
CREATE INDEX "FeeStructure_classSectionId_idx" ON "FeeStructure"("classSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_schoolId_feeTypeId_classSectionId_session_key" ON "FeeStructure"("schoolId", "feeTypeId", "classSectionId", "session");

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
