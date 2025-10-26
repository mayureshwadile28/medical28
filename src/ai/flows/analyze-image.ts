'use server';

import { z } from 'genkit';
import { ai } from '../genkit';
import { AnalyzeImageInput, AnalyzeImageOutput } from '@/lib/types';

const AnalyzeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of anything, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const AnalyzeImageOutputSchema = z.object({
  description: z.string().describe("A simple text description of the contents of the image."),
});


export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
    console.log('Starting analyzeImage flow with input URI starting with:', input.photoDataUri.substring(0, 30));
    try {
        const output = await analyzeImageFlow(input);
        console.log('analyzeImage flow completed successfully. Description:', output.description);
        return output;
    } catch (error) {
        console.error('Error executing analyzeImageFlow:', error);
        throw new Error('Failed to analyze the image due to an AI processing error.');
    }
}

const analyzeImagePrompt = ai.definePrompt({
  name: 'analyzeImagePrompt',
  input: { schema: AnalyzeImageInputSchema },
  output: { schema: AnalyzeImageOutputSchema },
  prompt: `You are an expert at describing images.
Analyze the provided image and provide a concise, one-paragraph description of what you see.

Image: {{media url=photoDataUri}}`,
});

const analyzeImageFlow = ai.defineFlow(
  {
    name: 'analyzeImageFlow',
    inputSchema: AnalyzeImageInputSchema,
    outputSchema: AnalyzeImageOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeImagePrompt(input);
    return output!;
  }
);
