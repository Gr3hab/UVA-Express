import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, Shield } from "lucide-react";
import type { UVAValidationResult, ValidationIssue } from "@/hooks/useUVAEngine";

interface UVAValidationResultsProps {
  result: UVAValidationResult | null;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "error": return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
    case "info": return <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    default: return null;
  }
};

const IssueRow = ({ issue }: { issue: ValidationIssue }) => (
  <div className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm ${
    issue.severity === "error" ? "bg-red-50" :
    issue.severity === "warning" ? "bg-amber-50" : "bg-blue-50"
  }`}>
    <SeverityIcon severity={issue.severity} />
    <div className="flex-1 min-w-0">
      <span className={`font-medium ${
        issue.severity === "error" ? "text-red-800" :
        issue.severity === "warning" ? "text-amber-800" : "text-blue-800"
      }`}>
        {issue.kz ? `KZ ${issue.kz}: ` : ""}{issue.code}
      </span>
      <p className="text-gray-600 text-xs mt-0.5">{issue.message}</p>
    </div>
  </div>
);

export const UVAValidationResults: React.FC<UVAValidationResultsProps> = ({ result }) => {
  if (!result) return null;

  const totalIssues = result.errors.length + result.warnings.length + result.infos.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          BMF-Validierung
        </h3>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          result.valid
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}>
          {result.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {result.valid ? "Bestanden" : "Fehlgeschlagen"}
        </div>
      </div>

      {/* KZ 095 Check */}
      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
        result.kz095_matches ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}>
        {result.kz095_matches ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        <span className="font-medium">KZ 095 Konsistenz:</span>
        <span>Neuberechnung = {result.kz095_recalculated.toFixed(2)} EUR</span>
      </div>

      {/* Summary */}
      {totalIssues === 0 ? (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          Keine Probleme gefunden. BMF-Plausibilitätsprüfung bestanden.
        </p>
      ) : (
        <div className="space-y-4">
          {result.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">
                Fehler ({result.errors.length})
              </h4>
              <div className="space-y-2">
                {result.errors.map((issue, idx) => <IssueRow key={`e-${idx}`} issue={issue} />)}
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                Warnungen ({result.warnings.length})
              </h4>
              <div className="space-y-2">
                {result.warnings.map((issue, idx) => <IssueRow key={`w-${idx}`} issue={issue} />)}
              </div>
            </div>
          )}

          {result.infos.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                Hinweise ({result.infos.length})
              </h4>
              <div className="space-y-2">
                {result.infos.map((issue, idx) => <IssueRow key={`i-${idx}`} issue={issue} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
