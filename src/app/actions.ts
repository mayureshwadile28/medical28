'use server';

import { extractBatchDetails, type BatchDetailsInput, type BatchDetailsOutput } from '@/ai/flows/extract-batch-details-flow';

export async function extractBatchDetailsAction(input: BatchDetailsInput): Promise<BatchDetailsOutput> {
  try {
    const result = await extractBatchDetails(input);
    return result;
  } catch (error) {
    console.error("AI Action Error:", error);
    // In a real app, you'd want more robust error handling,
    // but for now, we'll return an empty object on failure.
    return {};
  }
}
