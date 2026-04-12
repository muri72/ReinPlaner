"use client";

import React from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Building2, FileText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { toast } from "sonner";

interface ObjectOption {
  id: string;
  name: string;
  address?: string;
  daily_schedules?: any[];
}

interface OrderOption {
  id: string;
  title: string;
  object_id: string;
  object_name?: string;
  customer_name?: string;
}

interface ShiftObjectSelectorProps {
  form: UseFormReturn<any>;
  availableObjects: ObjectOption[];
  availableOrders: OrderOption[];
  objectSearch: string;
  setObjectSearch: (value: string) => void;
  orderSearch: string;
  setOrderSearch: (value: string) => void;
  objectSelectOpen: boolean;
  setObjectSelectOpen: (open: boolean) => void;
  orderSelectOpen: boolean;
  setOrderSelectOpen: (open: boolean) => void;
  createObjectDialogOpen: boolean;
  setCreateObjectDialogOpen: (open: boolean) => void;
  createOrderDialogOpen: boolean;
  setCreateOrderDialogOpen: (open: boolean) => void;
}

export function ShiftObjectSelector({
  form,
  availableObjects,
  availableOrders,
  objectSearch,
  setObjectSearch,
  orderSearch,
  setOrderSearch,
  objectSelectOpen,
  setObjectSelectOpen,
  orderSelectOpen,
  setOrderSelectOpen,
  createObjectDialogOpen,
  setCreateObjectDialogOpen,
  createOrderDialogOpen,
  setCreateOrderDialogOpen,
}: ShiftObjectSelectorProps) {
  const selectedObjectId = form.getValues("objectId");

  const filteredObjects = React.useMemo(() => {
    if (!objectSearch.trim()) return availableObjects;
    const searchLower = objectSearch.toLowerCase();
    return availableObjects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(searchLower) ||
        (obj.address && obj.address.toLowerCase().includes(searchLower))
    );
  }, [availableObjects, objectSearch]);

  const filteredOrders = React.useMemo(() => {
    if (!selectedObjectId) return availableOrders;
    const ordersForObject = availableOrders.filter((o) => o.object_id === selectedObjectId);
    if (!orderSearch.trim()) return ordersForObject;
    const searchLower = orderSearch.toLowerCase();
    return ordersForObject.filter(
      (o) =>
        o.title.toLowerCase().includes(searchLower) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchLower))
    );
  }, [availableOrders, selectedObjectId, orderSearch]);

  const selectedObject = availableObjects.find((obj) => obj.id === selectedObjectId);

  return (
    <>
      {/* Object Selection */}
      <div>
        <Label className="text-sm text-muted-foreground mb-1.5 block">Objekt *</Label>
        <Controller
          name="objectId"
          control={form.control}
          render={({ field }) => (
            <Popover open={objectSelectOpen} onOpenChange={setObjectSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={objectSelectOpen}
                  className="w-full justify-between"
                >
                  {field.value ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {availableObjects.find((obj) => obj.id === field.value)?.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Objekt auswählen...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Objekt suchen..."
                    value={objectSearch}
                    onValueChange={setObjectSearch}
                  />
                  <CommandList className="max-h-[280px] overflow-y-auto">
                    <CommandGroup heading="Objekte" className="sticky top-0 bg-background">
                      {filteredObjects.slice(0, 10).map((obj) => (
                        <CommandItem
                          key={obj.id}
                          value={obj.name}
                          onSelect={() => {
                            form.setValue("objectId", obj.id);
                            form.setValue("orderId", "");
                            setObjectSelectOpen(false);
                            setObjectSearch("");
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{obj.name}</span>
                            {obj.address && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {obj.address}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                      {filteredObjects.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-3">
                          Keine Objekte gefunden
                        </div>
                      )}
                      {filteredObjects.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          +{filteredObjects.length - 10} weitere Objekte...
                        </div>
                      )}
                    </CommandGroup>
                    <CommandGroup className="border-t">
                      <CommandItem
                        onSelect={() => {
                          setObjectSelectOpen(false);
                          setCreateObjectDialogOpen(true);
                        }}
                        className="text-primary font-medium"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Neues Objekt erstellen
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        />

        {/* Create Object Dialog */}
        <ObjectCreateDialog
          open={createObjectDialogOpen}
          onOpenChange={setCreateObjectDialogOpen}
          hideTrigger={true}
          onObjectCreated={(newObjectId) => {
            if (newObjectId) {
              form.setValue("objectId", newObjectId);
              form.setValue("orderId", "");
              toast.success("Objekt erfolgreich erstellt");
            }
          }}
        />
      </div>

      {/* Order Selection */}
      <div>
        <Label className="text-sm text-muted-foreground mb-1.5 block">Auftrag *</Label>
        <Popover open={orderSelectOpen} onOpenChange={setOrderSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={orderSelectOpen}
              className="w-full justify-between"
              disabled={!selectedObjectId}
            >
              {form.getValues("orderId") ? (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {filteredOrders.find((o) => o.id === form.getValues("orderId"))?.title}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {selectedObjectId ? "Auftrag auswählen..." : "Zuerst Objekt auswählen..."}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Auftrag suchen..."
                value={orderSearch}
                onValueChange={setOrderSearch}
              />
              <CommandList className="max-h-[280px] overflow-y-auto">
                <CommandGroup heading="Aufträge" className="sticky top-0 bg-background">
                  {filteredOrders.slice(0, 10).map((order) => (
                    <CommandItem
                      key={order.id}
                      value={order.title}
                      onSelect={() => {
                        form.setValue("orderId", order.id);
                        setOrderSelectOpen(false);
                        setOrderSearch("");
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{order.title}</span>
                        {order.customer_name && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {order.customer_name}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                  {filteredOrders.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-3">
                      Keine Aufträge gefunden
                    </div>
                  )}
                  {filteredOrders.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      +{filteredOrders.length - 10} weitere Aufträge...
                    </div>
                  )}
                </CommandGroup>
                <CommandGroup className="border-t">
                  <CommandItem
                    onSelect={() => {
                      setOrderSelectOpen(false);
                      setCreateOrderDialogOpen(true);
                    }}
                    className="text-primary font-medium"
                    disabled={!selectedObjectId}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Neuen Auftrag erstellen
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Create Order Dialog */}
      <OrderCreateDialog
        open={createOrderDialogOpen}
        onOpenChange={setCreateOrderDialogOpen}
        hideTrigger={true}
        objectId={selectedObjectId}
        onOrderCreated={() => {
          toast.success("Auftrag erfolgreich erstellt");
        }}
      />
    </>
  );
}
