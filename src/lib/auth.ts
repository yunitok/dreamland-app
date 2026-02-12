"use server"

import { cookies } from "next/headers"
import { encrypt, decrypt } from "./session"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"

export interface SessionPayload {
  user: {
    id: string;
    username: string;
    name: string | null;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
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

    const remember = formData.get("remember") === "on"
    
    // Create the session
    // Default expiration: 24 hours. If remember me: 30 days
    const expirationDuration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const expires = new Date(Date.now() + expirationDuration)
    const sessionPayload = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role.code,
        permissions: user.role.permissions.map(p => p.action + ':' + p.resource),
        mustChangePassword: user.mustChangePassword
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

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string
  
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "passwordTooShort" }
  }
  
  const session = await getSession()
  if (!session || !session.user) {
    return { success: false, error: "unauthorized" }
  }

  const userId = session.user.id
  
  try {
    const hashedPassword = await hash(newPassword, 10)
    
    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      },
      include: { role: { include: { permissions: true } } }
    }) as any // Cast to any to avoid temporary TS consistency issues content
    
    // Update session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const sessionPayload = {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role.code,
        permissions: updatedUser.role.permissions.map((p: any) => p.action + ':' + p.resource),
        mustChangePassword: false
      },
      expires
    }
    
    // Re-encrypt and set cookie
    const newSessionToken = await encrypt(sessionPayload)
    const cookieStore = await cookies()
    cookieStore.set("session", newSessionToken, { 
      expires, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      path: '/'
    })
    
    return { success: true }
  } catch (error) {
    console.error("Update password error:", error)
    return { success: false, error: "failedToUpdate" }
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
    const payload = await decrypt(session)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
