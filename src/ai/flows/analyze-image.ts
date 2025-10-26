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

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  console.log('Starting analyzeImage flow with input URI starting with:', input.photoDataUri.substring(0, 30));
  
  try {
    const { text } = await ai.generate({
      prompt: `You are an expert at describing images. Analyze the provided image and provide a concise, one-paragraph description of what you see.
Image: {{media url=${input.photoDataUri}}}`,
    });

    const description = text || "The AI model did not return a description.";
    console.log('analyzeImage flow completed successfully. Description:', description);
    
    return { description };

  } catch (error) {
    console.error('Error executing analyzeImage flow:', error);
    throw new Error('Failed to analyze the image due to an AI processing error.');
  }
}
