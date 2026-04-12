'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Debtor } from '@/lib/invoicing/types';
import { createInvoiceAction, createInvoiceFromOrderAction } from '@/lib/invoicing/actions';
import { parseCurrencyInput } from '@/lib/invoicing/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface OrderOption {
  id: string;
  title: string;
  customer_name: string;
  order_type: string;
  fixed_monthly_price: number | null;
}

interface NewInvoiceFormProps {
  debtors: Debtor[];
  orders: OrderOption[];
}

interface LineItem {
  id: string;
  service_description: string;
  quantity: string;
  unit: string;
  unit_price_cents: string;
  tax_rate: string;
  service_date: string;
}

export function NewInvoiceForm({ debtors, orders }: NewInvoiceFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Manual form state
  const [debtorId, setDebtorId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [taxRate, setTaxRate] = useState('19');
  const [notes, setNotes] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      service_description: '',
      quantity: '1',
      unit: 'h',
      unit_price_cents: '',
      tax_rate: '19',
      service_date: format(new Date(), 'yyyy-MM-dd'),
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: String(Date.now()),
        service_description: '',
        quantity: '1',
        unit: 'h',
        unit_price_cents: '',
        tax_rate: taxRate,
        service_date: issueDate,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!debtorId) {
      setError('Bitte wählen Sie einen Debitor aus.');
      return;
    }

    if (items.some(i => !i.service_description || !i.unit_price_cents)) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const processedItems = items.map((item, idx) => ({
        service_description: item.service_description,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit,
        unit_price_cents: parseCurrencyInput(item.unit_price_cents),
        tax_rate: parseFloat(item.tax_rate) || 19,
        sort_order: idx,
        service_date: item.service_date,
      }));

      const result = await createInvoiceAction({
        debtor_id: debtorId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: parseFloat(taxRate),
        notes: notes || undefined,
        reference_text: referenceText || undefined,
        items: processedItems,
      });

      if (result.success && result.data) {
        router.push(`/dashboard/invoices/${result.data.id}`);
      } else {
        setError(result.message || 'Fehler beim Erstellen der Rechnung.');
      }
    } catch (err: any) {
      setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrder) {
      setError('Bitte wählen Sie einen Auftrag aus.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createInvoiceFromOrderAction(selectedOrder, {
        issue_date: issueDate,
        due_days: 30,
        tax_rate: parseFloat(taxRate),
      });

      if (result.success && result.data) {
        router.push(`/dashboard/invoices/${result.data.id}`);
      } else {
        setError(result.message || 'Fehler beim Erstellen der Rechnung aus Auftrag.');
      }
    } catch (err: any) {
      setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manual">Manuell erstellen</TabsTrigger>
          <TabsTrigger value="from-order">Aus Auftrag erstellen</TabsTrigger>
        </TabsList>

        {/* Manual Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rechnungsdetails</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Debtor Selection */}
                <div className="space-y-2">
                  <Label htmlFor="debtor">Debitor *</Label>
                  <Select value={debtorId} onValueChange={setDebtorId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Debitor auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {debtors.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          Keine Debitoren vorhanden
                        </SelectItem>
                      )}
                      {debtors.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.billing_name || 'Unbenannt'} {d.billing_postal_code ? `(${d.billing_postal_code} ${d.billing_city || ''})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date">Rechnungsdatum *</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Fälligkeitsdatum *</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">MwSt-Satz (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={e => {
                        setTaxRate(e.target.value);
                        setItems(items.map(i => ({ ...i, tax_rate: e.target.value })));
                      }}
                    />
                  </div>
                </div>

                {/* Reference */}
                <div className="space-y-2">
                  <Label htmlFor="reference">Referenz / Bestellnummer</Label>
                  <Input
                    id="reference"
                    value={referenceText}
                    onChange={e => setReferenceText(e.target.value)}
                    placeholder="Ihre Referenz..."
                  />
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Rechnungspositionen *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-1 h-4 w-4" />
                      Position hinzufügen
                    </Button>
                  </div>

                  {items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Position {index + 1}
                        </span>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-6 space-y-1">
                          <Label className="text-xs">Leistungsbeschreibung</Label>
                          <Input
                            value={item.service_description}
                            onChange={e => updateItem(item.id, 'service_description', e.target.value)}
                            placeholder="z.B. Gebäudereinigung"
                            required
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Menge</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Einheit</Label>
                          <Select value={item.unit} onValueChange={v => updateItem(item.id, 'unit', v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="h">Stunde (h)</SelectItem>
                              <SelectItem value="Pauschale">Pauschale</SelectItem>
                              <SelectItem value="m²">m²</SelectItem>
                              <SelectItem value="Stück">Stück</SelectItem>
                              <SelectItem value="km">km</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Einzelpreis (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price_cents}
                            onChange={e => updateItem(item.id, 'unit_price_cents', e.target.value)}
                            placeholder="0,00"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Anmerkungen</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Zusätzliche Hinweise für diese Rechnung..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Wird erstellt...' : 'Rechnung erstellen'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* From Order Tab */}
        <TabsContent value="from-order">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rechnung aus Auftrag erstellen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrderSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Auftrag auswählen</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Auftrag auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          Keine aktiven Aufträge vorhanden
                        </SelectItem>
                      )}
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.title} — {o.customer_name}
                          {o.order_type === 'permanent' && o.fixed_monthly_price
                            ? ` (${(o.fixed_monthly_price / 100).toFixed(2)} €/Monat)`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date-order">Rechnungsdatum</Label>
                    <Input
                      id="issue-date-order"
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate-order">MwSt-Satz (%)</Label>
                    <Input
                      id="tax-rate-order"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    Die Rechnung wird basierend auf dem Auftragstyp erstellt:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Dauerauftrag:</strong> Monatliche Pauschale wird in Rechnung gestellt</li>
                    <li><strong>Stundenauftrag:</strong> Erfasste Stunden werden berechnet</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !selectedOrder}>
                    {isSubmitting ? 'Wird erstellt...' : 'Rechnung erstellen'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
