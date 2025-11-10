'use server';

import { extractBatchDetails, type BatchDetailsInput, type BatchDetailsOutput } from '@/ai/flows/extract-batch-details-flow';

export async function extractBatchDetailsAction(
  input: BatchDetailsInput,
): Promise<BatchDetailsOutput> {
  return await extractBatchDetails(input);
}
