"use server"

import { genkit, type Plugin } from "genkit"
import { googleAI } from "@genkit-ai/google-genai"

// This is a workaround to get the API key from the environment variable
// in a way that works in the Firebase Studio environment.
const a: Plugin[] = []
if (process.env.GEMINI_API_KEY) {
  a.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }))
}
export const ai = genkit({
  plugins: a,
})
