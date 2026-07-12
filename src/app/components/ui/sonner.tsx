import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      offset={{ bottom: 76, right: 20 }}
      style={
        {
          "--normal-bg": "var(--color-lc-surface)",
          "--normal-text": "var(--color-lc-text)",
          "--normal-border": "var(--color-lc-border)",
          "--border-radius": "var(--radius)"
        } as CSSProperties
      }
      {...props}
    />
  );
}
