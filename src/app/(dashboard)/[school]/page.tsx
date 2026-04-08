import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"

interface Props {
  params: Promise<{ school: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { school } = await params
  const session = await auth()

  if (!session || session.user.schoolSlug !== school) {
    redirect("/login")
  }

  const schoolId = session.user.schoolId
  const role = session.user.role as Role

  // ── STUDENT DASHBOARD ──────────────────────────────────────────
  if (role === Role.STUDENT) {
    const student = await prisma.student.findFirst({
      where: { userId: parseInt(session.user.id), schoolId },
      include: { classSection: true },
    })

    if (!student) redirect("/login")

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [presentCount, absentCount, recentMarks, pendingFees] = await Promise.all([
      prisma.attendance.count({ where: { studentId: student.id, status: "PRESENT", date: { gte: monthStart } } }),
      prisma.attendance.count({ where: { studentId: student.id, status: "ABSENT", date: { gte: monthStart } } }),
      prisma.markEntry.findMany({
        where: { studentId: student.id },
        include: { exam: { include: { examType: true, subject: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.feeRecord.count({ where: { studentId: student.id, status: "PENDING" } }),
    ])

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {student.fullName} — {student.classSection ? `${student.classSection.className} - ${student.classSection.section}` : "No class assigned"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-3xl font-bold text-green-700">{presentCount}</p>
            <p className="text-sm text-gray-500 mt-1">Present This Month</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-3xl font-bold text-red-600">{absentCount}</p>
            <p className="text-sm text-gray-500 mt-1">Absent This Month</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-3xl font-bold text-orange-600">{pendingFees}</p>
            <p className="text-sm text-gray-500 mt-1">Pending Fee Records</p>
          </div>
        </div>

        {recentMarks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Marks</h2>
            <div className="space-y-2">
              {recentMarks.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.exam.subject?.name ?? "General"}</p>
                    <p className="text-xs text-gray-500">{m.exam.examType.name}</p>
                  </div>
                  <span className="font-bold text-indigo-700">{Number(m.marksObtained)} — {m.grade}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── TEACHER DASHBOARD ──────────────────────────────────────────
  if (role === Role.TEACHER) {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: parseInt(session.user.id), schoolId },
      include: { classSection: true, subject: true },
      orderBy: { classSection: { className: "asc" } },
    })

    const classIds = [...new Set(assignments.map((a) => a.classSectionId))]
    const isClassTeacher = assignments.some((a) => a.isClassTeacher)

    const [studentCount, todayPresent, todayAbsent] = await Promise.all([
      classIds.length > 0
        ? prisma.student.count({ where: { schoolId, classSectionId: { in: classIds }, isActive: true } })
        : Promise.resolve(0),
      classIds.length > 0
        ? prisma.attendance.count({
            where: { schoolId, date: new Date(new Date().toDateString()), status: "PRESENT", student: { classSectionId: { in: classIds } } },
          })
        : Promise.resolve(0),
      classIds.length > 0
        ? prisma.attendance.count({
            where: { schoolId, date: new Date(new Date().toDateString()), status: "ABSENT", student: { classSectionId: { in: classIds } } },
          })
        : Promise.resolve(0),
    ])

    const mySubjects = [...new Set(assignments.filter((a) => a.subject).map((a) => a.subject!.name))]
    const myClasses = [...new Map(assignments.map((a) => [a.classSectionId, a.classSection])).values()]

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome, {session.user.name} — {isClassTeacher ? "Class Teacher" : "Subject Teacher"}
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-sm">
            No class assigned yet. Please ask your admin to assign you a class.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-3xl font-bold text-gray-900">{studentCount}</p>
                <p className="text-sm text-gray-500 mt-1">My Students</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-3xl font-bold text-green-700">{todayPresent}</p>
                <p className="text-sm text-gray-500 mt-1">Present Today</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-3xl font-bold text-red-600">{todayAbsent}</p>
                <p className="text-sm text-gray-500 mt-1">Absent Today</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-3">My Classes</h2>
                <div className="space-y-2">
                  {myClasses.map((cls) => {
                    const clsAssignments = assignments.filter((a) => a.classSectionId === cls.id)
                    const classTeacher = clsAssignments.some((a) => a.isClassTeacher)
                    return (
                      <div key={cls.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-900">{cls.className} — {cls.section}</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${classTeacher ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {classTeacher ? "Class Teacher" : "Subject Teacher"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {mySubjects.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-3">My Subjects</h2>
                  <div className="flex flex-wrap gap-2">
                    {mySubjects.map((s) => (
                      <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Mark Attendance", href: `/${school}/attendance`, emoji: "✅" },
                  { label: "Enter Marks", href: `/${school}/marks`, emoji: "📝" },
                ].map((action) => (
                  <a key={action.label} href={action.href}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                    <span>{action.emoji}</span>{action.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── ADMIN DASHBOARD ──────────────────────────────────────────
  const [studentCount, staffCount, todayAttendance, pendingFees] = await Promise.all([
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.user.count({ where: { schoolId, isActive: true, role: { not: Role.STUDENT } } }),
    prisma.attendance.count({
      where: { schoolId, date: new Date(new Date().toDateString()), status: "PRESENT" },
    }),
    prisma.feeRecord.count({ where: { schoolId, status: "PENDING" } }),
  ])

  const stats = [
    { label: "Total Students", value: studentCount, emoji: "👨‍🎓" },
    { label: "Total Staff", value: staffCount, emoji: "👩‍🏫" },
    { label: "Present Today", value: todayAttendance, emoji: "✅" },
    { label: "Pending Fees", value: pendingFees, emoji: "💰" },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <span className="text-2xl">{stat.emoji}</span>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Mark Attendance", href: `/${school}/attendance`, emoji: "✅" },
              { label: "Add Student", href: `/${school}/students/new`, emoji: "➕" },
              { label: "Collect Fee", href: `/${school}/fees/collect`, emoji: "💵" },
              { label: "Enter Marks", href: `/${school}/marks`, emoji: "📝" },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                <span>{action.emoji}</span>{action.label}
              </a>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-400 text-sm">No recent activity to show.</p>
        </div>
      </div>
    </div>
  )
}
