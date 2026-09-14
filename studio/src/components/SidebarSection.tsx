import { ChevronDown, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SidebarSection({
  id,
  icon: Icon,
  title,
  summary,
  defaultOpen = true,
  children,
  className,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const storageKey = `appassets_sidebar_section_${id}`;
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const saved =
        localStorage.getItem(storageKey) ?? localStorage.getItem(`goldie_sidebar_section_${id}`);
      return saved !== null ? saved === "true" : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(isOpen));
    } catch {
      // Ignore localStorage errors
    }
  }, [isOpen, storageKey]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-2xs transition-all duration-200",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </div>
          <span className="truncate text-xs font-semibold tracking-tight text-foreground">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {summary && !isOpen && (
            <span className="truncate max-w-[110px] rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {summary}
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/50 px-3.5 py-3.5 space-y-4 animate-in fade-in-50 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}
