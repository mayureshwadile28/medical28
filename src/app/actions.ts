'use server';

import {
  extractBatchDetailsFlow,
  type BatchDetails,
} from '@/ai/flows/extract-batch-details-flow';
import {run} from 'genkit';

/**
 * Extracts batch details from a photo of a medicine box.
 * @param photo A photo of a medicine box as a data URI.
 * @returns The extracted batch details.
 */
export async function extractBatchDetailsAction(
  photo: string
): Promise<BatchDetails> {
  return await run(extractBatchDetailsFlow, {photo});
}
