import { Upload, FileImage, Zap, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<any>;
}

export const UploadZone = ({ onUpload }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setLastResult(null);
    try {
      const result = await onUpload(file);
      setLastResult(result?.data);
      toast({ title: "Rechnung gescannt", description: `${result?.data?.vendor_name || "Unbekannt"} – €${result?.data?.gross_amount?.toFixed(2) || "?"}` });
    } catch (err: any) {
      toast({ title: "Fehler beim Scannen", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display font-semibold text-card-foreground">Rechnung hochladen</h3>
        <p className="text-xs text-muted-foreground mt-0.5">PDF, Foto oder Scan – KI liest automatisch aus</p>
      </div>

      <div className="p-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
            isUploading && "pointer-events-none opacity-70",
            isDragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border hover:border-accent/50 hover:bg-muted/30"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-sm font-medium text-card-foreground">KI analysiert Rechnung...</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">Dateien hierher ziehen</p>
                <p className="text-xs text-muted-foreground mt-1">
                  oder <span className="text-accent font-medium">durchsuchen</span>
                </p>
              </div>
            </>
          )}
        </div>

        {lastResult && (
          <div className="mt-4 rounded-lg bg-success/5 border border-success/20 p-3 space-y-1">
            <div className="flex items-center gap-2 text-success text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Erfolgreich erkannt
            </div>
            <p className="text-xs text-card-foreground">
              <strong>{lastResult.vendor_name}</strong> · €{lastResult.gross_amount?.toFixed(2)} brutto · {lastResult.vat_category} USt
            </p>
            {lastResult.missing_requirements?.length > 0 && (
              <p className="text-xs text-warning">
                ⚠ Fehlende Pflichtangaben: {lastResult.missing_requirements.join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileImage className="h-3.5 w-3.5" />
            <span>PDF, JPG, PNG bis 10 MB</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span>KI-OCR mit §11 UStG Prüfung</span>
          </div>
        </div>
      </div>
    </div>
  );
};
