'use server';
/**
 * @fileOverview A bill scanning AI agent.
 *
 * - analyzeImage - A function that handles the bill scanning process.
 * - AnalyzeImageInput - The input type for the analyzeImage function.
 * - AnalyzeImageOutput - The return type for the analyzeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit/zod';

const AnalyzeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

const ScannedItemSchema = z.object({
    name: z.string().describe("The name of the medicine or item."),
    quantity: z.string().describe("The quantity of the item, e.g., '10 strips', '5 boxes', '1 bottle'."),
    category: z.string().describe("The category of the item, e.g., 'Tablet', 'Syrup', 'Ointment'."),
});

const AnalyzeImageOutputSchema = z.object({
  supplierName: z.string().optional().describe("The name of the supplier or distributor from the bill."),
  items: z.array(ScannedItemSchema).describe("An array of items found on the bill."),
});

export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  return analyzeImageFlow(input);
}

const systemInstruction = `You are an expert at reading and parsing medical supplier bills and invoices. Your task is to extract the supplier's name and a list of all medicines or items from an uploaded image of a bill.

- Identify the supplier's name from the top of the bill.
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
            text: `Analyze the following bill and extract the supplier name and item details.`,
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
