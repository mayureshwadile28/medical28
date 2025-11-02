'use server';
import {genkit, ai} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});

export {ai};
