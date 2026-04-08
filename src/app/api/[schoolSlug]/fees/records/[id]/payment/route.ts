import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { paymentSchema } from "@/lib/validations/fee"
import { hasPermission } from "@/lib/permissions"
import { generateReceiptNumber } from "@/lib/utils/uid"
import { Role } from "@prisma/client"

interface Params {
  params: Promise<{ schoolSlug: string; id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug, id } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const feeRecord = await prisma.feeRecord.findFirst({
    where: { id: parseInt(id), schoolId: session.user.schoolId },
  })

  if (!feeRecord) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const totalPaid = Number(feeRecord.amountPaid) + parsed.data.amountPaid
  const effectiveDue = Number(feeRecord.amountDue) - Number(feeRecord.concessionAmt)
  let status: "PAID" | "PARTIAL" | "PENDING" = "PARTIAL"
  if (totalPaid >= effectiveDue) status = "PAID"
  else if (totalPaid === 0) status = "PENDING"

  const txCount = await prisma.paymentTransaction.count({ where: { schoolId: session.user.schoolId } })
  const receiptNumber = generateReceiptNumber(schoolSlug, txCount + 1)
  const paidDate = parsed.data.paidDate ? new Date(parsed.data.paidDate) : new Date()
  const collectedById = parseInt(session.user.id)

  const [updated] = await prisma.$transaction([
    prisma.feeRecord.update({
      where: { id: parseInt(id) },
      data: {
        amountPaid: totalPaid,
        status,
        paidDate,
        paymentMode: parsed.data.paymentMode,
        remarks: parsed.data.remarks,
        receiptNumber: feeRecord.receiptNumber ?? receiptNumber,
        collectedById,
      },
    }),
    prisma.paymentTransaction.create({
      data: {
        schoolId: session.user.schoolId,
        feeRecordId: parseInt(id),
        amount: parsed.data.amountPaid,
        paymentMode: parsed.data.paymentMode,
        paidDate,
        receiptNumber,
        collectedById,
        remarks: parsed.data.remarks,
      },
    }),
  ])

  return NextResponse.json({ success: true, data: updated, message: `Payment of ₹${parsed.data.amountPaid} recorded. Status: ${status}` })
}
