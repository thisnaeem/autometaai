import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Use Better Auth to create user
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || undefined,
      }
    })

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "User created successfully",
      user: result.user
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}