'use server';

import { z } from 'genkit';
import { ai } from '../genkit';
import { ScanBillInput, ScanBillOutput } from '@/lib/types';

const ScanBillInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a medical bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const ScanBillOutputSchema = z.object({
  items: z.array(z.object({
    name: z.string().describe('The name of the medicine or item.'),
    quantity: z.number().describe('The quantity of the item.'),
  })).describe('An array of items found on the bill.'),
});

export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
    console.log('Starting scanBill flow with input URI starting with:', input.photoDataUri.substring(0, 30));
    try {
        const output = await scanBillFlow(input);
        console.log('scanBill flow completed successfully with output:', output);
        return output;
    } catch (error) {
        console.error('Error executing scanBillFlow:', error);
        throw new Error('Failed to scan the bill due to an AI processing error.');
    }
}

const scanBillPrompt = ai.definePrompt({
  name: 'scanBillPrompt',
  input: { schema: ScanBillInputSchema },
  output: { schema: ScanBillOutputSchema },
  prompt: `You are an expert at reading medical bills and prescriptions.
Analyze the provided image of a bill and extract all the medicine names and their quantities.
If the bill contains items that are not medicines, ignore them.
Focus only on the items and their quantities.

Image: {{media url=photoDataUri}}`,
});

const scanBillFlow = ai.defineFlow(
  {
    name: 'scanBillFlow',
    inputSchema: ScanBillInputSchema,
    outputSchema: ScanBillOutputSchema,
  },
  async (input) => {
    const { output } = await scanBillPrompt(input);
    return output!;
  }
);
