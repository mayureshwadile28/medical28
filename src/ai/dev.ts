import { config } from 'dotenv';
config();

// This will load all files in the flows directory, making them available in the dev UI.
import './flows/scan-bill';
