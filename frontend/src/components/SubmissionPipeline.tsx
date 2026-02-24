import React, { useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, FileText,
  ArrowRight, Loader2, Send, Download, Eye, Shield, AlertOctagon
} from "lucide-react";
import type { SubmissionPrepareResult, SubmissionChecklistItem } from "@/hooks/useUVAEngine";

interface SubmissionPipelineProps {
  result: SubmissionPrepareResult | null;
  onPrepare: () => void;
  onExportXML: () => void;
  onConfirm: (reference?: string, note?: string) => void;
  onPreviewXML: () => void;
  loading: boolean;
  year: number;
  month: number;
  xmlPreview?: string | null;
}

const V1_DISCLAIMER = "V1/Pilotbetrieb – Automatisierte Vorverarbeitung. Prüfung und Freigabe durch den Nutzer ist Pflicht. Keine Steuerberatung.";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  entwurf: { label: "Entwurf", color: "bg-gray-100 text-gray-700 border-gray-200" },
  berechnet: { label: "Berechnet", color: "bg-blue-100 text-blue-700 border-blue-200" },
  validiert: { label: "Validiert", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  freigegeben: { label: "Freigegeben", color: "bg-amber-100 text-amber-700 border-amber-200" },
  eingereicht: { label: "Eingereicht", color: "bg-purple-100 text-purple-700 border-purple-200" },
  bestaetigt: { label: "Bestätigt", color: "bg-green-100 text-green-800 border-green-200" },
  fehler: { label: "Fehler", color: "bg-red-100 text-red-700 border-red-200" },
};

const STATUS_ORDER = ["entwurf", "berechnet", "validiert", "freigegeben", "eingereicht", "bestaetigt"];

const ChecklistIcon = ({ item }: { item: SubmissionChecklistItem }) => {
  if (item.passed) return <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (item.severity === "error") return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
  if (item.severity === "warning") return <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
  return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
};

export const SubmissionPipeline: React.FC<SubmissionPipelineProps> = ({
  result, onPrepare, onExportXML, onConfirm, onPreviewXML,
  loading, year, month, xmlPreview,
}) => {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);

  const currentStatusIdx = result ? STATUS_ORDER.indexOf(result.current_status) : 0;

  return (
    <div className="space-y-6">
      {/* V1 Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Hinweis: {V1_DISCLAIMER}</p>
          <p className="text-xs text-amber-700 mt-1">
            Die UVA-Berechnung dient als Arbeitshilfe. Die finale Verantwortung für die Richtigkeit
            der Angaben liegt beim Steuerpflichtigen bzw. dessen steuerlichen Vertreter.
            Alle Werte müssen vor der Einreichung bei FinanzOnline geprüft und freigegeben werden.
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Einreichungspipeline – {String(month).padStart(2, "0")}/{year}
        </h3>

        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_ORDER.map((status, idx) => {
            const info = STATUS_LABELS[status];
            const isCurrent = result?.current_status === status;
            const isPast = idx < currentStatusIdx;
            const isFuture = idx > currentStatusIdx;

            return (
              <React.Fragment key={status}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? info.color + " ring-2 ring-offset-1 ring-blue-400"
                      : isPast
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-400 border-gray-100"
                  }`}
                >
                  {isPast && <CheckCircle2 className="w-4 h-4" />}
                  {info.label}
                </div>
                {idx < STATUS_ORDER.length - 1 && (
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isFuture ? "text-gray-200" : "text-gray-400"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {result?.due_date && (
          <p className="mt-3 text-sm text-gray-500">
            Fälligkeitsdatum: <span className="font-medium text-gray-700">{result.due_date}</span>
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onPrepare}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Einreichung prüfen
        </button>

        {result && !result.ready && (
          <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-4 py-2.5 rounded-lg border border-amber-100">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            {result.blocking_issues} blockierende(r) Fehler
          </div>
        )}

        {result?.ready && (
          <>
            <button
              onClick={() => { onPreviewXML(); setShowXmlPreview(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              <Eye className="w-4 h-4" /> XML-Vorschau
            </button>
            <button
              onClick={onExportXML}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" /> XML herunterladen
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
            >
              <Send className="w-4 h-4" /> Als eingereicht markieren
            </button>
          </>
        )}
      </div>

      {/* Checklist */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Prüfliste
          </h4>
          <div className="space-y-3">
            {result.checklist.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  item.passed
                    ? "bg-green-50/50"
                    : item.severity === "error"
                    ? "bg-red-50/50"
                    : "bg-amber-50/50"
                }`}
              >
                <ChecklistIcon item={item} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.passed ? "text-green-800" : item.severity === "error" ? "text-red-800" : "text-amber-800"}`}>
                    {item.label}
                  </p>
                  {item.details && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XML Preview Modal */}
      {showXmlPreview && xmlPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                XML-Vorschau – UVA {String(month).padStart(2, "0")}/{year}
              </h3>
              <button onClick={() => setShowXmlPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono bg-gray-50 text-gray-800 whitespace-pre-wrap">
              {xmlPreview}
            </pre>
          </div>
        </div>
      )}

      {/* Confirm Submission Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Einreichung bestätigen
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              UVA {String(month).padStart(2, "0")}/{year} als bei FinanzOnline eingereicht markieren.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700">FinanzOnline-Referenznummer (optional)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. FO-2026-001234"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Anmerkung (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="z.B. Eingereicht am 15.03.2026"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  onConfirm(reference || undefined, note || undefined);
                  setShowConfirm(false);
                  setReference("");
                  setNote("");
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
