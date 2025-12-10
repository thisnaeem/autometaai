import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          credits: user.credits,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && profile?.email) {
        try {
          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email: profile.email }
          })

          // Create user if doesn't exist
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name || null,
                image: (profile as any).picture || null,
                emailVerified: new Date(),
                role: "USER",
                credits: 0
              }
            })
          } else {
            // Update last login
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() }
            })
          }

          // Store user ID in the user object for JWT
          user.id = dbUser.id
          user.role = dbUser.role
          user.credits = dbUser.credits
        } catch (error) {
          console.error("Error in signIn callback:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.role = user.role
        token.credits = user.credits
      }
      
      // Refresh user data from database on each request
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, credits: true }
        })
        
        if (dbUser) {
          token.role = dbUser.role
          token.credits = dbUser.credits
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.credits = token.credits as number
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
}