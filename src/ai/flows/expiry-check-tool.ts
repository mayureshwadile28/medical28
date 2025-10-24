'use server';

/**
 * @fileOverview This file defines a Genkit flow for checking medicine expiry and generating alerts.
 * 
 * It exports:
 * - `checkExpiry` - An async function that takes sales data and medicine data to predict which medicines
 *   should be prioritized based on their expiration dates.
 * - `ExpiryCheckInput` - The input type for the checkExpiry function.
 * - `ExpiryCheckOutput` - The return type for the checkExpiry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MedicineSchema = z.object({
  name: z.string(),
  category: z.string(),
  location: z.string(),
  expiry: z.string(), // Assuming date strings in ISO format
  price: z.number(),
  stock: z.number(),
});
export type Medicine = z.infer<typeof MedicineSchema>;

const SaleRecordSchema = z.object({
  customerName: z.string(),
  saleDate: z.string(), // Assuming date strings in ISO format
  items: z.array(z.object({name: z.string(), quantity: z.number()})),
  totalAmount: z.number(),
});
export type SaleRecord = z.infer<typeof SaleRecordSchema>;

const ExpiryCheckInputSchema = z.object({
  medicines: z.array(MedicineSchema).describe('Array of medicine objects with details like name, category, expiry date, stock, and price.'),
  salesData: z.array(SaleRecordSchema).describe('Array of sales records, each containing customer name, sale date, items sold, and total amount.'),
});
export type ExpiryCheckInput = z.infer<typeof ExpiryCheckInputSchema>;

const ExpiryCheckOutputSchema = z.object({
  alertMessage: z.string().describe('A message indicating which medicines need prioritization based on expiry dates and sales data.'),
});
export type ExpiryCheckOutput = z.infer<typeof ExpiryCheckOutputSchema>;

export async function checkExpiry(input: ExpiryCheckInput): Promise<ExpiryCheckOutput> {
  return expiryCheckFlow(input);
}

const expiryCheckPrompt = ai.definePrompt({
  name: 'expiryCheckPrompt',
  input: {schema: ExpiryCheckInputSchema},
  output: {schema: ExpiryCheckOutputSchema},
  prompt: `You are an experienced pharmacy inventory manager. Analyze the following medicine inventory and sales data to identify medicines that are close to their expiration date and should be prioritized for sale. Consider sales trends to avoid overstocking close to expiry. Provide a concise alert message with the names of the medicines to prioritize.

Medicines:
{{#each medicines}}
- Name: {{name}}, Category: {{category}}, Expiry: {{expiry}}, Stock: {{stock}}, Price: {{price}}
{{/each}}

Sales Data:
{{#each salesData}}
- Customer: {{customerName}}, Date: {{saleDate}}, Total: {{totalAmount}}
  Items:
  {{#each items}}
  - {{name}} ({{quantity}})
  {{/each}}
{{/each}}`,
});

const expiryCheckFlow = ai.defineFlow(
  {
    name: 'expiryCheckFlow',
    inputSchema: ExpiryCheckInputSchema,
    outputSchema: ExpiryCheckOutputSchema,
  },
  async input => {
    const {output} = await expiryCheckPrompt(input);
    return output!;
  }
);


