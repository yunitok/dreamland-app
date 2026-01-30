"use server"

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

const SALT_ROUNDS = 10

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: users }
  } catch (error) {
    console.error("Error fetching users:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}

export async function createUser(data: any) {
  try {
    const hashedPassword = await hash(data.password, SALT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
        image: data.image
      }
    })
    revalidatePath("/admin/users")
    return { success: true, data: user }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function updateUser(id: string, data: any) {
  try {
    const updateData: any = {
      name: data.name,
      username: data.username,
      email: data.email,
      roleId: data.roleId,
      image: data.image
    }

    if (data.password) {
      updateData.password = await hash(data.password, SALT_ROUNDS)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    })
    revalidatePath("/admin/users")
    return { success: true, data: user }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, error: "Failed to update user" }
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}
