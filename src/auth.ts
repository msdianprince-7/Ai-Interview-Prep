import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

// A precomputed hash of a throwaway value. Used to spend the same time on a
// bcrypt comparison when the account does not exist, so response timing does
// not reveal which emails are registered.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7DUtRt4b0aYuHzGDCPGb5FvGm2vLPqO"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== "string" || typeof password !== "string") {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        const isValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

        if (!user || !user.password || !isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
})
