import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

interface ProjectInput {
  title: string
  department: string
  type: string
  priority: string
  description: string
  status: string
  sourceQuote?: string
}

interface TeamMoodInput {
  departmentName: string
  sentimentScore: number
  dominantEmotion: string
  keyConcerns?: string
}

interface SeedInput {
  projects?: ProjectInput[]
  teamMoods?: TeamMoodInput[]
}

export async function POST(request: NextRequest) {
  try {
    const body: SeedInput = await request.json()

    const counts = {
      projects: 0,
      moods: 0,
    }

    // Insert projects if provided
    if (body.projects && Array.isArray(body.projects)) {
      for (const project of body.projects) {
        await prisma.project.create({
          data: {
            title: project.title,
            department: project.department,
            type: project.type,
            priority: project.priority,
            description: project.description,
            status: project.status,
            sourceQuote: project.sourceQuote,
          },
        })
        counts.projects++
      }
    }

    // Insert or update team moods if provided
    if (body.teamMoods && Array.isArray(body.teamMoods)) {
      for (const mood of body.teamMoods) {
        await prisma.teamMood.create({
          data: {
            departmentName: mood.departmentName,
            sentimentScore: mood.sentimentScore,
            dominantEmotion: mood.dominantEmotion,
            keyConcerns: mood.keyConcerns,
            detectedAt: new Date(),
          },
        })
        counts.moods++
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data imported successfully",
      counts,
    })
  } catch (error) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    )
  }
}
