
'use server';

import { ai } from '../genkit';
import { AnalyzeImageInput, AnalyzeImageOutput } from '@/lib/types';

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  console.log('Starting analyzeImage flow with input URI starting with:', input.photoDataUri.substring(0, 30));
  
  try {
    const { text } = await ai.generate({
      prompt: `You are an expert at describing images. Analyze the provided image and provide a concise, one-paragraph description of what you see.`,
      input: { photoDataUri: input.photoDataUri },
      model: 'gemini-1.5-flash-latest',
    });

    const description = text || "The AI model did not return a description.";
    console.log('analyzeImage flow completed successfully. Description:', description);
    
    return { description };

  } catch (error) {
    console.error('Error executing analyzeImage flow:', error);
    throw new Error('Failed to analyze the image due to an AI processing error.');
  }
}
