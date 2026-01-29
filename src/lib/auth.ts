"use server"

import { cookies } from "next/headers"
import { encrypt, decrypt } from "./session"

export async function login(formData: FormData) {
  // Hardcoded for development
  const username = formData.get("username")
  const password = formData.get("password")

  if (username === "admin" && password === "admin") {
    // Create the session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ user: "admin", expires })

    // Save the session in a cookie
    const cookieStore = await cookies()
    cookieStore.set("session", session, { 
      expires, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      path: '/'
    })
    return { success: true }
  }

  return { success: false, error: "invalidCredentials" }
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
  } catch (e) {
    return null
  }
}
