'use server';
/**
 * @fileOverview An AI flow to extract batch details from an image.
 *
 * - extractBatchDetails - A function that handles the batch detail extraction.
 * - ExtractBatchDetailsInput - The input type for the function.
 * - ExtractBatchDetailsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractBatchDetailsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a medicine's packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBatchDetailsInput = z.infer<
  typeof ExtractBatchDetailsInputSchema
>;

const ExtractBatchDetailsOutputSchema = z.object({
  batchNumber: z.string().optional().describe('The batch number of the medicine.'),
  mfg: z
    .string()
    .optional()
    .describe('The manufacturing date in YYYY-MM format.'),
  expiry: z
    .string()
    .optional()
    .describe('The expiry date in YYYY-MM format.'),
});
type ExtractBatchDetailsOutput = z.infer<
  typeof ExtractBatchDetailsOutputSchema
>;

export async function extractBatchDetails(
  input: ExtractBatchDetailsInput
): Promise<ExtractBatchDetailsOutput> {
  return extractBatchDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBatchDetailsPrompt',
  input: { schema: ExtractBatchDetailsInputSchema },
  output: { schema: ExtractBatchDetailsOutputSchema },
  prompt: `You are a specialized text extraction tool for pharmaceutical products.
Your task is to analyze the provided image of a medicine's packaging and extract ONLY the following details:
- Batch Number (look for "B. No.", "Batch No.", etc.)
- Manufacturing Date (look for "MFD", "Mfg. Date", etc.)
- Expiry Date (look for "EXP", "Expiry Date", etc.)

Format the dates as YYYY-MM. For example, "AUG.2025" should become "2025-08".
If a value is not found, omit the field.

Image to analyze: {{media url=imageDataUri}}`,
});

const extractBatchDetailsFlow = ai.defineFlow(
  {
    name: 'extractBatchDetailsFlow',
    inputSchema: ExtractBatchDetailsInputSchema,
    outputSchema: ExtractBatchDetailsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
