import { ImagePlusIcon, Loader2Icon } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ImportButton({
  className,
  variant = "outline",
  size = "lg",
  label = "Import screenshots",
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<{ name: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
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

      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: filePayloads }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      // Reload page to reflect imported screenshots in Studio
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import images");
      setLoading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
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
