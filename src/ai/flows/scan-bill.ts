
'use server';

import { ai } from '@/ai/genkit';
import { ScanBillInput, ScanBillInputSchema, ScanBillOutput, ScanBillOutputSchema } from '@/lib/types';

export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
  return scanBillFlow(input);
}

const scanBillPrompt = ai.definePrompt(
  {
    name: 'scanBillPrompt',
    input: { schema: ScanBillInputSchema },
    output: { schema: ScanBillOutputSchema },
    prompt: `You are a pharmacy inventory assistant. Your task is to read the provided image of a bill or invoice and extract the medicine names and their quantities.

For each item on the bill, identify the medicine name and the quantity purchased. Ignore prices, taxes, and other details.

Return the data as a structured list of items. If no valid items are found, return an empty list.

Image of the bill: {{media url=photoDataUri}}`,
    model: 'googleai/gemini-1.5-flash-latest',
  },
);

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
