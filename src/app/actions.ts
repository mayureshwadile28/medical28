
'use server';

import { analyzeImage } from '@/ai/flows/analyze-image';
import { AnalyzeImageInput, AnalyzeImageOutput } from '@/lib/types';

export async function analyzeImageAction(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  try {
    const result = await analyzeImage(input);
    return result;
  } catch (error) {
    console.error('Error in analyzeImageAction:', error);
    // Propagate a user-friendly error message
    throw new Error('The AI model failed to process the image. Please try again.');
  }
}
