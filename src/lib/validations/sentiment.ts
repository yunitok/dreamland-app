
import { z } from "zod";

export const teamMoodSchema = z.object({
  departmentName: z.string().min(1, { message: "Department name is required" }),
  sentimentScore: z.coerce.number().min(0).max(100),
  dominantEmotion: z.string().min(1, { message: "Dominant emotion is required" }),
  keyConcerns: z.string().optional(),
  detectedAt: z.coerce.date().optional().default(() => new Date()),
});

export type TeamMoodFormData = z.infer<typeof teamMoodSchema>;
