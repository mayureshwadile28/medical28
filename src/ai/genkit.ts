"use server"

import { genkit, type Plugin } from "genkit"
import { googleAI } from "@genkit-ai/googleai"

// This is a workaround to get the API key from the environment variable
// in a way that works in the Firebase Studio environment.
const geminiApiKey = process.env.GEMINI_API_KEY

if (!geminiApiKey) {
  // This is a fatal error, we can't do anything without the key.
  console.log("Gemini API Key not found. Please set GEMINI_API_KEY env var.")
}

const googleGenaiPlugin = googleAI({
  apiKey: geminiApiKey,
})

export const ai = genkit({
  plugins: [googleGenaiPlugin],
  logLevel: "debug",
  enableTracing: true,
})
