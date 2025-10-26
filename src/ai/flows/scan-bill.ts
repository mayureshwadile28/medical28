
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
    prompt: `Describe the contents of the image.

Image: {{media url=photoDataUri}}`,
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
