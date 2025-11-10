'use server';
/**
 * @fileOverview A flow for extracting medicine batch details from an image.
 * 
 * - extractBatchDetails - A function that takes an image of a medicine pack and returns structured data.
 * - BatchDetailsInput - The input type for the extractBatchDetails function.
 * - BatchDetailsOutput - The return type for the extractBatchDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BatchDetailsInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of the medicine packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type BatchDetailsInput = z.infer<typeof BatchDetailsInputSchema>;

const BatchDetailsOutputSchema = z.object({
  batchNumber: z.string().optional().describe('The batch number, e.g., "AB12345"'),
  mfgDate: z.string().optional().describe("The manufacturing date in YYYY-MM format, e.g., '2023-05'"),
  expiryDate: z.string().optional().describe("The expiry date in YYYY-MM format, e.g., '2025-04'"),
  price: z.number().optional().describe("The Maximum Retail Price (MRP) as a number, e.g., 120.50"),
});
export type BatchDetailsOutput = z.infer<typeof BatchDetailsOutputSchema>;


const prompt = ai.definePrompt(
  {
    name: 'extractBatchDetailsPrompt',
    inputSchema: BatchDetailsInputSchema,
    outputSchema: BatchDetailsOutputSchema,
    prompt: `You are an expert OCR tool for pharmaceutical products. Analyze the provided image of a medicine package. Extract the following details accurately:
- Batch Number (often labeled as B.No. or Batch No.)
- Manufacturing Date (MFG Date)
- Expiry Date (EXP. Date)
- Maximum Retail Price (MRP ₹)

Format the dates as YYYY-MM. If a value is not clearly visible, omit it.

Image: {{media url=imageDataUri}}`,
  }
);

const extractBatchDetailsFlow = ai.defineFlow(
  {
    name: 'extractBatchDetailsFlow',
    inputSchema: BatchDetailsInputSchema,
    outputSchema: BatchDetailsOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    return response.output()!;
  }
);


export async function extractBatchDetails(input: BatchDetailsInput): Promise<BatchDetailsOutput> {
  return extractBatchDetailsFlow(input);
}
