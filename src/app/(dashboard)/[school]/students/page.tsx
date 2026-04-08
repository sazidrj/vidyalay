import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ school: string }>
  searchParams: Promise<{ search?: string; page?: string; classSectionId?: string }>
}

export default async function StudentsPage({ params, searchParams }: Props) {
  const { school } = await params
  const { search = "", page = "1", classSectionId } = await searchParams

  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  const schoolId = session.user.schoolId
  const pageNum = parseInt(page)
  const pageSize = 20

  const where = {
    schoolId,
    isActive: true,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { studentUid: { contains: search, mode: "insensitive" as const } },
        { fatherName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(classSectionId && { classSectionId: parseInt(classSectionId) }),
  }

  const [students, total, classes] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { classSection: true },
      orderBy: { fullName: "asc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
    prisma.classSection.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ className: "asc" }, { section: "asc" }],
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">{total} total students</p>
        </div>
        <Link
          href={`/${school}/students/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Admit Student
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <form className="flex gap-2 flex-1">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by name, ID, or father's name..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[200px]"
            />
            <select
              name="classSectionId"
              defaultValue={classSectionId}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.section}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-600">Student ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Class</th>
                <th className="px-4 py-3 font-medium text-gray-600">Father&apos;s Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{student.studentUid}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{student.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.classSection
                        ? `${student.classSection.className} - ${student.classSection.section}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.fatherName}</td>
                    <td className="px-4 py-3 text-gray-600">{student.phone}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${school}/students/${student.id}`}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pageNum} of {totalPages}
            </p>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/${school}/students?page=${pageNum - 1}&search=${search}`}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={`/${school}/students?page=${pageNum + 1}&search=${search}`}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
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
