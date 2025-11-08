import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, genkit-api-key, x-genkit-dev-api-key',
};

// A plugin to add CORS headers to all Genkit API responses.
// This is required for the client to be able to call the API.
const corsPlugin: Plugin = {
  name: 'cors',
  onFlow: async (flow, next) => {
    const result = await next(flow);
    result.responseHeaders = {...result.responseHeaders, ...corsHeaders};
    return result;
  },
};

function genkitCorsPlugin(): Plugin {
  return corsPlugin;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
    genkitCorsPlugin,
  ],
  // Log developer-friendly errors to the console.
  devLogger: 'genkit',
});
