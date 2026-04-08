"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface Student {
  id: number
  fullName: string
  studentUid: string
  fatherName: string
  motherName: string | null
  phone: string
  parentPhone: string | null
  email: string | null
  gender: string
  dob: string | null
  classSection: { id: number; className: string; section: string } | null
  classSectionId: number | null
  rollNumber: number | null
  userId: number | null
  isActive: boolean
  bloodGroup: string | null
  address: string | null
  admissionDate: string | null
}

interface ClassSection { id: number; className: string; section: string }

export default function StudentDetailPage() {
  const params = useParams<{ school: string; id: string }>()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [tab, setTab] = useState<"profile" | "marks" | "attendance" | "fees">("profile")
  const [loginResult, setLoginResult] = useState<{ username: string; initialPassword: string } | null>(null)
  const [creatingLogin, setCreatingLogin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [editForm, setEditForm] = useState<Partial<Student & { dob: string; admissionDate: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  useEffect(() => {
    fetch(`/api/${params.school}/students/${params.id}`)
      .then((r) => r.json())
      .then((d) => setStudent(d.data))
    fetch(`/api/${params.school}/classes`)
      .then(r => r.json())
      .then(d => setClasses(d.data ?? []))
  }, [params.school, params.id])

  async function createLogin() {
    setCreatingLogin(true)
    const res = await fetch(`/api/${params.school}/students/${params.id}/create-login`, { method: "POST" })
    const data = await res.json()
    setCreatingLogin(false)
    if (data.success) {
      setLoginResult(data.data)
      setStudent((s) => s ? { ...s, userId: 1 } : s)
    } else {
      alert(data.message)
    }
  }

  function startEdit() {
    if (!student) return
    setEditForm({
      fullName: student.fullName,
      fatherName: student.fatherName,
      motherName: student.motherName ?? "",
      phone: student.phone,
      parentPhone: student.parentPhone ?? "",
      email: student.email ?? "",
      gender: student.gender,
      dob: student.dob ? student.dob.split("T")[0] : "",
      bloodGroup: student.bloodGroup ?? "",
      address: student.address ?? "",
      admissionDate: student.admissionDate ? student.admissionDate.split("T")[0] : "",
      classSectionId: student.classSectionId ?? undefined,
      rollNumber: student.rollNumber ?? undefined,
    })
    setEditing(true)
    setSaveMsg("")
  }

  async function saveEdit() {
    setSaving(true)
    setSaveMsg("")
    const res = await fetch(`/api/${params.school}/students/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        classSectionId: editForm.classSectionId ? Number(editForm.classSectionId) : null,
        rollNumber: editForm.rollNumber ? Number(editForm.rollNumber) : null,
        motherName: editForm.motherName || null,
        parentPhone: editForm.parentPhone || null,
        email: editForm.email || null,
        bloodGroup: editForm.bloodGroup || null,
        address: editForm.address || null,
        dob: editForm.dob || null,
        admissionDate: editForm.admissionDate || null,
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) {
      setStudent(prev => prev ? { ...prev, ...d.data, classSection: classes.find(c => c.id === d.data.classSectionId) ?? prev.classSection } : prev)
      setEditing(false)
      setSaveMsg("Changes saved.")
    } else {
      setSaveMsg(d.message)
    }
  }

  if (!student) return <div className="p-6 text-gray-400">Loading...</div>

  const tabs = ["profile", "marks", "attendance", "fees"] as const

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{student.fullName}</h1>
          <p className="text-gray-500 mt-0.5">
            {student.studentUid}
            {student.classSection && ` · ${student.classSection.className} — ${student.classSection.section}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!student.userId && (
            <button
              onClick={createLogin}
              disabled={creatingLogin}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {creatingLogin ? "Creating..." : "Create Student Login"}
            </button>
          )}
        </div>
      </div>

      {loginResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-green-900 mb-1">Login created — share with student:</p>
          <p className="text-sm text-green-800">Username: <code className="font-mono bg-green-100 px-1 rounded">{loginResult.username}</code></p>
          <p className="text-sm text-green-800">Password: <code className="font-mono bg-green-100 px-1 rounded">{loginResult.initialPassword}</code></p>
          <p className="text-xs text-green-600 mt-1">This password is shown only once.</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition -mb-px ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-xl">
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
            <dl className="space-y-3">
              {[
                { label: "Full Name", value: student.fullName },
                { label: "Father's Name", value: student.fatherName },
                { label: "Mother's Name", value: student.motherName ?? "—" },
                { label: "Gender", value: student.gender },
                { label: "Date of Birth", value: student.dob ? new Date(student.dob).toLocaleDateString("en-IN") : "—" },
                { label: "Blood Group", value: student.bloodGroup ?? "—" },
                { label: "Phone", value: student.phone },
                { label: "Parent Phone", value: student.parentPhone ?? "—" },
                { label: "Email", value: student.email ?? "—" },
                { label: "Address", value: student.address ?? "—" },
                { label: "Class", value: student.classSection ? `${student.classSection.className} — ${student.classSection.section}` : "—" },
                { label: "Roll No.", value: student.rollNumber ?? "—" },
                { label: "Admission Date", value: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString("en-IN") : "—" },
                { label: "Student Login", value: student.userId ? "Active" : "Not created" },
              ].map((item) => (
                <div key={item.label} className="flex gap-4">
                  <dt className="text-sm text-gray-500 w-36 shrink-0">{item.label}</dt>
                  <dd className="text-sm font-medium text-gray-900">{String(item.value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Full Name", key: "fullName", required: true },
                { label: "Father's Name", key: "fatherName", required: true },
                { label: "Mother's Name", key: "motherName" },
                { label: "Phone", key: "phone", required: true },
                { label: "Parent Phone", key: "parentPhone" },
                { label: "Email", key: "email", type: "email" },
                { label: "Blood Group", key: "bloodGroup", placeholder: "e.g. O+" },
                { label: "Address", key: "address" },
              ].map(({ label, key, required, type, placeholder }) => (
                <div key={key} className="flex gap-3 items-center">
                  <label className="text-sm text-gray-500 w-36 shrink-0">{label}{required && <span className="text-red-500">*</span>}</label>
                  <input
                    type={type ?? "text"}
                    value={(editForm as Record<string, unknown>)[key] as string ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={required}
                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-36 shrink-0">Gender</label>
                <select value={editForm.gender ?? "MALE"} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-36 shrink-0">Date of Birth</label>
                <input type="date" value={editForm.dob ?? ""} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-36 shrink-0">Class</label>
                <select value={editForm.classSectionId ?? ""} onChange={e => setEditForm(f => ({ ...f, classSectionId: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">No class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.className} — {c.section}</option>)}
                </select>
              </div>
              <div className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-36 shrink-0">Roll No.</label>
                <input type="number" value={editForm.rollNumber ?? ""} onChange={e => setEditForm(f => ({ ...f, rollNumber: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-3 items-center">
                <label className="text-sm text-gray-500 w-36 shrink-0">Admission Date</label>
                <input type="date" value={editForm.admissionDate ?? ""} onChange={e => setEditForm(f => ({ ...f, admissionDate: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "marks" && <MarksTab school={params.school} studentId={params.id} />}
      {tab === "attendance" && <AttendanceTab school={params.school} studentId={params.id} />}
      {tab === "fees" && <FeesTab school={params.school} studentId={params.id} />}
    </div>
  )
}

function MarksTab({ school, studentId }: { school: string; studentId: string }) {
  const [marks, setMarks] = useState<{ id: number; marksObtained: number; grade: string | null; exam: { examType: { name: string; maxMarks: number }; subject: { name: string } | null; examDate: string | null } }[]>([])

  useEffect(() => {
    fetch(`/api/${school}/marks/student/${studentId}`).then((r) => r.json()).then((d) => setMarks(d.data ?? []))
  }, [school, studentId])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
          <th className="px-4 py-3 font-medium text-gray-600">Subject</th>
          <th className="px-4 py-3 font-medium text-gray-600">Exam</th>
          <th className="px-4 py-3 font-medium text-gray-600">Marks</th>
          <th className="px-4 py-3 font-medium text-gray-600">Grade</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {marks.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No marks recorded</td></tr>
          ) : marks.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3">{m.exam.subject?.name ?? "—"}</td>
              <td className="px-4 py-3 text-gray-600">{m.exam.examType.name}</td>
              <td className="px-4 py-3 font-mono">{Number(m.marksObtained)} / {m.exam.examType.maxMarks}</td>
              <td className="px-4 py-3 font-bold text-indigo-700">{m.grade ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AttendanceTab({ school, studentId }: { school: string; studentId: string }) {
  const [records, setRecords] = useState<{ id: number; date: string; status: string }[]>([])

  useEffect(() => {
    fetch(`/api/${school}/attendance?studentId=${studentId}`).then((r) => r.json()).then((d) => setRecords(d.data ?? []))
  }, [school, studentId])

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    ABSENT: "bg-red-100 text-red-800",
    LATE: "bg-yellow-100 text-yellow-800",
    HALF_DAY: "bg-orange-100 text-orange-800",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
          <th className="px-4 py-3 font-medium text-gray-600">Date</th>
          <th className="px-4 py-3 font-medium text-gray-600">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {records.length === 0 ? (
            <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No attendance records</td></tr>
          ) : records.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">{new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status] ?? "bg-gray-100 text-gray-700"}`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FeesTab({ school, studentId }: { school: string; studentId: string }) {
  const [fees, setFees] = useState<{ id: number; amountDue: number; amountPaid: number; status: string; feeType: { name: string }; dueDate: string | null }[]>([])

  useEffect(() => {
    fetch(`/api/${school}/fees/records?studentId=${studentId}`).then((r) => r.json()).then((d) => setFees(d.data ?? []))
  }, [school, studentId])

  const statusStyle: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    PARTIAL: "bg-blue-100 text-blue-800",
    WAIVED: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b border-gray-200 text-left">
          <th className="px-4 py-3 font-medium text-gray-600">Fee Type</th>
          <th className="px-4 py-3 font-medium text-gray-600">Amount Due</th>
          <th className="px-4 py-3 font-medium text-gray-600">Paid</th>
          <th className="px-4 py-3 font-medium text-gray-600">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {fees.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No fee records</td></tr>
          ) : fees.map((f) => (
            <tr key={f.id}>
              <td className="px-4 py-3">{f.feeType.name}</td>
              <td className="px-4 py-3 font-mono">₹{Number(f.amountDue).toLocaleString("en-IN")}</td>
              <td className="px-4 py-3 font-mono">₹{Number(f.amountPaid).toLocaleString("en-IN")}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle[f.status] ?? "bg-gray-100"}`}>{f.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
