/**
 * useUVAEngine – Hook for the FastAPI UVA Backend Engine
 * ═══════════════════════════════════════════════════════
 *
 * Connects to the FastAPI backend for:
 * - UVA calculation
 * - BMF validation
 * - XML export
 * - RKSV validation
 * - Submission pipeline
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || "";

// ─── Types ───────────────────────────────────────────

export interface InvoiceForEngine {
  id: string;
  invoice_number?: string;
  invoice_date?: string;
  vendor_name?: string;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  gross_amount: number;
  invoice_type: "eingang" | "ausgang";
  tax_treatment: string;
  reverse_charge?: boolean;
  ig_erwerb?: boolean;
  ig_lieferung?: boolean;
  export_delivery?: boolean;
  currency?: string;
  description?: string;
  rksv_receipt?: boolean;
  rksv_kassenid?: string;
  rksv_belegnr?: string;
  rksv_qr_data?: string;
}

export interface KZValues {
  [key: string]: number;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  field?: string;
  invoice_id?: string;
  kz?: string;
}

export interface UVASummary {
  invoice_count: number;
  ausgang_count: number;
  eingang_count: number;
  ig_count: number;
  rc_count: number;
  export_count: number;
  rksv_count: number;
  skipped_count: number;
  summe_ust: number;
  summe_steuerschuld: number;
  summe_ig_ust: number;
  gesamt_ust: number;
  summe_vorsteuer: number;
  zahllast: number;
  due_date?: string;
}

export interface ProcessingDetail {
  invoice_id: string;
  invoice_number?: string;
  mapped_to_kz: string[];
  net_amount: number;
  vat_amount: number;
  tax_treatment: string;
  invoice_type: string;
}

export interface UVACalculationResult {
  success: boolean;
  kz_values: KZValues;
  summary: UVASummary;
  warnings: ValidationIssue[];
  processing_details: ProcessingDetail[];
  calculation_timestamp: string;
}

export interface UVAValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  bmf_plausibility_passed: boolean;
  kz095_recalculated: number;
  kz095_matches: boolean;
}

export interface SubmissionChecklistItem {
  label: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  details?: string;
}

export interface SubmissionPrepareResult {
  ready: boolean;
  current_status: string;
  next_status?: string;
  checklist: SubmissionChecklistItem[];
  blocking_issues: number;
  warnings: number;
  xml_preview?: string;
  due_date?: string;
}

export interface RKSVValidationResult {
  valid: boolean;
  total_receipts: number;
  valid_receipts: number;
  invalid_receipts: number;
  issues: ValidationIssue[];
}

export interface KZInfo {
  kz: string;
  label: string;
  section: string;
  paragraph?: string;
  has_netto: boolean;
  has_ust: boolean;
  has_vorsteuer: boolean;
  has_betrag: boolean;
  rate?: number;
}

// ─── Hook ────────────────────────────────────────────

export const useUVAEngine = () => {
  const [loading, setLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState<UVACalculationResult | null>(null);
  const [validationResult, setValidationResult] = useState<UVAValidationResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionPrepareResult | null>(null);
  const [rksvResult, setRksvResult] = useState<RKSVValidationResult | null>(null);
  const { toast } = useToast();

  const apiCall = useCallback(async (path: string, body?: any, method = "POST") => {
    const url = `${BACKEND_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unbekannter Fehler");
      throw new Error(`API-Fehler ${res.status}: ${errText}`);
    }
    return res;
  }, []);

  // ── Calculate UVA ──
  const calculateUVA = useCallback(async (
    invoices: InvoiceForEngine[],
    year: number,
    month: number,
    sonstige_berichtigungen = 0
  ): Promise<UVACalculationResult | null> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/uva/calculate", {
        invoices,
        year,
        month,
        sonstige_berichtigungen,
      });
      const data: UVACalculationResult = await res.json();
      setCalculationResult(data);

      if (data.warnings.length > 0) {
        toast({
          title: "Berechnung abgeschlossen",
          description: `${data.warnings.length} Hinweis(e) gefunden`,
          variant: "default",
        });
      } else {
        toast({
          title: "UVA berechnet",
          description: `KZ 095: ${data.summary.zahllast.toFixed(2)} EUR`,
        });
      }
      return data;
    } catch (err: any) {
      toast({
        title: "Berechnungsfehler",
        description: err.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Validate UVA ──
  const validateUVA = useCallback(async (
    kzValues: KZValues,
    year: number,
    month: number,
    invoices?: InvoiceForEngine[]
  ): Promise<UVAValidationResult | null> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/uva/validate", {
        kz_values: kzValues,
        year,
        month,
        invoices: invoices || null,
      });
      const data: UVAValidationResult = await res.json();
      setValidationResult(data);

      if (data.valid) {
        toast({ title: "Validierung bestanden", description: "BMF-Plausibilitätsprüfung OK" });
      } else {
        toast({
          title: "Validierung fehlgeschlagen",
          description: `${data.errors.length} Fehler gefunden`,
          variant: "destructive",
        });
      }
      return data;
    } catch (err: any) {
      toast({ title: "Validierungsfehler", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Export XML (download) ──
  const exportXML = useCallback(async (
    kzValues: KZValues,
    steuernummer: string,
    year: number,
    month: number,
    unternehmenName?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/uva/export-xml", {
        kz_values: kzValues,
        steuernummer,
        year,
        month,
        unternehmen_name: unternehmenName,
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("xml")) {
        const blob = await res.blob();
        const filename = `UVA_${year}_${String(month).padStart(2, "0")}.xml`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "XML exportiert", description: filename });
        return true;
      } else {
        // JSON error response
        const data = await res.json();
        toast({
          title: "Export fehlgeschlagen",
          description: data.validation_issues?.map((i: any) => i.message).join(", ") || "Unbekannter Fehler",
          variant: "destructive",
        });
        return false;
      }
    } catch (err: any) {
      toast({ title: "Exportfehler", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Export XML (JSON response for preview) ──
  const exportXMLPreview = useCallback(async (
    kzValues: KZValues,
    steuernummer: string,
    year: number,
    month: number
  ): Promise<string | null> => {
    try {
      const res = await apiCall("/api/uva/export-xml-json", {
        kz_values: kzValues,
        steuernummer,
        year,
        month,
      });
      const data = await res.json();
      return data.success ? data.xml_content : null;
    } catch {
      return null;
    }
  }, [apiCall]);

  // ── RKSV Validate ──
  const validateRKSV = useCallback(async (
    receipts: Array<{
      rksv_kassenid?: string;
      rksv_belegnr?: string;
      rksv_qr_data?: string;
      rksv_receipt?: boolean;
      betrag?: number;
      datum?: string;
    }>
  ): Promise<RKSVValidationResult | null> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/rksv/validate", { receipts });
      const data: RKSVValidationResult = await res.json();
      setRksvResult(data);
      return data;
    } catch (err: any) {
      toast({ title: "RKSV-Fehler", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Prepare Submission ──
  const prepareSubmission = useCallback(async (
    kzValues: KZValues,
    year: number,
    month: number,
    steuernummer: string,
    invoices?: InvoiceForEngine[]
  ): Promise<SubmissionPrepareResult | null> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/uva/submission/prepare", {
        kz_values: kzValues,
        year,
        month,
        steuernummer,
        invoices: invoices || null,
      });
      const data: SubmissionPrepareResult = await res.json();
      setSubmissionResult(data);
      return data;
    } catch (err: any) {
      toast({ title: "Pipeline-Fehler", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Confirm Submission ──
  const confirmSubmission = useCallback(async (
    year: number,
    month: number,
    reference?: string,
    note?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await apiCall("/api/uva/submission/confirm", {
        year,
        month,
        finanzonline_reference: reference,
        confirmation_note: note,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Einreichung bestätigt", description: data.message });
      }
      return data.success;
    } catch (err: any) {
      toast({ title: "Bestätigungsfehler", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiCall, toast]);

  // ── Get KZ Info ──
  const getKZInfo = useCallback(async (): Promise<KZInfo[]> => {
    try {
      const res = await apiCall("/api/uva/kz-info", undefined, "GET");
      return await res.json();
    } catch {
      return [];
    }
  }, [apiCall]);

  return {
    loading,
    calculationResult,
    validationResult,
    submissionResult,
    rksvResult,
    calculateUVA,
    validateUVA,
    exportXML,
    exportXMLPreview,
    validateRKSV,
    prepareSubmission,
    confirmSubmission,
    getKZInfo,
  };
};
