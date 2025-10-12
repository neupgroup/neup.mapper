"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Wand2 } from "lucide-react";
import {
  suggestOperation,
  type AIOperationSuggestionOutput,
} from "@/actions/ai-operation-suggestion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Terminal } from "lucide-react";

const formSchema = z.object({
  operationDescription: z.string().min(10, {
    message: "Please provide a more detailed description (at least 10 characters).",
  }),
});

export function AIOperationForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIOperationSuggestionOutput | null>(null);
  const [dbConfig, setDbConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("dbConfig");
      if (savedConfig) {
        setDbConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error("Failed to load configuration from local storage", error);
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operationDescription: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!dbConfig) {
        toast({
            variant: "destructive",
            title: "Database not configured",
            description: "Please configure your database connection on the 'Configure' page first.",
        });
        return;
    }

    setLoading(true);
    setResult(null);
    try {
      // For this step, we'll need a schema. Let's try to get it from the schema-builder page, or use a placeholder.
      // A more advanced version would fetch the schema generated in the first step.
      const schemaResult = localStorage.getItem("lastSchema");
      const schema = schemaResult
        ? JSON.parse(schemaResult).suggestedSchema
        : "{}";

      const suggestion = await suggestOperation({
        ...values,
        databaseType: dbConfig.dbType,
        schema: schema,
      });
      setResult(suggestion);
    } catch (error) {
      console.error("Error getting operation suggestion:", error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to get operation suggestion. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {!dbConfig && (
         <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Database Not Configured</AlertTitle>
            <AlertDescription>
              Please go to the <a href="/configure" className="font-bold underline">Configure</a> page to set up your database connection first.
            </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Operation</CardTitle>
          <CardDescription>
            Provide a clear description of the database operation you want to perform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="operationDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operation Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Insert a new user with a name and email', 'Find all users who registered in the last 7 days', or 'Update a product price by its ID'"
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading || !dbConfig} className="w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Wand2 />
                )}
                <span>{loading ? "Generating..." : "Suggest Operation"}</span>
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
            <CardTitle>Suggested Code</CardTitle>
            <CardDescription>
              Here is the AI-generated code based on your description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code">
              <TabsList className="grid w-full grid-cols-2 sm:w-96">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="Rationale">Rationale</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="mt-4">
                <div className="rounded-lg border bg-card-foreground/5">
                  <pre className="overflow-x-auto p-4 text-sm text-card-foreground font-code">
                    <code>{result.suggestedCode}</code>
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="Rationale" className="mt-4">
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
