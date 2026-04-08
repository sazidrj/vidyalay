"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

interface ClassSection {
  id: number
  className: string
  section: string
}

export default function NewStudentPage() {
  const params = useParams<{ school: string }>()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassSection[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    fullName: "",
    fatherName: "",
    motherName: "",
    phone: "",
    parentPhone: "",
    email: "",
    gender: "MALE",
    dob: "",
    admissionDate: new Date().toISOString().split("T")[0],
    classSectionId: "",
    rollNumber: "",
    address: "",
    bloodGroup: "",
    prevSchool: "",
  })

  useEffect(() => {
    fetch(`/api/${params.school}/classes`)
      .then((r) => r.json())
      .then((d) => setClasses(d.data ?? []))
  }, [params.school])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const res = await fetch(`/api/${params.school}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        classSectionId: form.classSectionId ? parseInt(form.classSectionId) : null,
        rollNumber: form.rollNumber ? parseInt(form.rollNumber) : null,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.success) {
      router.push(`/${params.school}/students`)
    } else {
      setError(data.message ?? "Something went wrong")
    }
  }

  const field = (
    label: string,
    name: keyof typeof form,
    type: string = "text",
    required = false,
    placeholder = ""
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admit New Student</h1>
        <p className="text-gray-500 mt-1">Fill in the student details below</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Full Name", "fullName", "text", true, "Student's full name")}
            {field("Father's Name", "fatherName", "text", true, "Father's full name")}
            {field("Mother's Name", "motherName", "text", false, "Mother's full name")}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {field("Date of Birth", "dob", "date")}
            {field("Blood Group", "bloodGroup", "text", false, "e.g. B+")}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Student Phone", "phone", "tel", true, "Mobile number")}
            {field("Parent Phone", "parentPhone", "tel", false, "WhatsApp number")}
            {field("Email", "email", "email", false, "Optional")}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Academic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={form.classSectionId}
                onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            {field("Roll Number", "rollNumber", "number", false, "Optional")}
            {field("Admission Date", "admissionDate", "date")}
            {field("Previous School", "prevSchool", "text", false, "If transferring")}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Admit Student"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
