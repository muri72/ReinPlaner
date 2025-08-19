import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
}

interface CustomerObject {
  id: string;
  name: string;
  address: string;
}

interface CustomerContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ServiceRate {
  service_type: string;
  hourly_rate: number;
}

export default function CreateOrderForm() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [objects, setObjects] = useState<CustomerObject[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [serviceRates, setServiceRates] = useState<ServiceRate[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    object_id: '',
    customer_contact_id: '',
    order_type: 'one_time',
    service_type: '',
    priority: 'medium',
    total_estimated_hours: '',
    fixed_monthly_price: '',
    notes: '',
    due_date: undefined as Date | undefined,
    recurring_start_date: undefined as Date | undefined,
    recurring_end_date: undefined as Date | undefined,
    employee_id: '', // Simplified
  });

  useEffect(() => {
    fetchCustomers();
    fetchServiceRates();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      fetchCustomerObjects();
      fetchCustomerContacts();
    }
  }, [formData.customer_id]);

  const navigateBack = () => {
    window.history.back();
  };

  const navigateToOrders = () => {
    window.location.href = '/orders';
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Fehler beim Laden der Kunden');
    }
  };

  const fetchCustomerObjects = async () => {
    if (!formData.customer_id) return;

    try {
      const { data, error } = await supabase
        .from('objects')
        .select('id, name, address')
        .eq('customer_id', formData.customer_id)
        .order('name');

      if (error) throw error;
      setObjects(data || []);
    } catch (error) {
      console.error('Error fetching objects:', error);
      toast.error('Fehler beim Laden der Objekte');
    }
  };

  const fetchCustomerContacts = async () => {
    if (!formData.customer_id) return;

    try {
      const { data, error } = await supabase
        .from('customer_contacts')
        .select('id, first_name, last_name, email')
        .eq('customer_id', formData.customer_id)
        .order('last_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Fehler beim Laden der Kontakte');
    }
  };

  const fetchServiceRates = async () => {
    try {
      const { data, error } = await supabase
        .from('service_rates')
        .select('service_type, hourly_rate')
        .order('service_type');

      if (error) throw error;
      setServiceRates(data || []);
    } catch (error) {
      console.error('Error fetching service rates:', error);
      toast.error('Fehler beim Laden der Servicetarife');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const orderData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        customer_id: formData.customer_id || null,
        object_id: formData.object_id || null,
        customer_contact_id: formData.customer_contact_id || null,
        employee_id: formData.employee_id || null,
        order_type: formData.order_type,
        service_type: formData.service_type || null,
        priority: formData.priority,
        total_estimated_hours: formData.total_estimated_hours ? parseFloat(formData.total_estimated_hours) : null,
        fixed_monthly_price: formData.fixed_monthly_price ? parseFloat(formData.fixed_monthly_price) : null,
        notes: formData.notes || null,
        due_date: formData.due_date?.toISOString() || null,
        recurring_start_date: formData.recurring_start_date?.toISOString().split('T')[0] || null,
        recurring_end_date: formData.recurring_end_date?.toISOString().split('T')[0] || null,
        request_status: 'approved',
        status: 'pending'
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      toast.success('Auftrag erfolgreich erstellt');
      navigateToOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Fehler beim Erstellen des Auftrags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="text-2xl font-bold">Neuen Auftrag erstellen</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kunde</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => handleInputChange('customer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Objekt</Label>
                <Select
                  value={formData.object_id}
                  onValueChange={(value) => handleInputChange('object_id', value)}
                  disabled={!formData.customer_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Objekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map(object => (
                      <SelectItem key={object.id} value={object.id}>
                        {object.name} - {object.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Ansprechpartner</Label>
              <Select
                value={formData.customer_contact_id}
                onValueChange={(value) => handleInputChange('customer_contact_id', value)}
                disabled={!formData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ansprechpartner auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} ({contact.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auftragsdetails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Auftragstyp</Label>
                <Select
                  value={formData.order_type}
                  onValueChange={(value) => handleInputChange('order_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Einmalig</SelectItem>
                    <SelectItem value="recurring">Wiederkehrend</SelectItem>
                    <SelectItem value="permanent">Dauerhaft</SelectItem>
                    <SelectItem value="substitution">Vertretung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Service-Typ</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => handleInputChange('service_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service-Typ auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceRates.map(rate => (
                      <SelectItem key={rate.service_type} value={rate.service_type}>
                        {rate.service_type} (€{rate.hourly_rate}/h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorität</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="urgent">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_estimated_hours">Geschätzte Gesamtstunden</Label>
                <Input
                  id="total_estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.total_estimated_hours}
                  onChange={(e) => handleInputChange('total_estimated_hours', e.target.value)}
                />
              </div>

              {formData.order_type === 'permanent' && (
                <div>
                  <Label htmlFor="fixed_monthly_price">Fester Monatspreis (€)</Label>
                  <Input
                    id="fixed_monthly_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fixed_monthly_price}
                    onChange={(e) => handleInputChange('fixed_monthly_price', e.target.value)}
                  />
                </div>
              )}
            </div>

            {formData.order_type === 'one_time' && (
              <div>
                <Label>Fälligkeitsdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, 'PPP', { locale: de }) : 'Datum auswählen'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => handleInputChange('due_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {(formData.order_type === 'recurring' || formData.order_type === 'permanent' || formData.order_type === 'substitution') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Startdatum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurring_start_date ? format(formData.recurring_start_date, 'PPP', { locale: de }) : 'Startdatum auswählen'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.recurring_start_date}
                        onSelect={(date) => handleInputChange('recurring_start_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Enddatum (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurring_end_date ? format(formData.recurring_end_date, 'PPP', { locale: de }) : 'Enddatum auswählen'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.recurring_end_date}
                        onSelect={(date) => handleInputChange('recurring_end_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={navigateToOrders}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Speichern...' : 'Auftrag erstellen'}
          </Button>
        </div>
      </form>
    </div>
  );
}