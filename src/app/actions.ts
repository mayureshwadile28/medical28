'use server';
import { extractBatchDetailsFlow } from "@/ai/flows/extract-batch-details-flow";

export async function extractBatchDetailsAction(formData: FormData) {
    const file = formData.get('photo') as File;

    if (!file) {
        throw new Error('No photo provided');
    }

    const arrayBuffer = await file.arrayBuffer();
    const photo = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;
    
    const photoDataUri = `data:${mimeType};base64,${photo}`;

    return await extractBatchDetailsFlow({ photo: photoDataUri });
}
