"use client";

import React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabelWithRequired } from "../order-form";
import { cn } from "@/lib/utils";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { OrderFormValues } from "../order-form";

interface OrderBasicInfoSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  customers: { id: string; name: string }[];
  filteredObjects: any[];
  selectedCustomerId: string | undefined;
  selectedObjectId: string | undefined | null;
  customerContacts: { id: string; first_name: string; last_name: string; customer_id: string }[];
  services: { id: string; key: string; title: string; default_hourly_rate: number | null }[];
  userEditedTitle: boolean;
  setUserEditedTitle: (value: boolean) => void;
  onCustomerChange: (value: string) => void;
  onObjectChange: (value: string | null) => void;
  onCustomerContactCreated: (newContactId: string) => void;
  onObjectCreated: (newObjectId: string) => void;
  onServiceChange: (value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replaceAssignedEmployees: (...args: any[]) => void;
}

export function OrderBasicInfoSection({
  form,
  customers,
  filteredObjects,
  selectedCustomerId,
  selectedObjectId,
  customerContacts,
  services,
  userEditedTitle,
  setUserEditedTitle,
  onCustomerChange,
  onObjectChange,
  onCustomerContactCreated,
  onObjectCreated,
  onServiceChange,
  replaceAssignedEmployees,
}: OrderBasicInfoSectionProps) {
  return (
    <>
      {/* Customer Selection */}
      <div>
        <LabelWithRequired htmlFor="customerId" required>Kunde</LabelWithRequired>
        <Select
          onValueChange={(value: string) => {
            onCustomerChange(value);
          }}
          value={form.watch("customerId")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.customerId.message)}</p>}
      </div>

      {/* Object Selection */}
      <div className="space-y-2">
        <Label htmlFor="objectId">Objekt</Label>
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Select
              onValueChange={(value: string) => {
                onObjectChange(value === "unassigned" ? null : value);
              }}
              value={form.watch("objectId") || "unassigned"}
              disabled={!selectedCustomerId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Objekt auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Objekt zugewiesen</SelectItem>
                {filteredObjects.map(obj => (
                  <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.objectId && <p className="text-red-500 text-sm">{String(form.formState.errors.objectId.message)}</p>}
            {!selectedCustomerId && (
              <p className="text-muted-foreground text-sm">Bitte wählen Sie zuerst einen Kunden aus.</p>
            )}
          </div>
          {!selectedCustomerId ? (
            <p className="text-sm text-muted-foreground">Bitte wählen Sie zuerst einen Kunden aus.</p>
          ) : (
            <ObjectCreateDialog
              customerId={selectedCustomerId}
              onObjectCreated={onObjectCreated}
            />
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <LabelWithRequired htmlFor="title" required>Titel des Auftrags</LabelWithRequired>
        <Controller
          name="title"
          control={form.control}
          render={({ field }) => (
            <Input
              id="title"
              {...field}
              placeholder="Wird automatisch generiert (Objekt • Kunde)"
              onChange={(e) => {
                field.onChange(e);
                setUserEditedTitle(true);
              }}
            />
          )}
        />
        {form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.title.message)}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Details zum Auftrag..."
          rows={4}
        />
        {form.formState.errors.description && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.description.message)}</p>}
      </div>

      {/* Service Type */}
      <div>
        <Label htmlFor="serviceType">Dienstleistung</Label>
        <Select
          onValueChange={(value: string) => onServiceChange(value)}
          value={form.watch("serviceKey") || ""}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Dienstleistung auswählen" />
          </SelectTrigger>
          <SelectContent>
            {services.map(service => (
              <SelectItem key={service.key} value={service.key}>{service.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.serviceType && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.serviceType.message)}</p>}
      </div>

      {/* Markup and Custom Rate Section */}
      {form.watch("serviceKey") && (() => {
        const service = services.find(s => s.key === form.watch("serviceKey"));
        const defaultRate = Number(service?.default_hourly_rate || 0);
        const markupPercentage = form.watch("markupPercentage") as number | null | undefined;
        const customHourlyRate = form.watch("customHourlyRate") as number | null | undefined;

        // Calculate final hourly rate
        let finalRate = Number(customHourlyRate || defaultRate);
        if (markupPercentage && markupPercentage > 0) {
          finalRate = finalRate * (1 + markupPercentage / 100);
        }

        return (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="markupPercentage">Aufschlag (%)</Label>
              <Input
                id="markupPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={(form.watch("markupPercentage") as number | null | undefined) ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === null || val === undefined) {
                    form.setValue("markupPercentage", null as any, { shouldValidate: true });
                  } else {
                    const num = Number(val);
                    form.setValue("markupPercentage", isNaN(num) ? null as any : num as any, { shouldValidate: true });
                  }
                }}
                placeholder="z.B. 10"
              />
              <p className="text-xs text-muted-foreground mt-1">Prozentualer Aufschlag auf den Stundensatz</p>
            </div>
            <div>
              <Label htmlFor="customHourlyRate">Stundensatz (€/h)</Label>
              <Input
                id="customHourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={(form.watch("customHourlyRate") as number | null | undefined) ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === null || val === undefined) {
                    form.setValue("customHourlyRate", null as any, { shouldValidate: true });
                  } else {
                    const num = Number(val);
                    form.setValue("customHourlyRate", isNaN(num) ? null as any : num as any, { shouldValidate: true });
                  }
                }}
                placeholder={defaultRate > 0 ? defaultRate.toFixed(2) : "z.B. 45.00"}
              />
              <p className="text-xs text-muted-foreground mt-1">Individueller Stundensatz für diesen Auftrag</p>
            </div>
            {finalRate > 0 && (
              <div className="col-span-2 mt-2 p-3 bg-primary/10 rounded-md border border-primary/20">
                <p className="text-sm font-semibold text-primary">
                  Finaler Stundensatz: {finalRate.toFixed(2)} €/h
                </p>
                {markupPercentage && markupPercentage > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    (Basis: {Number(customHourlyRate || defaultRate).toFixed(2)} € + {markupPercentage}% Aufschlag)
                  </p>
                )}
                {!markupPercentage && customHourlyRate && customHourlyRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    (individueller Stundensatz ohne Aufschlag)
                  </p>
                )}
                {!markupPercentage && !customHourlyRate && defaultRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    (Standard-Stundensatz der Dienstleistung)
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Customer Contact */}
      <div>
        <Label htmlFor="customerContactId">Auftraggebende Person (Kundenkontakt, optional)</Label>
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <Select
              onValueChange={(value: string) => form.setValue("customerContactId", value === "unassigned" ? null : value)}
              value={form.watch("customerContactId") || "unassigned"}
              disabled={!selectedCustomerId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kundenkontakt auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Kein Kundenkontakt zugewiesen</SelectItem>
                {customerContacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerContactId && <p className="text-red-500 text-sm mt-1">{String(form.formState.errors.customerContactId.message)}</p>}
          </div>
          <CustomerContactCreateGeneralDialog
            customerId={selectedCustomerId}
            onContactCreated={onCustomerContactCreated}
          />
        </div>
      </div>
    </>
  );
}
