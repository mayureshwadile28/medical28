
'use server';

import { ai } from '@/ai/genkit';
import { Medicine, SuggestMedicinesInput, SuggestMedicinesInputSchema, SuggestMedicinesOutput, SuggestMedicinesOutputSchema, isTablet } from '@/lib/types';


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

        if (isTablet(med)) {
            return med.stock.tablets > 0;
        }
        return med.stock.quantity > 0;
    });

    const matchingMedicines = availableInventory.filter((med: Medicine) => {
        // Only consider medicines that have a valid description
        if (!med.description) return false;
        
        const desc = med.description;

        // Match patient type
        if (desc.patientType !== patient.patientType) return false;
        
        // Basic keyword match for illness: check if the medicine's illness description includes any of the patient's symptoms.
        const illnessMatch = patient.illnesses.some(symptom => 
            desc.illness.toLowerCase().includes(symptom.toLowerCase())
        );

        if (!illnessMatch) return false;

        if (desc.patientType === 'Human') {
            if (!patient.age || !patient.gender) return false;
            if (!desc.minAge || !desc.maxAge || desc.minAge === 0 || desc.maxAge === 0) return false;
            // Check age: patient's age must be within the medicine's min/max age range.
            const ageMatch = patient.age >= desc.minAge && patient.age <= desc.maxAge;
            
            // Check gender: medicine's gender must be 'Both' or match the patient's gender.
            const genderMatch = desc.gender === 'Both' || desc.gender === patient.gender;

            return ageMatch && genderMatch;
        }

        // For animal, we only match on illness
        return true;
    });
    
    const suggestions = matchingMedicines.map(med => {
        let reason = `Suitable for ${med.description?.illness.toLowerCase()}.`;
        if (med.description?.patientType === 'Human') {
            reason = `Suitable for ${med.description?.illness.toLowerCase()} in patients aged ${med.description?.minAge}-${med.description?.maxAge}.`;
        }
        return {
            medicineId: med.id,
            name: med.name,
            reason: reason,
        };
    });

    // Limit to 5 suggestions to keep the UI clean
    const limitedSuggestions = suggestions.slice(0, 5);

    return Promise.resolve({ suggestions: limitedSuggestions });
}
