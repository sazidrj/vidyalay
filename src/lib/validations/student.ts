import { z } from "zod"

export const studentSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  classSectionId: z.number().int().positive().optional().nullable(),
  rollNumber: z.number().int().positive().optional().nullable(),
  phone: z.string().min(10, "Valid phone number required"),
  parentPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
  bloodGroup: z.string().optional(),
  prevSchool: z.string().optional(),
})

export type StudentInput = z.infer<typeof studentSchema>
