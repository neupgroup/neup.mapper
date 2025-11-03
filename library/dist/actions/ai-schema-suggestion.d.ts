import { z } from 'genkit';
export declare const AISchemaSuggestionInputSchema: z.ZodObject<{
    dataDescription: z.ZodString;
    databaseType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dataDescription: string;
    databaseType: string;
}, {
    dataDescription: string;
    databaseType: string;
}>;
export type AISchemaSuggestionInput = z.infer<typeof AISchemaSuggestionInputSchema>;
export declare const AISchemaSuggestionOutputSchema: z.ZodObject<{
    suggestedSchema: z.ZodString;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    suggestedSchema: string;
    rationale: string;
}, {
    suggestedSchema: string;
    rationale: string;
}>;
export type AISchemaSuggestionOutput = z.infer<typeof AISchemaSuggestionOutputSchema>;
export declare function createSuggestSchema(ai: any): (input: AISchemaSuggestionInput) => Promise<any>;
