import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { z } from "zod"

interface Params {
  params: Promise<{ id: string }>
}

const updateSchoolSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  plan: z.enum(["basic", "pro", "enterprise"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchoolSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.school.findUnique({ where: { id: parseInt(id) } })
  if (!existing) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })

  const updated = await prisma.school.update({
    where: { id: parseInt(id) },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    },
  })

  return NextResponse.json({ success: true, data: updated, message: "School updated" })
}
