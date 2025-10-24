'use server';

import { checkExpiry, type Medicine, type SaleRecord } from '@/ai/flows/expiry-check-tool';

export async function checkExpiryAction(
  medicines: Medicine[], 
  salesData: SaleRecord[]
): Promise<{ alertMessage: string } | { error: string }> {
  try {
    if (!medicines || medicines.length === 0) {
      return { error: 'No medicine data available to analyze.' };
    }
    
    const result = await checkExpiry({ 
        medicines: medicines || [], 
        salesData: salesData || [] 
    });
    return result;
  } catch (error) {
    console.error('Error in checkExpiryAction:', error);
    if (error instanceof Error) {
        return { error: `Failed to analyze expiry data: ${error.message}` };
    }
    return { error: 'Failed to analyze expiry data. An unknown error occurred.' };
  }
}
