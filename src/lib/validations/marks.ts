import { z } from "zod"

export const examTypeSchema = z.object({
  name: z.string().min(2),
  maxMarks: z.number().int().positive().default(100),
  passMarks: z.number().int().positive().default(33),
  weightPct: z.number().int().min(1).max(100).default(100),
})

export const examSchema = z.object({
  examTypeId: z.number().int().positive(),
  classSectionId: z.number().int().positive().optional().nullable(),
  subjectId: z.number().int().positive().optional().nullable(),
  examDate: z.string().optional(),
  session: z.string().default("2025-26"),
  isQuiz: z.boolean().default(false),
})

export const bulkMarksSchema = z.object({
  examId: z.number().int().positive(),
  entries: z.array(
    z.object({
      studentId: z.number().int().positive(),
      marksObtained: z.number().min(0),
      remarks: z.string().optional(),
    })
  ),
})

export type ExamTypeInput = z.infer<typeof examTypeSchema>
export type ExamInput = z.infer<typeof examSchema>
export type BulkMarksInput = z.infer<typeof bulkMarksSchema>
