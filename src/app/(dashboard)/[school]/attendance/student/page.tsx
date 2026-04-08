import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function StudentAttendancePage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  if (session.user.role !== Role.STUDENT) redirect(`/${school}/attendance`)

  const student = await prisma.student.findFirst({
    where: { userId: parseInt(session.user.id), schoolId: session.user.schoolId },
    include: { classSection: true },
  })

  if (!student) redirect("/login")

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const records = await prisma.attendance.findMany({
    where: { studentId: student.id, date: { gte: monthStart } },
    orderBy: { date: "desc" },
  })

  const counts = records.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    ABSENT: "bg-red-100 text-red-800",
    LATE: "bg-yellow-100 text-yellow-800",
    HALF_DAY: "bg-orange-100 text-orange-800",
    HOLIDAY: "bg-gray-100 text-gray-700",
  }

  const monthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 mt-1">{monthName}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Present", count: counts.PRESENT ?? 0, cls: "bg-green-50 border-green-200 text-green-800" },
          { label: "Absent", count: counts.ABSENT ?? 0, cls: "bg-red-50 border-red-200 text-red-800" },
          { label: "Late", count: counts.LATE ?? 0, cls: "bg-yellow-50 border-yellow-200 text-yellow-800" },
          { label: "Half Day", count: counts.HALF_DAY ?? 0, cls: "bg-orange-50 border-orange-200 text-orange-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.cls}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Day</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No attendance records this month</td></tr>
            ) : records.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.date).toLocaleDateString("en-IN", { weekday: "short" })}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status] ?? "bg-gray-100 text-gray-700"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
