"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Role } from "@prisma/client"
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BookOpen,
  DollarSign,
  Calendar,
  UserCog,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
  X,
} from "lucide-react"
import { signOut } from "next-auth/react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

function getNavItems(schoolSlug: string): NavItem[] {
  return [
    {
      label: "Dashboard",
      href: `/${schoolSlug}`,
      icon: LayoutDashboard,
      roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    },
    {
      label: "Students",
      href: `/${schoolSlug}/students`,
      icon: Users,
      roles: [Role.ADMIN, Role.TEACHER],
    },
    {
      label: "Attendance",
      href: `/${schoolSlug}/attendance`,
      icon: ClipboardCheck,
      roles: [Role.ADMIN, Role.TEACHER],
    },
    {
      label: "My Attendance",
      href: `/${schoolSlug}/attendance/student`,
      icon: ClipboardCheck,
      roles: [Role.STUDENT],
    },
    {
      label: "Marks",
      href: `/${schoolSlug}/marks`,
      icon: BookOpen,
      roles: [Role.ADMIN, Role.TEACHER],
    },
    {
      label: "My Marks",
      href: `/${schoolSlug}/marks/student`,
      icon: GraduationCap,
      roles: [Role.STUDENT],
    },
    {
      label: "Fees",
      href: `/${schoolSlug}/fees`,
      icon: DollarSign,
      roles: [Role.ADMIN],
    },
    {
      label: "Calendar",
      href: `/${schoolSlug}/calendar`,
      icon: Calendar,
      roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    },
    {
      label: "Staff",
      href: `/${schoolSlug}/staff`,
      icon: UserCog,
      roles: [Role.ADMIN],
    },
    {
      label: "Reports",
      href: `/${schoolSlug}/reports`,
      icon: FileText,
      roles: [Role.ADMIN],
    },
    {
      label: "Settings",
      href: `/${schoolSlug}/settings`,
      icon: Settings,
      roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    },
  ]
}

interface SidebarProps {
  schoolSlug: string
  schoolName: string
  userRole: Role
  userName: string
  onClose?: () => void
}

export function Sidebar({ schoolSlug, schoolName, userRole, userName, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(schoolSlug).filter((item) => item.roles.includes(userRole))

  const roleLabel: Partial<Record<Role, string>> = {
    [Role.ADMIN]: "Administrator",
    [Role.TEACHER]: "Teacher",
    [Role.STUDENT]: "Student",
    [Role.SUPER_ADMIN]: "Super Admin",
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            {schoolName.charAt(0)}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="font-semibold text-sm text-gray-900 truncate">{schoolName}</p>
            <p className="text-xs text-gray-500">{roleLabel[userRole] ?? userRole}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === `/${schoolSlug}`
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
          <p className="text-xs text-gray-500">{roleLabel[userRole] ?? userRole}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
