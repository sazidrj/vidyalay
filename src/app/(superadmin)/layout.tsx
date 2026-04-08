import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@prisma/client"
import { SignOutButton } from "./SignOutButton"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session || session.user.role !== Role.SUPER_ADMIN) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-700">
          <p className="font-bold text-lg">Vidyalay Platform</p>
          <p className="text-gray-400 text-xs mt-1">Super Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <a href="/superadmin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800">
            Dashboard
          </a>
          <a href="/superadmin/schools" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800">
            Schools
          </a>
        </nav>
        <div className="p-3 border-t border-gray-700">
          <p className="text-sm text-gray-400 px-3 py-2">{session.user.name}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  )
}
