
'use server';

import { ai } from '@/ai/genkit';
import { Medicine } from '@/lib/types';
import { 
    SuggestMedicinesInput, 
    SuggestMedicinesInputSchema, 
    SuggestMedicinesOutput, 
    SuggestMedicinesOutputSchema 
} from '@/lib/types';


export async function suggestMedicines(input: SuggestMedicinesInput): Promise<SuggestMedicinesOutput> {
    return suggestMedicinesFlow(input);
}


const suggestMedicinesFlow = ai.defineFlow(
  {
    name: 'suggestMedicinesFlow',
    inputSchema: SuggestMedicinesInputSchema,
    outputSchema: SuggestMedicinesOutputSchema,
  },
  async ({ patient, inventory }) => {
    
    // Filter out medicines that are out of stock or expired first.
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const availableInventory = inventory.filter((med: Medicine) => {
        const expiryDate = new Date(med.expiry);
        expiryDate.setHours(0, 0, 0, 0);
        if (expiryDate < now) return false;

        if (med.category === 'Tablet' || med.category === 'Capsule') {
            return (med as any).stock.tablets > 0;
        }
        return (med as any).stock.quantity > 0;
    });

    // We can do a simple filter here before calling the LLM to reduce the amount of data sent.
    const preFilteredInventory = availableInventory.filter((med: Medicine) => {
        if (!med.description) return false;
        
        const desc = med.description;
        const ageMatch = patient.age >= desc.minAge && patient.age <= desc.maxAge;
        const genderMatch = desc.gender === 'Both' || desc.gender === patient.gender;
        
        // Basic keyword match for illness
        const illnessMatch = med.description.illness.toLowerCase().includes(patient.illness.toLowerCase());
        
        return ageMatch && genderMatch && illnessMatch;
    });
    
    // If pre-filtering gives good results, we can use them.
    // If not, we fall back to the LLM with a larger inventory list.
    const inventoryToSend = preFilteredInventory.length > 0 ? preFilteredInventory : availableInventory;
    
    // We will create a simplified version of the inventory for the prompt
    const promptInventory = inventoryToSend.map(med => ({
        id: med.id,
        name: med.name,
        category: med.category,
        description: med.description,
    }));


    const { output } = await ai.generate({
        prompt: `You are an expert pharmacist assistant. A patient needs a medicine.
        Patient details:
        - Age: ${patient.age}
        - Gender: ${patient.gender}
        - Illness/Symptom: ${patient.illness}

        Here is a list of available medicines in the inventory:
        ${JSON.stringify(promptInventory, null, 2)}

        Based on the patient's details and the medicine descriptions, suggest a maximum of 5 suitable medicines.
        For each suggestion, provide the medicineId, name, and a brief reason for the suggestion.
        Prioritize medicines where the illness description is a close match and the patient's age fits within the min/max age range.
        If no suitable medicine is found, return an empty array for suggestions.`,
        output: { schema: SuggestMedicinesOutputSchema },
    });

    return output || { suggestions: [] };
  }
);
