import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function BootstrapError({ error }: { error: unknown }) {
  const isNoHomeserver =
    error instanceof Error && error.message.includes("No homeserver URL");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isNoHomeserver ? "Homeserver not configured" : "Startup error"}
          </CardTitle>
          <CardDescription>
            {isNoHomeserver
              ? "The app needs a Matrix homeserver URL before it can start."
              : "The app failed to start. Check the browser console for details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isNoHomeserver ? (
            <>
              <p className="text-sm text-muted-foreground">
                Set the homeserver URL in one of the following ways:
              </p>
              <ol className="flex list-decimal flex-col gap-3 pl-4 text-sm">
                <li>
                  <span className="font-medium">Build-time env var</span> — add to{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>:
                  <pre className="mt-1.5 rounded bg-muted px-3 py-2 text-xs leading-5">
                    VITE_MATRIX_HOMESERVER_URL=https://matrix.org
                  </pre>
                </li>
                <li>
                  <span className="font-medium">Runtime config</span> — create{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">public/config.json</code>:
                  <pre className="mt-1.5 rounded bg-muted px-3 py-2 text-xs leading-5">
                    {`{ "homeserver_url": "https://matrix.org" }`}
                  </pre>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Restart <code className="rounded bg-muted px-1 py-0.5">pnpm dev</code> after
                setting the env var.
              </p>
            </>
          ) : (
            <pre className="overflow-auto rounded bg-muted px-3 py-2 text-xs text-destructive">
              {String(error instanceof Error ? error.message : error)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
