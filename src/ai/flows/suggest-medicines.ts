
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Medicine, SuggestMedicinesInput, SuggestMedicinesInputSchema, SuggestMedicinesOutput, SuggestMedicinesOutputSchema } from '@/lib/types';


export async function suggestMedicines(input: SuggestMedicinesInput): Promise<SuggestMedicinesOutput> {
    // This is no longer an AI flow, but a simple filtering function.
    // We keep the async structure to maintain API consistency with the frontend.
    
    const { patient, inventory } = input;

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

    const matchingMedicines = availableInventory.filter((med: Medicine) => {
        // Only consider medicines that have a description
        if (!med.description) return false;
        
        const desc = med.description;
        
        // Check age: patient's age must be within the medicine's min/max age range.
        const ageMatch = patient.age >= desc.minAge && patient.age <= desc.maxAge;
        
        // Check gender: medicine's gender must be 'Both' or match the patient's gender.
        const genderMatch = desc.gender === 'Both' || desc.gender === patient.gender;
        
        // Basic keyword match for illness: check if the medicine's illness description includes the patient's symptom.
        const illnessMatch = desc.illness.toLowerCase().includes(patient.illness.toLowerCase());
        
        return ageMatch && genderMatch && illnessMatch;
    });
    
    const suggestions = matchingMedicines.map(med => ({
        medicineId: med.id,
        name: med.name,
        reason: `Suitable for ${med.description?.illness.toLowerCase()} in patients aged ${med.description?.minAge}-${med.description?.maxAge}.`,
    }));

    // Limit to 5 suggestions to keep the UI clean
    const limitedSuggestions = suggestions.slice(0, 5);

    return Promise.resolve({ suggestions: limitedSuggestions });
}
