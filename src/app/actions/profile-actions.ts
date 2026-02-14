"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/session"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// Actualizar información del perfil
export async function updateProfile(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string | null

  // Validar formato de email si se proporciona
  if (email && email.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: "invalidEmail" }
    }
  }

  const session = await getSession()
  if (!session || !session.user) {
    return { success: false, error: "unauthorized" }
  }

  const userId = session.user.id

  try {
    // Verificar si el email ya existe (excluyendo al usuario actual)
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingEmail && existingEmail.id !== userId) {
        return { success: false, error: "emailTaken" }
      }
    }

    // Actualizar usuario en la base de datos (solo nombre y email, username es readonly)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || null,
        email: email && email.trim() !== "" ? email : null
      },
      include: { role: { include: { permissions: true } } }
    })

    // Actualizar sesión
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const sessionPayload = {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role.code,
        permissions: updatedUser.role.permissions.map(p => p.action + ':' + p.resource),
        mustChangePassword: updatedUser.mustChangePassword
      },
      expires
    }

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
    console.error("Update profile error:", error)
    return { success: false, error: "failedToUpdate" }
  }
}

// Subir avatar
export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar") as File

  if (!file) {
    return { success: false, error: "noFile" }
  }

  // Validar tipo MIME
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "invalidType" }
  }

  // Validar tamaño (máx 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { success: false, error: "tooLarge" }
  }

  const session = await getSession()
  if (!session || !session.user) {
    return { success: false, error: "unauthorized" }
  }

  const userId = session.user.id

  try {
    // Convertir el archivo a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determinar extensión
    const extension = file.type.split("/")[1] || "jpg"
    const filename = `${userId}.${extension}`

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), "public", "avatars")
    
    // Guardar archivo
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Actualizar base de datos
    const imageUrl = `/avatars/${filename}`
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      include: { role: { include: { permissions: true } } }
    })

    // Actualizar sesión
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const sessionPayload = {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role.code,
        permissions: updatedUser.role.permissions.map(p => p.action + ':' + p.resource),
        mustChangePassword: updatedUser.mustChangePassword
      },
      expires
    }

    const newSessionToken = await encrypt(sessionPayload)
    const cookieStore = await cookies()
    cookieStore.set("session", newSessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/'
    })

    return { success: true, imageUrl }
  } catch (error) {
    console.error("Upload avatar error:", error)
    return { success: false, error: "uploadFailed" }
  }
}

// Eliminar avatar
export async function deleteAvatar() {
  const session = await getSession()
  if (!session || !session.user) {
    return { success: false, error: "unauthorized" }
  }

  const userId = session.user.id

  try {
    // Obtener usuario actual para saber qué archivo eliminar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } }
    })

    if (!user || !user.image) {
      return { success: false, error: "noAvatar" }
    }

    // Eliminar archivo físico si existe
    const filename = user.image.split("/").pop()
    if (filename) {
      const filepath = join(process.cwd(), "public", "avatars", filename)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }
    }

    // Actualizar base de datos
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: null },
      include: { role: { include: { permissions: true } } }
    })

    // Actualizar sesión
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const sessionPayload = {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role.code,
        permissions: updatedUser.role.permissions.map(p => p.action + ':' + p.resource),
        mustChangePassword: updatedUser.mustChangePassword
      },
      expires
    }

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
    console.error("Delete avatar error:", error)
    return { success: false, error: "deleteFailed" }
  }
}
