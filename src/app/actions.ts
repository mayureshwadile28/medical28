
'use server';

import { analyzeImage } from '@/ai/flows/analyze-image';
import { AnalyzeImageInput, AnalyzeImageOutput } from '@/lib/types';

export async function analyzeImageAction(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  try {
    const result = await analyzeImage(input);
    return result;
  } catch (error: any) {
    console.error('Error in analyzeImageAction:', error);
    // Propagate a user-friendly error message
    // In a real app, you might inspect `error` to provide a more specific message
    throw new Error('The AI model failed to process the image. Please try again.');
  }
}
