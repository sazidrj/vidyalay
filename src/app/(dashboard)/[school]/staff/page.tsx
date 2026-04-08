import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/permissions"
import Link from "next/link"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function StaffPage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  if (!hasPermission(session.user.role as Role, Role.ADMIN)) {
    redirect(`/${school}`)
  }

  const staff = await prisma.user.findMany({
    where: { schoolId: session.user.schoolId, isActive: true, role: { not: Role.STUDENT } },
    include: {
      teacherAssignments: {
        include: { classSection: true, subject: true },
      },
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  })

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800",
    TEACHER: "bg-blue-100 text-blue-800",
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-1">{staff.length} active staff members</p>
        </div>
        <Link
          href={`/${school}/staff/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + New Staff
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 font-medium text-gray-600">Assigned Classes</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((member) => {
              const classTeacherOf = member.teacherAssignments.find((a) => a.isClassTeacher)
              const subjects = [...new Set(member.teacherAssignments.filter((a) => !a.isClassTeacher).map((a) => a.subject?.name).filter(Boolean))]
              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{member.fullName}</p>
                    <p className="text-xs text-gray-500 font-mono">{member.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[member.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {member.role === Role.TEACHER ? (
                      <div className="space-y-0.5">
                        {classTeacherOf && (
                          <p className="text-xs">
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium mr-1">CT</span>
                            {classTeacherOf.classSection.className} — {classTeacherOf.classSection.section}
                          </p>
                        )}
                        {subjects.length > 0 && (
                          <p className="text-xs text-gray-500">{subjects.join(", ")}</p>
                        )}
                        {member.teacherAssignments.length === 0 && (
                          <span className="text-xs text-amber-600">No assignment</span>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/${school}/staff/${member.id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                        View
                      </Link>
                      {member.role === Role.TEACHER && (
                        <Link href={`/${school}/staff/${member.id}/assign`} className="text-green-600 hover:underline text-xs font-medium">
                          Assign Class
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
