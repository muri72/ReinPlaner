"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";

interface Customer {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  customer_type: string;
  contractual_services: string | null;
}

interface CustomerDetailTabsProps {
  customer: Customer;
}

export function CustomerDetailTabs({ customer }: CustomerDetailTabsProps) {
  return (
    <Tabs defaultValue="stammdaten" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="auftraege" disabled>Aufträge</TabsTrigger>
        <TabsTrigger value="objekte" disabled>Objekte</TabsTrigger>
        <TabsTrigger value="ansprechpartner" disabled>Ansprechpartner</TabsTrigger>
        <TabsTrigger value="dokumente" disabled>Dokumente</TabsTrigger>
      </TabsList>
      <TabsContent value="stammdaten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Allgemeine und vertragliche Informationen.</CardDescription>
            </div>
            <CustomerEditDialog customer={customer} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Kundenname</p>
                <p>{customer.name}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Kundentyp</p>
                <p>{customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Kontakt-E-Mail</p>
                <p>{customer.contact_email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Kontakt-Telefon</p>
                <p>{customer.contact_phone || 'N/A'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Adresse</p>
                <p className="whitespace-pre-wrap">{customer.address || 'N/A'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="font-medium text-muted-foreground">Vertragsdaten</p>
                <p className="whitespace-pre-wrap">{customer.contractual_services || 'Keine spezifischen Vertragsdetails hinterlegt.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}