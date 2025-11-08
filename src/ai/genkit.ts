import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',
    }),
  ],
  // Log developer-friendly errors to the console.
  // This also automatically configures CORS for local development.
  devLogger: 'genkit',
});
