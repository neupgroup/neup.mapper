"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function ConfigureDBForm() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
          <CardDescription>
            Configure a data connection for this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Form temporarily unavailable while resolving a build error.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

