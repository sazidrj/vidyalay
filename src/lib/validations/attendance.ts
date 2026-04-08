import { z } from "zod"

export const bulkAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  classSectionId: z.number().int().positive(),
  records: z.array(
    z.object({
      studentId: z.number().int().positive(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "HOLIDAY"]),
      remarks: z.string().optional(),
    })
  ),
})

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>
