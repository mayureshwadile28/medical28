'use server';
/**
 * @fileOverview An AI flow for extracting batch details from an image.
 *
 * - extractBatchDetails - A function that handles the batch detail extraction process.
 * - BatchDetailsInput - The input type for the extractBatchDetails function.
 * - BatchDetailsOutput - The return type for the extractBatchDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const BatchDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a medicine strip or box, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type BatchDetailsInput = z.infer<typeof BatchDetailsInputSchema>;

const BatchDetailsOutputSchema = z.object({
  batchNumber: z.string().optional().describe('The batch number, e.g., "AB12345"'),
  mfgDate: z.string().optional().describe('The manufacturing date in YYYY-MM format, e.g., "2023-05"'),
  expDate: z.string().optional().describe('The expiry date in YYYY-MM format, e.g., "2025-10"'),
  mrp: z.number().optional().describe('The Maximum Retail Price (MRP) as a number, e.g., 120.50'),
});
export type BatchDetailsOutput = z.infer<typeof BatchDetailsOutputSchema>;

export async function extractBatchDetails(input: BatchDetailsInput): Promise<BatchDetailsOutput> {
  return extractBatchDetailsFlow(input);
}

const extractBatchDetailsFlow = ai.defineFlow(
  {
    name: 'extractBatchDetailsFlow',
    inputSchema: BatchDetailsInputSchema,
    outputSchema: BatchDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: 'googleai/gemini-pro-vision',
        prompt: `
        You are an expert at reading text from images of medicine packaging from India.
        Your task is to extract the following details from the provided image:
        - Batch Number (B. No., Batch No.)
        - Manufacturing Date (Mfg. Dt., Mfg. Date) in MM/YYYY format.
        - Expiry Date (Exp. Dt., Exp. Date) in MM/YYYY format.
        - Maximum Retail Price (M.R.P., MRP)

        Only return the values for the fields you are confident about. 
        The final dates MUST be in YYYY-MM format. For example, if you read "11/2024", the output should be "2024-11".
        For the price, only return the numeric value. For example, if the text is "MRP ₹120.50", the value should be 120.50.
        If a value is not clearly visible, do not guess. Omit the field.

        Image: {{media url=photoDataUri}}
    `,
        output: {
            schema: BatchDetailsOutputSchema
        }
    });

    if (!output) {
      throw new Error('AI failed to generate a response.');
    }
    return output;
  }
);
