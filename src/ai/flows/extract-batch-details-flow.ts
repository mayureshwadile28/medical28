'use server';

/**
 * @fileOverview An AI flow to extract medicine batch details from an image.
 * 
 * - extractBatchDetails - A function that handles the detail extraction process.
 * - BatchDetailsInput - The input type for the extractBatchDetails function.
 * - BatchDetailsOutput - The return type for the extractBatchDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema with a single image data URI
export const BatchDetailsInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of the medicine packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type BatchDetailsInput = z.infer<typeof BatchDetailsInputSchema>;

// Define the output schema for the extracted details
export const BatchDetailsOutputSchema = z.object({
  batchNumber: z.string().optional().describe("The batch number of the medicine."),
  mfgDate: z.string().optional().describe("The manufacturing date in YYYY-MM format."),
  expDate: z.string().optional().describe("The expiry date in YYYY-MM format."),
  mrp: z.number().optional().describe("The Maximum Retail Price (MRP) of the medicine."),
});
export type BatchDetailsOutput = z.infer<typeof BatchDetailsOutputSchema>;

/**
 * The main flow function that uses an AI prompt to extract details from an image.
 */
const extractBatchDetailsFlow = ai.defineFlow(
  {
    name: 'extractBatchDetailsFlow',
    inputSchema: BatchDetailsInputSchema,
    outputSchema: BatchDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: `
        You are an expert at reading text from images of medicine packaging from India.
        Your task is to extract the following details precisely:
        1. Batch Number (B. No., Batch No.)
        2. Manufacturing Date (MFG, Mfg. Date)
        3. Expiry Date (EXP, Exp. Date, Use by)
        4. Maximum Retail Price (MRP, M.R.P.)

        Analyze the following image and extract the information.
        - For dates, return them only in YYYY-MM format. For example, if the date is 11/2025, return "2025-11".
        - For MRP, return only the numerical value. For example, if it's "₹123.45", return 123.45.

        Image: {{media url=imageDataUri}}
        `,
        output: {
            schema: BatchDetailsOutputSchema
        }
    });
    return output!;
  }
);


/**
 * Exported wrapper function to be called from server actions.
 * @param input The image data URI.
 * @returns A promise that resolves to the extracted batch details.
 */
export async function extractBatchDetails(input: BatchDetailsInput): Promise<BatchDetailsOutput> {
  return extractBatchDetailsFlow(input);
}
