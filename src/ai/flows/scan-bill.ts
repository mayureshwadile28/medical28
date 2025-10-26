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

// The AI will now return a simple string.
const ScanBillOutputSchema = z.object({
  description: z.string().describe("A simple text description of the items and quantities found.")
});

export async function scanBill(input: ScanBillInput): Promise<ScanBillOutput> {
    console.log('Starting scanBill flow with input URI starting with:', input.photoDataUri.substring(0, 30));
    try {
        const { output } = await scanBillFlow(input);
        
        if (!output?.description) {
           return { items: [] };
        }
        
        // Manually parse the AI's text output.
        const parsedItems = output.description
          .split(',')
          .map(part => {
              const [name, quantityStr] = part.split(':');
              if (name && quantityStr) {
                  const quantity = parseInt(quantityStr.trim(), 10);
                  if (!isNaN(quantity)) {
                      return { name: name.trim(), quantity };
                  }
              }
              return null;
          })
          .filter((item): item is { name: string; quantity: number } => item !== null);

        console.log('scanBill flow completed successfully with output:', { items: parsedItems });
        return { items: parsedItems };

    } catch (error) {
        console.error('Error executing scanBillFlow:', error);
        throw new Error('Failed to scan the bill due to an AI processing error.');
    }
}

const scanBillPrompt = ai.definePrompt({
  name: 'scanBillPrompt',
  input: { schema: ScanBillInputSchema },
  output: { schema: ScanBillOutputSchema },
  prompt: `You are an expert at reading medical bills.
Analyze the provided image and extract all the medicine names and their quantities.
If the bill contains items that are not medicines, ignore them.
Return the result as a simple comma-separated list. For example: "Paracetamol: 2, Aspirin: 1, Band-Aids: 10"

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
