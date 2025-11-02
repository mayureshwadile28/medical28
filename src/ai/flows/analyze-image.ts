'use server';
/**
 * @fileOverview A bill scanning AI agent.
 *
 * - analyzeImage - A function that handles the bill scanning process.
 */

import {ai} from '@/ai/genkit';
import { AnalyzeImageInputSchema, AnalyzeImageOutputSchema, type AnalyzeImageInput, type AnalyzeImageOutput } from '@/lib/ai-types';

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  return analyzeImageFlow(input);
}

const systemInstruction = `You are an expert at reading and parsing medical wholesaler bills and invoices. Your task is to extract the wholesaler's name and a list of all medicines or items from an uploaded image of a bill.

- Identify the wholesaler's name from the top of the bill.
- For each item in the bill, extract its name, quantity, and category (e.g., Tablet, Syrup, Ointment, etc.).
- The quantity should be captured exactly as written on the bill (e.g., "10 strip", "5 box", "1 pc").
- Pay close attention to details and ensure accuracy.
- If you cannot determine a piece of information, leave it blank.
- Return the data in the specified JSON format.`;

const analyzeImageFlow = ai.defineFlow(
  {
    name: 'analyzeImageFlow',
    inputSchema: AnalyzeImageInputSchema,
    outputSchema: AnalyzeImageOutputSchema,
  },
  async (input) => {
    const {output} = await ai.generate({
        model: 'gemini-1.5-flash',
        prompt: {
            text: `Analyze the following bill and extract the wholesaler name and item details.`,
            media: [{ url: input.photoDataUri }],
        },
        output: {
            schema: AnalyzeImageOutputSchema
        },
        system: systemInstruction,
    });
    return output!;
  }
);
