import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { z } from "zod"
import { Role } from "@prisma/client"

const calendarEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  eventType: z.enum(["HOLIDAY", "EXAM", "SPORTS", "MEETING", "OTHER"]).default("OTHER"),
  isPublic: z.boolean().default(true),
  color: z.string().optional(),
})

interface Params {
  params: Promise<{ schoolSlug: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const events = await prisma.calendarEvent.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(from && to && {
        startDate: { gte: new Date(from) },
        endDate: { lte: new Date(to) },
      }),
    },
    orderBy: { startDate: "asc" },
  })

  return NextResponse.json({ success: true, data: events, message: "OK" })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const { schoolSlug } = await params
  if (session.user.schoolSlug !== schoolSlug) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = calendarEventSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Validation error", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const event = await prisma.calendarEvent.create({
    data: {
      ...parsed.data,
      schoolId: session.user.schoolId,
      createdById: parseInt(session.user.id),
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    },
  })

  return NextResponse.json({ success: true, data: event, message: "Event created" }, { status: 201 })
}
