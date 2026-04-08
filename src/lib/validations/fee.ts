import { z } from "zod"

export const feeTypeSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  isMonthly: z.boolean().default(false),
  applicableClasses: z.array(z.string()).optional().nullable(),
})

export const feeRecordSchema = z.object({
  studentId: z.number().int().positive(),
  feeTypeId: z.number().int().positive(),
  amountDue: z.number().positive(),
  dueDate: z.string().optional(),
  remarks: z.string().optional(),
})

export const paymentSchema = z.object({
  amountPaid: z.number().positive("Amount must be positive"),
  paymentMode: z.enum(["cash", "upi", "cheque", "dd", "online"]),
  paidDate: z.string().optional(),
  remarks: z.string().optional(),
})

export type FeeTypeInput = z.infer<typeof feeTypeSchema>
export type FeeRecordInput = z.infer<typeof feeRecordSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
