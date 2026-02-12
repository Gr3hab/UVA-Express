import { Upload, FileImage, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const UploadZone = () => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display font-semibold text-card-foreground">Rechnung hochladen</h3>
        <p className="text-xs text-muted-foreground mt-0.5">PDF, Foto oder Scan</p>
      </div>

      <div className="p-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
            isDragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border hover:border-accent/50 hover:bg-muted/30"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Upload className="h-6 w-6 text-accent" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-card-foreground">
              Dateien hierher ziehen
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              oder <span className="text-accent font-medium cursor-pointer">durchsuchen</span>
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileImage className="h-3.5 w-3.5" />
            <span>PDF, JPG, PNG bis 10 MB</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span>Automatische OCR-Erkennung</span>
          </div>
        </div>
      </div>
    </div>
  );
};
