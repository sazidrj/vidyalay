"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

type LoginRole = "staff" | "student"

export default function LoginPage() {
  const router = useRouter()
  const [loginRole, setLoginRole] = useState<LoginRole>("staff")
  const [form, setForm] = useState({ username: "", password: "", schoolSlug: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      username: form.username,
      password: form.password,
      schoolSlug: form.schoolSlug || "superadmin",
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid credentials. Please check your details and try again.")
    } else {
      router.push(form.schoolSlug ? `/${form.schoolSlug}` : "/superadmin")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">V</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vidyalay</h1>
            <p className="text-gray-500 mt-1">School Management System</p>
          </div>

          {/* Role toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
            {(["staff", "student"] as LoginRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => { setLoginRole(role); setError(""); setForm({ username: "", password: "", schoolSlug: "" }) }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                  loginRole === role
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {role === "staff" ? "Staff / Admin" : "Student"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School ID
                {loginRole === "staff" && (
                  <span className="text-gray-400 font-normal ml-1">(leave blank for platform admin)</span>
                )}
              </label>
              <input
                type="text"
                value={form.schoolSlug}
                onChange={(e) => setForm({ ...form, schoolSlug: e.target.value })}
                placeholder="e.g. demo"
                required={loginRole === "student"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {loginRole === "student" ? "Student ID" : "Username"}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={loginRole === "student" ? "e.g. DEMO-2025-001" : "Enter username"}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {loginRole === "student" && (
                <p className="text-xs text-gray-400 mt-1">Your Student ID is printed on your ID card or given by admin</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            {loginRole === "student"
              ? "Contact your school if you don't have login credentials"
              : "Contact your administrator if you need access"}
          </p>
        </div>
      </div>
    </div>
  )
}
