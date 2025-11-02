import {z} from 'zod';

export const AnalyzeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bill, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

const ScannedItemSchema = z.object({
    name: z.string().describe("The name of the medicine or item."),
    quantity: z.string().describe("The quantity of the item, e.g., '10 strips', '5 boxes', '1 bottle'."),
    category: z.string().describe("The category of the item, e.g., 'Tablet', 'Syrup', 'Ointment'."),
});

export const AnalyzeImageOutputSchema = z.object({
  wholesalerName: z.string().optional().describe("The name of the wholesaler or distributor from the bill."),
  items: z.array(ScannedItemSchema).describe("An array of items found on the bill."),
});

export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;
