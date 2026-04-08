import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function ReportsPage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    redirect(`/${school}`)
  }

  const schoolId = session.user.schoolId

  const [
    totalStudents,
    totalFeesDue,
    totalFeesCollected,
    pendingFees,
    issuedTCs,
    todayPresent,
    todayAbsent,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.feeRecord.aggregate({
      where: { schoolId },
      _sum: { amountDue: true },
    }),
    prisma.feeRecord.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    }),
    prisma.feeRecord.count({ where: { schoolId, status: "PENDING" } }),
    prisma.transferCertificate.count({ where: { schoolId } }),
    prisma.attendance.count({
      where: { schoolId, date: new Date(new Date().toDateString()), status: "PRESENT" },
    }),
    prisma.attendance.count({
      where: { schoolId, date: new Date(new Date().toDateString()), status: "ABSENT" },
    }),
  ])

  const totalDue = Number(totalFeesDue._sum.amountDue ?? 0)
  const totalCollected = Number(totalFeesCollected._sum.amountPaid ?? 0)
  const collectionPct = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">School performance at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Students", value: totalStudents, sub: "Active enrolments", color: "border-blue-200 bg-blue-50" },
          { label: "Today Present", value: todayPresent, sub: `${todayAbsent} absent today`, color: "border-green-200 bg-green-50" },
          { label: "Pending Fees", value: pendingFees, sub: "Records unpaid", color: "border-yellow-200 bg-yellow-50" },
          {
            label: "Fee Collection",
            value: `₹${totalCollected.toLocaleString("en-IN")}`,
            sub: `${collectionPct}% of ₹${totalDue.toLocaleString("en-IN")}`,
            color: "border-purple-200 bg-purple-50",
          },
          { label: "TCs Issued", value: issuedTCs, sub: "Transfer certificates", color: "border-red-200 bg-red-50" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-5 ${stat.color}`}>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">{stat.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
