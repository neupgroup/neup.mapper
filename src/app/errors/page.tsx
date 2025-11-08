"use client";

import { useEffect, useState } from "react";
import { getErrorLogs, clearErrorLogs, type ErrorLogEntry } from "./logger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ErrorsPage() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);

  const refresh = () => {
    try {
      setLogs(getErrorLogs());
    } catch {}
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleClear = () => {
    clearErrorLogs();
    refresh();
  };

  return (
    <div className="space-y-8 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>Client-side errors captured in this browser session. Max 100 entries are kept.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 pb-4">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
            <Button variant="secondary" onClick={handleClear}>Clear All</Button>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.slice().reverse().map((log) => (
                <li key={log.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                    {log.route && <div className="font-mono text-xs">{log.route}</div>}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">{log.name || "Error"}:</span> {log.message}
                  </div>
                  {log.context && (
                    <div className="mt-1 text-xs text-muted-foreground">Context: {log.context}</div>
                  )}
                  {log.stack && (
                    <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs"><code>{log.stack}</code></pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

