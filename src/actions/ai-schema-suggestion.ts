'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting optimal schema structures based on a description of the data and the chosen database.
 *
 * - suggestSchema - A function that takes a data description and database type as input and returns a schema suggestion.
 * - AISchemaSuggestionInput - The input type for the suggestSchema function.
 * - AISchemaSuggestionOutput - The return type for the suggestSchema function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISchemaSuggestionInputSchema = z.object({
  dataDescription: z
    .string()
    .describe('A detailed description of the data that the schema should represent.'),
  databaseType: z
    .string()
    .describe('The type of database for which the schema is being created (e.g., MongoDB, Firestore, SQL).'),
});
export type AISchemaSuggestionInput = z.infer<typeof AISchemaSuggestionInputSchema>;

const AISchemaSuggestionOutputSchema = z.object({
  suggestedSchema: z
    .string()
    .describe('The suggested schema structure, formatted as a JSON string, tailored for the specified database type.'),
  rationale: z
    .string()
    .describe('Explanation of why the suggested schema is optimal for the given data description and database type.'),
});
export type AISchemaSuggestionOutput = z.infer<typeof AISchemaSuggestionOutputSchema>;

export async function suggestSchema(input: AISchemaSuggestionInput): Promise<AISchemaSuggestionOutput> {
  return aiSchemaSuggestionFlow(input);
}

const aiSchemaSuggestionPrompt = ai.definePrompt({
  name: 'aiSchemaSuggestionPrompt',
  input: {schema: AISchemaSuggestionInputSchema},
  output: {schema: AISchemaSuggestionOutputSchema},
  prompt: `You are an expert database architect. Given a description of data and a database type, you will suggest an optimal schema structure.

Data Description: {{{dataDescription}}}
Database Type: {{{databaseType}}}

Consider the characteristics and constraints of the specified database type when formulating the schema.

Return the suggested schema as a JSON string, and include a rationale explaining why the schema is optimal.

Ensure that the suggested schema is valid and can be directly used with the specified database.
`,
});

const aiSchemaSuggestionFlow = ai.defineFlow(
  {
    name: 'aiSchemaSuggestionFlow',
    inputSchema: AISchemaSuggestionInputSchema,
    outputSchema: AISchemaSuggestionOutputSchema,
  },
  async input => {
    const {output} = await aiSchemaSuggestionPrompt(input);
    return output!;
  }
);
