'use server';

import { extractBatchDetails } from '@/ai/flows/extract-batch-details-flow';
import { type BatchDetailsInput } from '@/ai/flows/extract-batch-details-flow';

export async function extractBatchDetailsAction(input: BatchDetailsInput) {
    return await extractBatchDetails(input);
}
