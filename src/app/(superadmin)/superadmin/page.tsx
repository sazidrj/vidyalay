import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function SuperAdminDashboard() {
  const [schools, totalStudents, totalStaff] = await Promise.all([
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.student.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, role: { not: "STUDENT" } } }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-500 mt-1">All schools on Vidyalay</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{schools.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Schools</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
          <p className="text-sm text-gray-500 mt-1">Total Students</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{totalStaff}</p>
          <p className="text-sm text-gray-500 mt-1">Total Staff</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Schools</h2>
          <Link href="/superadmin/schools" className="text-sm text-indigo-600 hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">School</th>
              <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schools.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.slug}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{s.plan}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
