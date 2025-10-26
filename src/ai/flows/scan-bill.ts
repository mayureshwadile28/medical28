'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ScannedItemSchema = z.object({
  name: z.string().describe('The name of the medicine.'),
  quantity: z.number().describe('The quantity of the medicine.'),
});

const ScanBillOutputSchema = z.object({
  items: z.array(ScannedItemSchema).describe('An array of medicines found on the bill.'),
});
export type ScanBillOutput = z.infer<typeof ScanBillOutputSchema>;

const ScanBillInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ScanBillInput = z.infer<typeof ScanBillInputSchema>;


export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
  return scanBillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanBillPrompt',
  input: { schema: ScanBillInputSchema },
  output: { schema: ScanBillOutputSchema },
  prompt: `You are a pharmacy inventory assistant. Your task is to read the provided image of a bill or invoice and extract the medicine names and their quantities.

For each item on the bill, identify the medicine name and the quantity purchased. Ignore prices, taxes, and other details.

Return the data as a structured list of items. If no valid items are found, return an empty list.

Bill Image: {{media url=photoDataUri}}`,
});

const scanBillFlow = ai.defineFlow(
  {
    name: 'scanBillFlow',
    inputSchema: ScanBillInputSchema,
    outputSchema: ScanBillOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      model: 'googleai/gemini-1.5-flash-latest'
    });
    return output!;
  }
);
