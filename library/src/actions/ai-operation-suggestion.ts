import { z } from 'genkit';

export const AIOperationSuggestionInputSchema = z.object({
  operationDescription: z
    .string()
    .describe('A detailed description of the operation to be performed.'),
  databaseType: z
    .string()
    .describe('The type of database (e.g., MongoDB, Firestore, SQL).'),
  schema: z.string().describe('The JSON schema of the data structure.'),
});
export type AIOperationSuggestionInput = z.infer<typeof AIOperationSuggestionInputSchema>;

export const AIOperationSuggestionOutputSchema = z.object({
  suggestedCode: z
    .string()
    .describe('The suggested code for the operation, as a string.'),
  rationale: z
    .string()
    .describe('Explanation of why the suggested code is optimal.'),
});
export type AIOperationSuggestionOutput = z.infer<typeof AIOperationSuggestionOutputSchema>;

export function createSuggestOperation(ai: any) {
  const aiOperationSuggestionPrompt = ai.definePrompt({
    name: 'aiOperationSuggestionPrompt',
    input: { schema: AIOperationSuggestionInputSchema },
    output: { schema: AIOperationSuggestionOutputSchema },
    prompt: `You are an expert database engineer. Given a description of a database operation, a database type, and a data schema, you will generate the code to perform that operation. The operation can be for inserting, fetching, or updating data.

Operation Description: {{{operationDescription}}}
Database Type: {{{databaseType}}}
Schema: {{{schema}}}

Generate the code for the specified database type. Provide a rationale for the generated code.

Return the suggested code as a string, and include the rationale.
`,
  });

  const aiOperationSuggestionFlow = ai.defineFlow(
    {
      name: 'aiOperationSuggestionFlow',
      inputSchema: AIOperationSuggestionInputSchema,
      outputSchema: AIOperationSuggestionOutputSchema,
    },
    async (input: AIOperationSuggestionInput) => {
      const { output } = await aiOperationSuggestionPrompt(input);
      return output!;
    }
  );

  return async function suggestOperation(input: AIOperationSuggestionInput) {
    return aiOperationSuggestionFlow(input);
  };
}

