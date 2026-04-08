"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

interface ClassSection {
  id: number
  className: string
  section: string
}

interface Student {
  id: number
  fullName: string
  studentUid: string
  rollNumber: number | null
}

interface AttendanceRecord {
  student: Student
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY"
}

export default function AttendancePage() {
  const params = useParams<{ school: string }>()
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch(`/api/${params.school}/classes`)
      .then((r) => r.json())
      .then((d) => setClasses(d.data ?? []))
  }, [params.school])

  async function loadStudents(classSectionId: number) {
    setLoading(true)
    const r = await fetch(`/api/${params.school}/students?classSectionId=${classSectionId}&pageSize=100`)
    const data = await r.json()
    const students: Student[] = data.data ?? []

    // Load existing attendance
    const att = await fetch(`/api/${params.school}/attendance?date=${date}&classSectionId=${classSectionId}`)
    const attData = await att.json()
    const existing = new Map((attData.data ?? []).map((a: { studentId: number; status: string }) => [a.studentId, a.status]))

    setRecords(
      students.map((s) => ({
        student: s,
        status: (existing.get(s.id) as AttendanceRecord["status"]) ?? "PRESENT",
      }))
    )
    setLoading(false)
  }

  function toggleStatus(studentId: number) {
    const cycle: AttendanceRecord["status"][] = ["PRESENT", "ABSENT", "LATE", "HALF_DAY"]
    setRecords((prev) =>
      prev.map((r) =>
        r.student.id === studentId
          ? { ...r, status: cycle[(cycle.indexOf(r.status) + 1) % cycle.length] }
          : r
      )
    )
  }

  function setAll(status: AttendanceRecord["status"]) {
    setRecords((prev) => prev.map((r) => ({ ...r, status })))
  }

  async function saveAttendance() {
    if (!selectedClass) return
    setSaving(true)
    setMessage("")

    const res = await fetch(`/api/${params.school}/attendance/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        classSectionId: selectedClass,
        records: records.map((r) => ({ studentId: r.student.id, status: r.status })),
      }),
    })

    const data = await res.json()
    setMessage(data.message)
    setSaving(false)
  }

  const statusColors = {
    PRESENT: "bg-green-100 text-green-800 border-green-300",
    ABSENT: "bg-red-100 text-red-800 border-red-300",
    LATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    HALF_DAY: "bg-orange-100 text-orange-800 border-orange-300",
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">Mark daily attendance for your class</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass ?? ""}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setSelectedClass(val)
                loadStudents(val)
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} - {c.section}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {records.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-700">Mark all:</span>
            {(["PRESENT", "ABSENT"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setAll(s)}
                className={`px-3 py-1 rounded text-xs font-medium border ${statusColors[s]}`}
              >
                {s}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">
              {records.filter((r) => r.status === "PRESENT").length} / {records.length} present
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-600">Roll No.</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Student Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{r.student.rollNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.student.fullName}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(r.student.id)}
                        className={`px-3 py-1 rounded border text-xs font-medium ${statusColors[r.status]}`}
                      >
                        {r.status.replace("_", " ")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
            {message && <p className="text-sm text-green-700 font-medium">{message}</p>}
          </div>
        </>
      )}

      {loading && <p className="text-gray-400 mt-8">Loading students...</p>}
      {!loading && selectedClass && records.length === 0 && (
        <p className="text-gray-400 mt-8">No students in this class.</p>
      )}
    </div>
  )
}
