import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ school: string }>
  searchParams: Promise<{ status?: string; page?: string; classSectionId?: string }>
}

export default async function FeesPage({ params, searchParams }: Props) {
  const { school } = await params
  const { status = "PENDING", page = "1", classSectionId } = await searchParams

  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  const schoolId = session.user.schoolId
  const pageNum = parseInt(page)
  const pageSize = 20

  const where = {
    schoolId,
    status: status as "PENDING" | "PAID" | "PARTIAL" | "WAIVED",
    ...(classSectionId && { student: { classSectionId: parseInt(classSectionId) } }),
  }

  const [records, total, classes] = await Promise.all([
    prisma.feeRecord.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, studentUid: true, fatherName: true, classSection: true } },
        feeType: true,
      },
      orderBy: { dueDate: "asc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feeRecord.count({ where }),
    prisma.classSection.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ className: "asc" }, { section: "asc" }],
    }),
  ])

  // Aggregate totals for selected filters
  const agg = await prisma.feeRecord.aggregate({
    where,
    _sum: { amountDue: true, amountPaid: true, concessionAmt: true },
  })
  const totalDue = Number(agg._sum.amountDue ?? 0) - Number(agg._sum.concessionAmt ?? 0)
  const totalPaid = Number(agg._sum.amountPaid ?? 0)
  const totalBalance = totalDue - totalPaid

  const totalPages = Math.ceil(total / pageSize)

  const statusStyle: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    PARTIAL: "bg-blue-100 text-blue-800",
    WAIVED: "bg-gray-100 text-gray-700",
  }

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ status, page: "1", ...(classSectionId && { classSectionId }), ...overrides })
    return `/${school}/fees?${p.toString()}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
          <p className="text-gray-500 mt-1">{total} records</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${school}/fees/types`} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Fee Types
          </Link>
          <Link href={`/${school}/fees/structure`} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Fee Structure
          </Link>
          <Link href={`/${school}/fees/collect`} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            Collect Fee
          </Link>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1">
          {["PENDING", "PARTIAL", "PAID", "WAIVED"].map((s) => (
            <Link
              key={s}
              href={buildUrl({ status: s })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                status === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* Class filter */}
        <div className="flex gap-1 items-center ml-auto">
          <Link
            href={buildUrl({ classSectionId: undefined })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              !classSectionId ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            All Classes
          </Link>
          {classes.map((c) => (
            <Link
              key={c.id}
              href={buildUrl({ classSectionId: String(c.id) })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                classSectionId === String(c.id)
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {c.className}-{c.section}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Due", value: totalDue, color: "text-gray-900" },
            { label: "Total Collected", value: totalPaid, color: "text-green-700" },
            { label: "Outstanding Balance", value: totalBalance, color: totalBalance > 0 ? "text-red-600 font-bold" : "text-green-700" },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-lg font-semibold ${item.color}`}>₹{item.value.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600">Student</th>
              <th className="px-4 py-3 font-medium text-gray-600">Class</th>
              <th className="px-4 py-3 font-medium text-gray-600">Fee Type</th>
              <th className="px-4 py-3 font-medium text-gray-600">Due</th>
              <th className="px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No {status.toLowerCase()} fee records{classSectionId ? " for this class" : ""}
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const balance = Number(r.amountDue) - Number(r.amountPaid) - Number(r.concessionAmt)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/${school}/students/${r.student.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                        {r.student.fullName}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono">{r.student.studentUid}</p>
                      <p className="text-xs text-gray-400">s/o {r.student.fatherName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.student.classSection
                        ? `${r.student.classSection.className}-${r.student.classSection.section}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.feeType.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-900">
                      ₹{Number(r.amountDue).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-green-700">
                      ₹{Number(r.amountPaid).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-red-600">
                      {balance > 0 ? `₹${balance.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {pageNum} of {totalPages} ({total} records)</p>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link href={buildUrl({ page: String(pageNum - 1) })} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Previous
                </Link>
              )}
              {pageNum < totalPages && (
                <Link href={buildUrl({ page: String(pageNum + 1) })} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
