'use server';
/**
 * @fileoverview A flow that extracts batch details from an image.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const BatchDetailsSchema = z.object({
  batchNumber: z.string().optional().describe('The batch number of the item'),
  mfgDate: z
    .string()
    .optional()
    .describe(
      'The manufacturing date in YYYY-MM format from the provided image.'
    ),
  expiryDate: z
    .string()
    .optional()
    .describe('The expiry date in YYYY-MM format from the provided image.'),
  price: z.number().optional().describe('The MRP price of the item.'),
});
export type BatchDetails = z.infer<typeof BatchDetailsSchema>;

const prompt = ai.definePrompt({
  name: 'extractBatchDetailsPrompt',
  input: {
    schema: z.object({
      photo: z
        .string()
        .describe(
          "A photo of a medicine box, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: BatchDetailsSchema,
  },
  model: googleAI.model('gemini-1.5-flash'),
  prompt: `From the attached photo of a medicine box, extract the batch number, manufacturing date, and expiry date. Also extract the MRP price.
    {{media url=photo}}
  `,
});

export async function extractBatchDetailsFlow(input: {
  photo: string;
}): Promise<BatchDetails> {
  const {output} = await prompt(input);
  return output!;
}
