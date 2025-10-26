'use server';

import { scanBill } from '@/ai/flows/scan-bill';
import { ScanBillInput, ScanBillOutput } from '@/lib/types';

export async function analyzeBillAction(input: ScanBillInput): Promise<ScanBillOutput> {
  try {
    const result = await scanBill(input);
    return result;
  } catch (error) {
    console.error('Error in analyzeBillAction:', error);
    // Propagate a user-friendly error message
    throw new Error('The AI model failed to process the bill. Please try again.');
  }
}
