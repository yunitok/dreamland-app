
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createTeamMood, updateTeamMood, deleteTeamMood, getTeamMoods } from "@/lib/actions/sentiment";
import { prisma } from "@/lib/prisma";

// Mock Next.js actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Sentiment CRUD Flow", () => {
    let createdMoodId: string;

    // Clean up before tests
    beforeAll(async () => {
        // Optional: clear existing test data if needed
    });

    it("should create a new team mood record", async () => {
        const newMood = {
            departmentName: "Test Dept",
            sentimentScore: 85,
            dominantEmotion: "Optimistic",
            keyConcerns: "Testing flow",
            detectedAt: new Date()
        };

        // We can't easily capture the redirect, but we can check if it throws or inserts
        // Since the action redirects, it might throw a NEXT_REDIRECT error in test environment if not handled.
        // However, we can check the DB directly after calling it, or mock redirect.
        // For simplicity in this integration test, we'll use prisma directly to verify creation context
        // OR we can allow the action to run and catch the redirect error which signifies success in Next.js server actions.
        
        try {
            await createTeamMood(newMood);
        } catch (error: any) {
            if (error.message !== "NEXT_REDIRECT") {
                // If it's not a redirect, it's a real error
                // console.error(error); 
                // In actual Next.js actions, redirect throws an error. 
            }
        }

        // Verify creation
        const savedMood = await prisma.teamMood.findFirst({
            where: { departmentName: "Test Dept" }
        });

        expect(savedMood).toBeDefined();
        expect(savedMood?.sentimentScore).toBe(85);
        createdMoodId = savedMood!.id;
    });

    it("should retrieve the list of moods", async () => {
        const result = await getTeamMoods();
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        const found = result.data?.find(m => m.id === createdMoodId);
        expect(found).toBeDefined();
    });

    it("should update an existing mood", async () => {
        const updateData = {
            departmentName: "Test Dept",
            sentimentScore: 50,
            dominantEmotion: "Concerned",
            keyConcerns: "Updated concern",
            detectedAt: new Date()
        };

        try {
            await updateTeamMood(createdMoodId, updateData);
        } catch (error: any) {
             if (error.message !== "NEXT_REDIRECT") {
                 // Ignore redirect error
             }
        }

        const updated = await prisma.teamMood.findUnique({
            where: { id: createdMoodId }
        });

        expect(updated?.sentimentScore).toBe(50);
        expect(updated?.dominantEmotion).toBe("Concerned");
    });

    it("should delete the mood record", async () => {
        const result = await deleteTeamMood(createdMoodId);
        expect(result.success).toBe(true);

        const deleted = await prisma.teamMood.findUnique({
            where: { id: createdMoodId }
        });
        expect(deleted).toBeNull();
    });
});
