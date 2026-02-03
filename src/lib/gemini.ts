import { GoogleGenerativeAI } from '@google/generative-ai'

const globalForGemini = globalThis as unknown as { genAI: GoogleGenerativeAI }

export const genAI = globalForGemini.genAI || new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

if (process.env.NODE_ENV !== 'production') globalForGemini.genAI = genAI
