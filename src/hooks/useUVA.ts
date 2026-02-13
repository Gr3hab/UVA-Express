import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UVAPeriodData {
  id?: string;
  period_year: number;
  period_month: number;
  status: string;
  // Steuerpflichtige Umsätze
  kz022_netto: number; kz022_ust: number;
  kz029_netto: number; kz029_ust: number;
  kz006_netto: number; kz006_ust: number;
  kz037_netto: number; kz037_ust: number;
  // Steuerfreie mit Vorsteuerabzug
  kz011_netto: number; kz012_netto: number; kz015_netto: number;
  kz017_netto: number; kz018_netto: number;
  // Steuerfreie ohne Vorsteuerabzug
  kz019_netto: number; kz016_netto: number; kz020_netto: number;
  // Weiters zu versteuern
  kz056_ust: number; kz057_ust: number; kz048_ust: number;
  kz044_ust: number; kz032_ust: number;
  // IG Erwerbe
  kz070_netto: number; kz072_netto: number; kz072_ust: number;
  kz073_netto: number; kz073_ust: number;
  kz008_netto: number; kz008_ust: number;
  // Vorsteuer
  kz060_vorsteuer: number;
  kz061_vorsteuer: number; kz083_vorsteuer: number;
  kz065_vorsteuer: number; kz066_vorsteuer: number;
  kz082_vorsteuer: number; kz087_vorsteuer: number;
  kz089_vorsteuer: number; kz064_vorsteuer: number;
  kz062_vorsteuer: number; kz063_vorsteuer: number;
  kz067_vorsteuer: number;
  // Sonstige
  kz090_betrag: number;
  kz095_betrag: number;
  zahllast: number;
  due_date: string | null;
  [key: string]: any;
}

export const useUVA = () => {
  const [periods, setPeriods] = useState<UVAPeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchPeriods = async () => {
    const { data, error } = await supabase
      .from("uva_periods")
      .select("*")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    if (!error && data) {
      setPeriods(data as unknown as UVAPeriodData[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPeriods(); }, []);

  const calculateUVA = async (year: number, month: number) => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-uva", {
        body: { year, month },
      });
      if (error) throw error;
      await fetchPeriods();
      return data;
    } finally {
      setCalculating(false);
    }
  };

  const exportXML = async (year: number, month: number, steuernummer: string) => {
    setExporting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-uva-xml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ year, month, steuernummer }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Export fehlgeschlagen");
      }

      const xml = await response.text();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `UVA_${year}_${String(month).padStart(2, "0")}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return { periods, loading, calculating, exporting, calculateUVA, exportXML, refetch: fetchPeriods };
};
