'use server';
import {genkit, ai} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// This file is configured to work with Genkit and the Google AI plugin.
// The AI bill scanner will not work in a fully offline app, as it requires
// access to Google's generative models. The medicine suggestion feature will
// continue to work as it operates on local data.

genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});

export {ai};
