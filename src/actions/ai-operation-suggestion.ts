'use server';

import { ai } from '@/ai/genkit';
import {
  createSuggestOperation,
  AIOperationSuggestionInput,
  AIOperationSuggestionOutput,
} from '@neupgroup/mapper';

export const suggestOperation = createSuggestOperation(ai);
