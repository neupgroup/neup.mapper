import { z } from 'genkit';
export declare const AIOperationSuggestionInputSchema: z.ZodObject<{
    operationDescription: z.ZodString;
    databaseType: z.ZodString;
    schema: z.ZodString;
}, "strip", z.ZodTypeAny, {
    databaseType: string;
    operationDescription: string;
    schema: string;
}, {
    databaseType: string;
    operationDescription: string;
    schema: string;
}>;
export type AIOperationSuggestionInput = z.infer<typeof AIOperationSuggestionInputSchema>;
export declare const AIOperationSuggestionOutputSchema: z.ZodObject<{
    suggestedCode: z.ZodString;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rationale: string;
    suggestedCode: string;
}, {
    rationale: string;
    suggestedCode: string;
}>;
export type AIOperationSuggestionOutput = z.infer<typeof AIOperationSuggestionOutputSchema>;
export declare function createSuggestOperation(ai: any): (input: AIOperationSuggestionInput) => Promise<any>;
