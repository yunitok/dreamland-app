"use server"

import { cookies } from "next/headers"
import { encrypt, decrypt } from "./session"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

export interface SessionPayload {
  user: {
    id: string;
    username: string;
    name: string | null;
    role: string;
    permissions: string[];
  };
  expires: Date;
}

export async function login(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  if (!username || !password) {
    return { success: false, error: "invalidCredentials" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: { include: { permissions: true } } }
    })

    if (!user) {
      return { success: false, error: "invalidCredentials" }
    }

    const passwordsMatch = await compare(password, user.password)

    if (!passwordsMatch) {
      return { success: false, error: "invalidCredentials" }
    }

    // Create the session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const sessionPayload = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role.code,
        permissions: user.role.permissions.map(p => p.action + ':' + p.resource)
      },
      expires
    }
    
    const session = await encrypt(sessionPayload)

    // Save the session in a cookie
    const cookieStore = await cookies()
    cookieStore.set("session", session, { 
      expires, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      path: '/'
    })
    
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "invalidCredentials" }
  }
}

export async function logout() {
  // Destroy the session
  const cookieStore = await cookies()
  cookieStore.set("session", "", { 
    expires: new Date(0),
    path: '/'
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  if (!session) return null
  try {
    return await decrypt(session)
  } catch {
    return null
  }
}
