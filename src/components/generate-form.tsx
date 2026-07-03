"use client";

import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-11 shrink-0">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        "Generate"
      )}
    </Button>
  );
}

export function GenerateForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex gap-2 max-w-md mx-auto">
      <Input
        name="destination"
        placeholder="e.g. Kyoto, Japan"
        required
        className="h-11 bg-card/60 backdrop-blur-sm border-border/60
                   focus-visible:ring-primary/40"
      />
      <SubmitButton />
    </form>
  );
}