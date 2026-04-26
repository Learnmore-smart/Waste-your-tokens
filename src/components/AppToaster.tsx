"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      closeButton
      expand
      gap={10}
      toastOptions={{
        className:
          "font-[family-name:var(--font-outfit)] border border-border bg-surface text-foreground shadow-lg",
        duration: 6000,
      }}
    />
  );
}
