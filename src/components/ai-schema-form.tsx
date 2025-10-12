"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, Database, FileJson, Flame } from "lucide-react";
import {
  suggestSchema,
  type AISchemaSuggestionOutput,
} from "@/actions/ai-schema-suggestion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";

const formSchema = z.object({
  dataDescription: z.string().min(20, {
    message: "Please provide a more detailed description (at least 20 characters).",
  }),
  databaseType: z.enum(["MongoDB", "Firestore", "SQL"]),
});

const databaseOptions = [
  { value: "MongoDB", label: "MongoDB", icon: FileJson },
  { value: "Firestore", label: "Firestore", icon: Flame },
  { value: "SQL", label: "SQL", icon: Database },
] as const;

export function AISchemaForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AISchemaSuggestionOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataDescription: "",
      databaseType: "Firestore",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const suggestion = await suggestSchema(values);
      setResult(suggestion);
      // Save the last generated schema to local storage
      localStorage.setItem("lastSchema", JSON.stringify(suggestion));
    } catch (error) {
      console.error("Error getting schema suggestion:", error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get schema suggestion. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const formattedSchema = result?.suggestedSchema
    ? (() => {
        try {
          return JSON.stringify(JSON.parse(result.suggestedSchema), null, 2);
        } catch {
          return result.suggestedSchema;
        }
      })()
    : "";

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Data</CardTitle>
          <CardDescription>
            Provide a clear description of the data you want to store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="databaseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="Select a database type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {databaseOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <option.icon className="h-4 w-4 text-muted-foreground" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A collection of user profiles with name, email, and a list of posts. Each post has a title, content, and timestamps."
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Wand2 />
                )}
                <span>{loading ? "Generating..." : "Suggest Schema"}</span>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested Schema</CardTitle>
            <CardDescription>
              Here is the AI-generated schema based on your description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="schema">
              <TabsList className="grid w-full grid-cols-2 sm:w-96">
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="rationale">Rationale</TabsTrigger>
              </TabsList>
              <TabsContent value="schema" className="mt-4">
                <div className="rounded-lg border bg-card-foreground/5">
                  <pre className="overflow-x-auto p-4 text-sm text-card-foreground font-code">
                    <code>{formattedSchema}</code>
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="rationale" className="mt-4">
                <div className="prose prose-sm prose-invert max-w-none rounded-lg border bg-transparent p-4 text-sm">
                  <p>{result.rationale}</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
