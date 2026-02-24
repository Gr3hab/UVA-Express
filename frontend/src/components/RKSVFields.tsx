import React, { useState } from "react";
import { QrCode, AlertTriangle, CheckCircle2, Search, Loader2 } from "lucide-react";
import type { RKSVValidationResult, ValidationIssue } from "@/hooks/useUVAEngine";

interface RKSVFieldsProps {
  kassenid: string;
  belegnr: string;
  qrData: string;
  isReceipt: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onValidate?: () => void;
  validationResult?: RKSVValidationResult | null;
  loading?: boolean;
  readOnly?: boolean;
}

export const RKSVFields: React.FC<RKSVFieldsProps> = ({
  kassenid, belegnr, qrData, isReceipt, onChange,
  onValidate, validationResult, loading, readOnly,
}) => {
  const [expanded, setExpanded] = useState(isReceipt);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">RKSV-Belegdaten</span>
          {isReceipt && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">RKSV-Beleg</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* RKSV Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isReceipt}
              onChange={(e) => onChange("rksv_receipt", e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Dies ist ein RKSV-Beleg (Registrierkassenbeleg)</span>
          </label>

          {isReceipt && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kassen-ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Kassen-ID
                  </label>
                  <input
                    type="text"
                    value={kassenid}
                    onChange={(e) => onChange("rksv_kassenid", e.target.value)}
                    readOnly={readOnly}
                    placeholder="z.B. KASSE-001 oder UUID"
                    maxLength={36}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">Alphanumerisch, max. 36 Zeichen</p>
                </div>

                {/* Belegnummer */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Belegnummer
                  </label>
                  <input
                    type="text"
                    value={belegnr}
                    onChange={(e) => onChange("rksv_belegnr", e.target.value)}
                    readOnly={readOnly}
                    placeholder="z.B. 001 oder 2026/0001"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">Alphanumerisch, max. 20 Zeichen</p>
                </div>
              </div>

              {/* QR-Daten */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  QR-Code-Daten
                </label>
                <textarea
                  value={qrData}
                  onChange={(e) => onChange("rksv_qr_data", e.target.value)}
                  readOnly={readOnly}
                  placeholder="_R1-AT0_KASSE-001_001_2026-01-15T10:30:00_..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  RKSV-konformer QR-Code-String (beginnt mit _R1-AT)
                </p>
              </div>

              {/* Validate Button */}
              {onValidate && (
                <button
                  type="button"
                  onClick={onValidate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  RKSV-Daten prüfen
                </button>
              )}

              {/* Validation Results */}
              {validationResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  validationResult.valid
                    ? "bg-green-50 text-green-800 border border-green-100"
                    : "bg-red-50 text-red-800 border border-red-100"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.valid
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <span className="font-medium">
                      {validationResult.valid ? "RKSV-Daten valide" : "RKSV-Fehler gefunden"}
                    </span>
                  </div>
                  {validationResult.issues.length > 0 && (
                    <ul className="space-y-1 ml-6">
                      {validationResult.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className={`text-xs font-medium ${
                            issue.severity === "error" ? "text-red-600" :
                            issue.severity === "warning" ? "text-amber-600" : "text-blue-600"
                          }`}>
                            [{issue.code}]
                          </span>
                          <span className="text-xs">{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
