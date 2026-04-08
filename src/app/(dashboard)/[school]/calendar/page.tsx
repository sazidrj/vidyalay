"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

interface CalendarEvent {
  id: number
  title: string
  description: string | null
  startDate: string
  endDate: string
  eventType: string
  color: string | null
}

const EVENT_COLORS: Record<string, string> = {
  HOLIDAY: "bg-red-100 text-red-800 border-red-200",
  EXAM: "bg-blue-100 text-blue-800 border-blue-200",
  SPORTS: "bg-green-100 text-green-800 border-green-200",
  MEETING: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
}

export default function CalendarPage() {
  const params = useParams<{ school: string }>()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    eventType: "HOLIDAY",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const r = await fetch(`/api/${params.school}/calendar`)
    const data = await r.json()
    setEvents(data.data ?? [])
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/${params.school}/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ title: "", description: "", startDate: "", endDate: "", eventType: "HOLIDAY" })
    loadEvents()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Calendar</h1>
          <p className="text-gray-500 mt-1">Holidays, exams, and school events</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Event</h2>
          <form onSubmit={createEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {["HOLIDAY", "EXAM", "SPORTS", "MEETING", "OTHER"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create Event"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            No events scheduled. Add holidays and events above.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 shadow-sm"
            >
              <span
                className={`px-2.5 py-1 rounded text-xs font-medium border ${EVENT_COLORS[event.eventType] ?? EVENT_COLORS.OTHER}`}
              >
                {event.eventType}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                )}
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{new Date(event.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                {event.startDate !== event.endDate && (
                  <p>to {new Date(event.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
