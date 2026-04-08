"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Staff {
  id: number
  fullName: string
  username: string
  role: string
  email: string | null
  phone: string | null
  employeeId: string | null
  subjectSpecialty: string | null
  isActive: boolean
  teacherAssignments: {
    id: number
    isClassTeacher: boolean
    classSection: { className: string; section: string }
    subject: { name: string } | null
  }[]
}

export default function StaffDetailPage() {
  const params = useParams<{ school: string; id: string }>()
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "", employeeId: "", subjectSpecialty: "", newPassword: "" })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  useEffect(() => {
    fetch(`/api/${params.school}/staff/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setStaff(d.data)
        else router.push(`/${params.school}/staff`)
      })
  }, [params.school, params.id])

  function startEdit() {
    if (!staff) return
    setEditForm({
      fullName: staff.fullName,
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      employeeId: staff.employeeId ?? "",
      subjectSpecialty: staff.subjectSpecialty ?? "",
      newPassword: "",
    })
    setEditing(true)
    setSaveMsg("")
  }

  async function saveEdit() {
    setSaving(true)
    setSaveMsg("")
    const res = await fetch(`/api/${params.school}/staff/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      setStaff(prev => prev ? { ...prev, ...d.data } : prev)
      setEditing(false)
      setSaveMsg("Changes saved.")
    } else {
      setSaveMsg(d.message)
    }
  }

  if (!staff) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{staff.fullName}</h1>
          <p className="text-gray-500 mt-1">{staff.role} · {staff.username}</p>
        </div>
        {staff.role === "TEACHER" && (
          <Link
            href={`/${params.school}/staff/${params.id}/assign`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Manage Assignments
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Profile</h2>
          {!editing ? (
            <button onClick={startEdit} className="text-sm text-indigo-600 hover:underline font-medium">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setSaveMsg("") }} className="text-sm border border-gray-300 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          )}
        </div>

        {saveMsg && <p className="text-sm text-green-700 mb-3">{saveMsg}</p>}

        {!editing ? (
          <dl className="space-y-2">
            {[
              { label: "Employee ID", value: staff.employeeId ?? "—" },
              { label: "Subject Specialty", value: staff.subjectSpecialty ?? "—" },
              { label: "Email", value: staff.email ?? "—" },
              { label: "Phone", value: staff.phone ?? "—" },
              { label: "Status", value: staff.isActive ? "Active" : "Inactive" },
            ].map((item) => (
              <div key={item.label} className="flex gap-4">
                <dt className="text-sm text-gray-500 w-40 shrink-0">{item.label}</dt>
                <dd className="text-sm font-medium text-gray-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="space-y-3">
            {[
              { label: "Full Name", key: "fullName", required: true },
              { label: "Employee ID", key: "employeeId" },
              { label: "Subject Specialty", key: "subjectSpecialty", placeholder: "e.g. Mathematics" },
              { label: "Email", key: "email", type: "email" },
              { label: "Phone", key: "phone" },
            ].map(({ label, key, required, type, placeholder }) => (
              <div key={key} className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-40 shrink-0">{label}{required && <span className="text-red-500">*</span>}</label>
                <input
                  type={type ?? "text"}
                  value={(editForm as Record<string, string>)[key] ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={required}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-500 w-40 shrink-0">New Password</label>
              <input
                type="text"
                value={editForm.newPassword}
                onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Leave blank to keep current"
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {staff.role === "TEACHER" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Class & Subject Assignments</h2>
          {staff.teacherAssignments.length === 0 ? (
            <p className="text-gray-400 text-sm">No assignments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-2 font-medium text-gray-600">Class</th>
                  <th className="pb-2 font-medium text-gray-600">Subject</th>
                  <th className="pb-2 font-medium text-gray-600">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.teacherAssignments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2">{a.classSection.className} — {a.classSection.section}</td>
                    <td className="py-2">{a.subject?.name ?? "All Subjects"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.isClassTeacher ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {a.isClassTeacher ? "Class Teacher" : "Subject Teacher"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
