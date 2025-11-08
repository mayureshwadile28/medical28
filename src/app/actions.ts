'use server';

import { extractBatchDetails } from '@/ai/flows/extract-batch-details-flow';

export async function extractBatchDetailsAction(formData: FormData) {
  const image = formData.get('image') as File;
  if (!image) {
    throw new Error('No image provided.');
  }

  const imageBuffer = await image.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
  const imageMimeType = image.type;
  const imageDataUri = `data:${imageMimeType};base64,${imageBase64}`;

  return await extractBatchDetails({ imageDataUri });
}
