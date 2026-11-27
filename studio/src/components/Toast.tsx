import { X } from "lucide-react";
import { memo, useEffect, useState } from "react";

/** Bottom-center notice with auto-dismiss and manual close. */
export const Toast = memo(function Toast({
  message,
  onDismiss,
  duration = 3500,
}: {
  message: string;
  onDismiss?: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const isSuccess =
    message.includes("✨") ||
    message.toLowerCase().includes("success") ||
    message.toLowerCase().includes("imported");
  const isError =
    message.toLowerCase().includes("could not") ||
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("error");

  const styleClass = isSuccess
    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-background/95 shadow-emerald-500/10"
    : isError
      ? "border-destructive/40 text-destructive bg-background/95 shadow-destructive/10"
      : "border-border text-foreground bg-background/95";

  return (
    <output
      className={`animate-in fade-in slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border backdrop-blur-md px-4 py-2.5 text-xs font-semibold shadow-xl duration-200 flex items-center gap-3 ${styleClass}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="size-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <X className="size-3" />
      </button>
    </output>
  );
});
