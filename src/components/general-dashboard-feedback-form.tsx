"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { createGeneralFeedback } from "@/app/dashboard/feedback/actions";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const generalFeedbackSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  subject: z.string().max(200, "Betreff ist zu lang").optional(),
  message: z.string().min(1, "Nachricht ist erforderlich").max(2000, "Nachricht ist zu lang"),
});

type GeneralFeedbackFormValues = z.infer<typeof generalFeedbackSchema>;

interface Customer {
  id: string;
  name: string;
}

export function GeneralDashboardFeedbackForm() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const form = useForm<GeneralFeedbackFormValues>({
    resolver: zodResolver(generalFeedbackSchema),
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          setUserRole(profile.role);
          if (profile.role === 'customer') {
            const { data: customerData } = await supabase.from('customers').select('id').eq('user_id', user.id).single();
            if (customerData) form.setValue("customerId", customerData.id);
          } else {
            const { data: customersData } = await supabase.from('customers').select('id, name').order('name');
            if (customersData) setCustomers(customersData);
          }
        }
      }
    };
    fetchUserData();
  }, [supabase, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        toast.error("Sie können maximal 5 Bilder hochladen.");
        return;
      }
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: GeneralFeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (data.customerId) formData.append("customerId", data.customerId);
      if (data.subject) formData.append("subject", data.subject);
      formData.append("message", data.message);
      
      files.forEach(file => {
        formData.append("images", file);
      });

      const result = await createGeneralFeedback(formData);

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setFiles([]);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {userRole !== 'customer' && (
        <div>
          <Label htmlFor="customerId">Feedback im Namen von (Kunde)</Label>
          <Select onValueChange={(value) => form.setValue("customerId", value)}>
            <SelectTrigger><SelectValue placeholder="Kunde auswählen..." /></SelectTrigger>
            <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label htmlFor="subject">Betreff (optional)</Label>
        <Input id="subject" {...form.register("subject")} placeholder="Lob für Mitarbeiter, Problem mit..." />
      </div>
      <div>
        <Label htmlFor="message">Ihre Nachricht</Label>
        <Textarea id="message" {...form.register("message")} placeholder="Was möchten Sie uns mitteilen?" rows={5} />
        {form.formState.errors.message && <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>}
      </div>
      <div>
        <Label htmlFor="images">Bilder hinzufügen (optional, max. 5)</Label>
        <Input id="images" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Bilder auswählen</Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <Image src={URL.createObjectURL(file)} alt={`Vorschau ${index}`} width={100} height={100} className="rounded-md object-cover w-full h-24" />
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveFile(index)}><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Wird gesendet..." : "Feedback senden"}</Button>
    </form>
  );
}