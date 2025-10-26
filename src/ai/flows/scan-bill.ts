
'use server';

import { ai } from '@/ai/genkit';
import { ScanBillInput, ScanBillInputSchema, ScanBillOutput, ScanBillOutputSchema } from '@/lib/types';
import { z } from 'zod';

export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
  return scanBillFlow(input);
}

const scanBillFlow = ai.defineFlow(
  {
    name: 'scanBillFlow',
    inputSchema: ScanBillInputSchema,
    outputSchema: ScanBillOutputSchema,
  },
  async (input) => {
    // Call the model directly instead of using a pre-defined prompt object,
    // to avoid the issues with responseSchema.
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `Describe the contents of the image.

Image: {{media url=photoDataUri}}`,
      // Pass the input variables to the prompt template.
      input: input
    });
    
    // Manually construct the output object to match the expected schema.
    return { description: text };
  }
);
