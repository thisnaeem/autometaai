import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { credits, bgRemovalCredits, role, isActive } = await request.json()
    const resolvedParams = await params
    const userId = resolvedParams.id

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prepare update data - use 'any' to handle dynamic fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    // Handle general credits update
    if (credits !== undefined && credits !== currentUser.credits) {
      updateData.credits = credits

      // Create credit transaction for admin adjustment
      const creditDifference = credits - currentUser.credits
      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: creditDifference,
          type: "ADMIN_ADJUSTMENT",
          description: `Admin adjustment: ${creditDifference > 0 ? "+" : ""}${creditDifference} general credits`
        }
      })
    }

    // Handle BG removal credits update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentBgCredits = (currentUser as any).bgRemovalCredits || 0
    if (bgRemovalCredits !== undefined && bgRemovalCredits !== currentBgCredits) {
      updateData.bgRemovalCredits = bgRemovalCredits

      // Create credit transaction for admin BG credit adjustment
      const bgCreditDifference = bgRemovalCredits - currentBgCredits
      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: bgCreditDifference,
          type: "ADMIN_ADJUSTMENT",
          description: `Admin adjustment: ${bgCreditDifference > 0 ? "+" : ""}${bgCreditDifference} BG removal credits`
        }
      })
    }

    if (role !== undefined) {
      updateData.role = role
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedUserAny = updatedUser as any

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        credits: updatedUser.credits,
        bgRemovalCredits: updatedUserAny.bgRemovalCredits || 0,
        isActive: updatedUser.isActive
      }
    })
  } catch (error) {
    console.error("Admin user update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}