import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStudioActions } from "@/context/StudioContext";
import { apiFetch } from "@/lib/api";

export function ImportButton({
  className,
  wrapperClassName,
  variant = "outline",
  size = "default",
  label = "Import screenshots",
  preferredDevice,
  onSuccess,
}: {
  className?: string;
  wrapperClassName?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
  preferredDevice?: string;
  onSuccess?: (count: number) => Promise<void> | void;
}) {
  const studioActions = useStudioActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (
    file: File,
  ): Promise<{ name: string; dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        }, 1000);

        img.onload = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              name: file.name,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        };
        img.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ name: file.name, dataUrl, width: 0, height: 0 });
          }
        };
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const filePayloads = await Promise.all(
        Array.from(files).map((file) => readFileAsDataUrl(file)),
      );

      const response = await apiFetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: filePayloads,
          preferredDevice,
          targetMode: "all",
          autoRoute: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      const resData = (await response.json().catch(() => ({}))) as {
        imported?: number;
        targetDevice?: string;
      };
      const count = resData.imported || filePayloads.length;
      const toastMsg = `✨ Successfully imported ${count} screenshot(s)!`;
      if (onSuccess) {
        await onSuccess(count);
      } else if (studioActions) {
        studioActions.toast(toastMsg);
        await studioActions.refresh();
      } else {
        window.dispatchEvent(new CustomEvent("appassets:refresh", { detail: { toast: toastMsg } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import images");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={wrapperClassName ?? "flex flex-col gap-1.5 w-full"}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? (
          <>
            <Loader2Icon className="animate-spin" />
            Importing images…
          </>
        ) : (
          <>
            <ImagePlusIcon />
            {label}
          </>
        )}
      </Button>
      {error ? <p className="text-[11px] text-destructive text-center">{error}</p> : null}
    </div>
  );
}
