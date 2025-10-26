
'use server';

import { ai } from '../genkit';
import { AnalyzeImageInput, AnalyzeImageOutput } from '@/lib/types';

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  console.log('Starting analyzeImage flow with input URI starting with:', input.photoDataUri.substring(0, 30));
  
  try {
    const { text } = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: [
        { text: 'You are an expert at describing images. Analyze the provided image. Determine if the main subject is a human or an object. If it is a human, identify if they are male or female. Provide a concise, one-paragraph description based on your analysis.'},
        { media: { url: input.photoDataUri } }
      ],
    });

    const description = text || "The AI model did not return a description.";
    console.log('analyzeImage flow completed successfully. Description:', description);
    
    return { description };

  } catch (error) {
    console.error('Error executing analyzeImage flow:', error);
    throw new Error('Failed to analyze the image due to an AI processing error.');
  }
}
