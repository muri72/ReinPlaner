"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { ContactRound } from "lucide-react";
import { CustomerOrdersList } from "./customer-orders-list";
import { CustomerObjectsList } from "./customer-objects-list"; // Import the new component

interface CustomerContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  customer_id: string;
}

interface Order {
  id: string;
  title: string;
  status: string;
  order_type: string;
  due_date: string | null;
  start_date: string | null;
  recurring_end_date: string | null;
  objects: { name: string | null } | null;
}

interface ObjectData {
  id: string;
  name: string;
  address: string | null;
  priority: string;
}

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
  customer_contacts: CustomerContact[];
  orders: Order[];
  objects: ObjectData[]; // Add objects to the interface
}

interface CustomerDetailTabsProps {
  customer: Customer;
}

export function CustomerDetailTabs({ customer }: CustomerDetailTabsProps) {
  const [documentUpdateKey, setDocumentUpdateKey] = useState(0);
  const [contacts, setContacts] = useState<CustomerContact[]>(customer.customer_contacts || []);
  const supabase = createClient();

  const refreshContacts = async () => {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customer.id)
      .order('last_name', { ascending: true });
    
    if (error) {
      console.error("Fehler beim Neuladen der Kontakte:", error);
    } else {
      setContacts(data || []);
    }
  };

  return (
    <Tabs defaultValue="stammdaten" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
        <TabsTrigger value="auftraege">Aufträge</TabsTrigger>
        <TabsTrigger value="objekte">Objekte</TabsTrigger>
        <TabsTrigger value="ansprechpartner">Ansprechpartner</TabsTrigger>
        <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
      </TabsList>
      <TabsContent value="stammdaten">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Stammdaten</CardTitle>
              <CardDescription>Allgemeine und vertragliche Informationen.</CardDescription>
            </div>
            <div className="flex space-x-2">
              <CustomerEditDialog customer={customer} onSuccess={refreshContacts} />
              <DeleteCustomerButton customerId={customer.id} />
            </div>
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
      <TabsContent value="auftraege">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Aufträge</CardTitle>
            <CardDescription>Alle Aufträge, die diesem Kunden zugeordnet sind.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerOrdersList orders={customer.orders || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="objekte">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Objekte</CardTitle>
            <CardDescription>Alle Objekte, die diesem Kunden zugeordnet sind.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerObjectsList objects={customer.objects || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="ansprechpartner">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ansprechpartner</CardTitle>
              <CardDescription>Verwalten Sie die Kontakte für diesen Kunden.</CardDescription>
            </div>
            <CustomerContactCreateGeneralDialog customerId={customer.id} onContactCreated={refreshContacts} />
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <ContactRound className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-base font-semibold">Keine Ansprechpartner gefunden</p>
                <p className="text-sm">Fügen Sie den ersten Kontakt für diesen Kunden hinzu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.first_name} {contact.last_name}</TableCell>
                        <TableCell>{contact.role || 'N/A'}</TableCell>
                        <TableCell>{contact.email || 'N/A'}</TableCell>
                        <TableCell>{contact.phone || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <CustomerContactEditDialog contact={contact} />
                            <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={refreshContacts} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="dokumente">
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Verwalten Sie Dokumente, die mit diesem Kunden verknüpft sind.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader 
              associatedCustomerId={customer.id} 
              onDocumentUploaded={() => setDocumentUpdateKey(prev => prev + 1)} 
            />
            <Separator />
            <DocumentList 
              key={documentUpdateKey} 
              associatedCustomerId={customer.id} 
              onDocumentChange={() => setDocumentUpdateKey(prev => prev + 1)}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}