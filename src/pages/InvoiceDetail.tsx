import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice, InvoiceType, TaxTreatment } from "@/types/invoice";
import { toast } from "sonner";

const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: "eingang", label: "Eingangsrechnung" },
  { value: "ausgang", label: "Ausgangsrechnung" },
];

const TAX_TREATMENTS: { value: TaxTreatment; label: string }[] = [
  { value: "normal", label: "Normal besteuert" },
  { value: "export", label: "Ausfuhrtaxierung" },
  { value: "ig_lieferung", label: "Innergemeinschaftliche Lieferung" },
  { value: "lohnveredelung", label: "Lohnveredelung" },
  { value: "dreiecksgeschaeft", label: "Dreiecksgeschäft" },
  { value: "fahrzeug_ohne_uid", label: "Fahrzeug ohne UID" },
  { value: "ig_erwerb", label: "Innergemeinschaftlicher Erwerb" },
  { value: "reverse_charge_19_1", label: "Reverse Charge (§19(1))" },
  { value: "reverse_charge_19_1a", label: "Reverse Charge (§19(1a))" },
  { value: "reverse_charge_19_1b", label: "Reverse Charge (§19(1b))" },
  { value: "reverse_charge_19_1d", label: "Reverse Charge (§19(1d))" },
  { value: "reverse_charge_19_1_3_4", label: "Reverse Charge (§19(1) 3,4)" },
  { value: "einfuhr", label: "Einfuhr" },
  { value: "eust_abgabenkonto", label: "EUST-Abgabenkonto" },
  { value: "grundstueck", label: "Grundstück" },
  { value: "kleinunternehmer", label: "Kleinunternehmer" },
  { value: "steuerbefreit_sonstige", label: "Steuerfrei (Sonstige)" },
];

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    const fetchInvoice = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Rechnung konnte nicht geladen werden");
        navigate("/");
        return;
      }

      if (!data) {
        toast.error("Rechnung nicht gefunden");
        navigate("/");
        return;
      }

      setInvoice(data as Invoice);
      setFormData(data as Invoice);
      setLoading(false);
    };

    fetchInvoice();
  }, [id, user, authLoading, navigate]);

  const validatePflichtangaben = (): string[] => {
    const errors: string[] = [];
    const required = [
      { field: "vendor_name", label: "Lieferant/Rechnungssteller" },
      { field: "invoice_number", label: "Rechnungsnummer" },
      { field: "invoice_date", label: "Rechnungsdatum" },
      { field: "gross_amount", label: "Gesamtbetrag" },
      { field: "vat_amount", label: "USt-Betrag" },
    ];

    for (const { field, label } of required) {
      const value = formData[field as keyof Invoice];
      if (value === null || value === undefined || value === "") {
        errors.push(`${label} ist erforderlich (§11 UStG)`);
      }
    }

    return errors;
  };

  const handleInputChange = (field: keyof Invoice, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  const handleSave = async () => {
    const errors = validatePflichtangaben();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error("Bitte füllen Sie alle erforderlichen Felder aus");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          vendor_name: formData.vendor_name,
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          net_amount: formData.net_amount,
          vat_rate: formData.vat_rate,
          vat_amount: formData.vat_amount,
          gross_amount: formData.gross_amount,
          invoice_type: formData.invoice_type,
          tax_treatment: formData.tax_treatment,
          description: formData.description,
          reverse_charge: formData.reverse_charge,
          ig_erwerb: formData.ig_erwerb,
          export_delivery: formData.export_delivery,
          ig_lieferung: formData.ig_lieferung,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user?.id);

      if (error) throw error;

      setInvoice(prev => prev ? { ...prev, ...formData } : null);
      toast.success("Rechnung gespeichert");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Fehler beim Speichern der Rechnung");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user || !invoice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={signOut} userEmail={user.email} />

      <main className="ml-64 min-h-screen">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Rechnungsdetails</h1>
                <p className="text-sm text-muted-foreground">{invoice.vendor_name || "Unbekannt"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {invoice.ocr_status === "completed" && (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  OCR erfasst
                </div>
              )}
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Rechnung bearbeiten</CardTitle>
              <CardDescription>
                Alle Angaben müssen gemäß §11 UStG vollständig sein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_name">Lieferant / Rechnungssteller</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name || ""}
                    onChange={(e) => handleInputChange("vendor_name", e.target.value)}
                    placeholder="z.B. Firma XYZ"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice_number">Rechnungsnummer</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number || ""}
                    onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                    placeholder="z.B. RE-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice_date">Rechnungsdatum</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date?.split("T")[0] || ""}
                    onChange={(e) => handleInputChange("invoice_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="invoice_type">Rechnungstyp</Label>
                  <Select
                    value={formData.invoice_type || "eingang"}
                    onValueChange={(value) => handleInputChange("invoice_type", value as InvoiceType)}
                  >
                    <SelectTrigger id="invoice_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-4">Beträge</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="net_amount">Netto-Betrag (€)</Label>
                    <Input
                      id="net_amount"
                      type="number"
                      step="0.01"
                      value={formData.net_amount || ""}
                      onChange={(e) => handleInputChange("net_amount", parseFloat(e.target.value) || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="vat_rate">USt-Satz (%)</Label>
                    <Input
                      id="vat_rate"
                      type="number"
                      step="0.01"
                      value={formData.vat_rate || ""}
                      onChange={(e) => handleInputChange("vat_rate", parseFloat(e.target.value) || null)}
                      placeholder="z.B. 20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vat_amount">USt-Betrag (€)</Label>
                    <Input
                      id="vat_amount"
                      type="number"
                      step="0.01"
                      value={formData.vat_amount || ""}
                      onChange={(e) => handleInputChange("vat_amount", parseFloat(e.target.value) || null)}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="gross_amount">Gesamtbetrag (€)</Label>
                  <Input
                    id="gross_amount"
                    type="number"
                    step="0.01"
                    value={formData.gross_amount || ""}
                    onChange={(e) => handleInputChange("gross_amount", parseFloat(e.target.value) || null)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-4">Steuerliche Behandlung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tax_treatment">Behandlung</Label>
                    <Select
                      value={formData.tax_treatment || "normal"}
                      onValueChange={(value) => handleInputChange("tax_treatment", value as TaxTreatment)}
                    >
                      <SelectTrigger id="tax_treatment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_TREATMENTS.map(treatment => (
                          <SelectItem key={treatment.value} value={treatment.value}>
                            {treatment.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.reverse_charge || false}
                        onChange={(e) => handleInputChange("reverse_charge", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Reverse Charge</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ig_lieferung || false}
                        onChange={(e) => handleInputChange("ig_lieferung", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">IG-Lieferung</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ig_erwerb || false}
                        onChange={(e) => handleInputChange("ig_erwerb", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">IG-Erwerb</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.export_delivery || false}
                        onChange={(e) => handleInputChange("export_delivery", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Ausfuhr</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <Label htmlFor="description">Notizen</Label>
                <textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Beliebige Notizen zur Rechnung..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-border pt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InvoiceDetail;
