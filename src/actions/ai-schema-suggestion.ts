'use server';

import { ai } from '@/ai/genkit';
import {
  createSuggestSchema,
  AISchemaSuggestionInput,
  AISchemaSuggestionOutput,
} from '@neupgroup/mapper';

export const suggestSchema = createSuggestSchema(ai);
