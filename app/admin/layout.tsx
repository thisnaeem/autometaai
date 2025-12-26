"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import AdminSidebar from "@/components/layout/AdminSidebar"

interface UserWithRole {
  role?: string;
  [key: string]: unknown;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return // Still loading

    if (!session) {
      router.push("/signin")
      return
    }

    if ((session.user as UserWithRole).role !== "ADMIN") {
      router.push("/describe")
      return
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session || (session.user as UserWithRole).role !== "ADMIN") {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}