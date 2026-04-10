"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Sidebar } from "./sidebar"
import { Role } from "@prisma/client"

interface Props {
  schoolSlug: string
  schoolName: string
  userRole: Role
  userName: string
  children: React.ReactNode
}

export function DashboardShell({ schoolSlug, schoolName, userRole, userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={`fixed inset-y-0 left-0 z-30 md:static md:z-auto md:flex md:flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          schoolSlug={schoolSlug}
          schoolName={schoolName}
          userRole={userRole}
          userName={userName}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
              {schoolName.charAt(0)}
            </div>
            <span className="font-semibold text-sm text-gray-900 truncate">{schoolName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
