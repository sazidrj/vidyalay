import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/permissions"
import { Role } from "@prisma/client"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { ClassesManager } from "./ClassesManager"

interface Props {
  params: Promise<{ school: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { school } = await params
  const session = await auth()
  if (!session || session.user.schoolSlug !== school) redirect("/login")

  const isAdmin = hasPermission(session.user.role as Role, Role.ADMIN)

  const schoolData = isAdmin
    ? await prisma.school.findUnique({ where: { id: session.user.schoolId } })
    : null

  const stats = isAdmin && schoolData ? await Promise.all([
    prisma.classSection.count({ where: { schoolId: schoolData.id, isActive: true } }),
    prisma.subject.count({ where: { schoolId: schoolData.id, isActive: true } }),
    prisma.student.count({ where: { schoolId: schoolData.id, isActive: true } }),
    prisma.user.count({ where: { schoolId: schoolData.id, isActive: true } }),
  ]) : null

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Account and school configuration</p>
      </div>

      {/* Change Password — available to everyone */}
      <ChangePasswordForm />

      {/* Classes — admin only */}
      {isAdmin && <ClassesManager />}

      {/* School Profile — admin only */}
      {isAdmin && schoolData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">School Profile</h2>
          <dl className="space-y-3">
            {[
              { label: "School Name", value: schoolData.name },
              { label: "School ID", value: schoolData.slug },
              { label: "Email", value: schoolData.email ?? "—" },
              { label: "Phone", value: schoolData.phone ?? "—" },
              { label: "Address", value: schoolData.address ?? "—" },
              { label: "Current Session", value: schoolData.currentSession },
              { label: "Plan", value: schoolData.plan.toUpperCase() },
            ].map((item) => (
              <div key={item.label} className="flex gap-4">
                <dt className="text-sm text-gray-500 w-40 shrink-0">{item.label}</dt>
                <dd className="text-sm font-medium text-gray-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {isAdmin && stats && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Classes", value: stats[0] },
              { label: "Subjects", value: stats[1] },
              { label: "Students", value: stats[2] },
              { label: "Staff", value: stats[3] },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
