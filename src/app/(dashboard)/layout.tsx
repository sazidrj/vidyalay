import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { name: true, slug: true },
  })

  if (!school) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        schoolSlug={school.slug}
        schoolName={school.name}
        userRole={session.user.role as Role}
        userName={session.user.name}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
