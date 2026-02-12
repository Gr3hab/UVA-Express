import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/types/invoice";

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvoices(data as unknown as Invoice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const uploadAndScan = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nicht eingeloggt");

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    // Create invoice record
    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        ocr_status: "pending",
      } as any)
      .select()
      .single();
    if (insertError) throw insertError;

    // Get signed URL for the file
    const { data: signedUrlData } = await supabase.storage
      .from("invoices")
      .createSignedUrl(filePath, 300);
    if (!signedUrlData?.signedUrl) throw new Error("Could not create signed URL");

    // Trigger OCR
    const { data: ocrResult, error: ocrError } = await supabase.functions.invoke("ocr-invoice", {
      body: { invoiceId: (invoice as any).id, fileUrl: signedUrlData.signedUrl },
    });

    if (ocrError) throw ocrError;

    // Refresh invoices
    await fetchInvoices();
    return ocrResult;
  };

  return { invoices, loading, uploadAndScan, refetch: fetchInvoices };
};
