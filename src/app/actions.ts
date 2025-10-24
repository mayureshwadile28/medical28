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
    // Sales data can be empty
    if (!salesData) {
      salesData = [];
    }
    
    const result = await checkExpiry({ medicines, salesData });
    return result;
  } catch (error) {
    console.error('Error in checkExpiryAction:', error);
    return { error: 'Failed to analyze expiry data. Please try again.' };
  }
}
