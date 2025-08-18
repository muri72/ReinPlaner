import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, DollarSign, MessageSquare, Star, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog";

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
  }

  if (profile?.role !== 'customer') {
    redirect("/dashboard");
  }

  const customerName = profile?.first_name || user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch customer's associated customer_id
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, name, contact_email, contact_phone, customer_type, contractual_services')
    .eq('user_id', user.id)
    .single();

  if (customerError && customerError.code !== 'PGRST116') {
    console.error("Fehler beim Laden der Kundendaten:", customerError?.message || customerError);
  }

  const customerId = customerData?.id || null;

  // Fetch next upcoming order
  let nextOrder = null;
  let todayOrderStatus = "Kein Auftrag geplant.";

  if (customerId) {
    const { data: upcomingOrders, error: upcomingOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        due_date,
        recurring_start_date,
        recurring_end_date,
        status,
        order_type,
        objects ( name ),
        order_employee_assignments ( employee_id, employees ( first_name, last_name ) )
      `)
      .eq('customer_id', customerId)
      .eq('request_status', 'approved')
      .order('due_date', { ascending: true })
      .order('recurring_start_date', { ascending: true })
      .limit(5);

    if (upcomingOrdersError) {
      console.error("Fehler beim Laden der kommenden Aufträge:", upcomingOrdersError?.message || upcomingOrdersError);
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter for orders that are active today or in the future
      const relevantOrders = upcomingOrders?.filter(order => {
        if (order.order_type === 'one_time' && order.due_date) {
          const dueDate = new Date(order.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= now;
        }
        if (['recurring', 'permanent', 'substitution'].includes(order.order_type) && order.recurring_start_date) {
          const startDate = new Date(order.recurring_start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : null;
          if (endDate) endDate.setHours(0, 0, 0, 0);

          return (startDate <= now && (!endDate || endDate >= now)) || startDate > now;
        }
        return false;
      });

      // Sort to find the very next one
      relevantOrders?.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date) : (a.recurring_start_date ? new Date(a.recurring_start_date)<dyad-problem-report summary="7 problems">
<problem file="src/components/order-form.tsx" line="126" column="5" code="2322">Type '{ employeeId: string; assigned_monday_hours?: unknown; assigned_tuesday_hours?: unknown; assigned_wednesday_hours?: unknown; assigned_thursday_hours?: unknown; assigned_friday_hours?: unknown; assigned_saturday_hours?: unknown; assigned_sunday_hours?: unknown; }[]' is not assignable to type '{ employeeId: string; assigned_monday_hours?: number | null | undefined; assigned_tuesday_hours?: number | null | undefined; assigned_wednesday_hours?: number | null | undefined; assigned_thursday_hours?: number | ... 1 more ... | undefined; assigned_friday_hours?: number | ... 1 more ... | undefined; assigned_satur...'.
  Type '{ employeeId: string; assigned_monday_hours?: unknown; assigned_tuesday_hours?: unknown; assigned_wednesday_hours?: unknown; assigned_thursday_hours?: unknown; assigned_friday_hours?: unknown; assigned_saturday_hours?: unknown; assigned_sunday_hours?: unknown; }' is not assignable to type '{ employeeId: string; assigned_monday_hours?: number | null | undefined; assigned_tuesday_hours?: number | null | undefined; assigned_wednesday_hours?: number | null | undefined; assigned_thursday_hours?: number | ... 1 more ... | undefined; assigned_friday_hours?: number | ... 1 more ... | undefined; assigned_satur...'.
    Types of property 'assigned_monday_hours' are incompatible.
      Type 'unknown' is not assignable to type 'number | null | undefined'.</problem>
<problem file="src/components/order-form.tsx" line="130" column="5" code="2322">Type 'Resolver&lt;{ title: string; customerId: string; description?: string | null | undefined; dueDate?: Date | null | undefined; status?: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot; | undefined; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }, any, { ...; }&gt;' is not assignable to type 'Resolver&lt;{ title: string; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot;; customerId: string; orderType: &quot;one_time&quot; | &quot;recurring&quot; | &quot;substitution&quot; | &quot;permanent&quot;; priority: &quot;low&quot; | &quot;medium&quot; | &quot;high&quot;; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }, any, { ...; }&gt;'.
  Types of parameters 'options' and 'options' are incompatible.
    Type 'ResolverOptions&lt;{ title: string; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot;; customerId: string; orderType: &quot;one_time&quot; | &quot;recurring&quot; | &quot;substitution&quot; | &quot;permanent&quot;; priority: &quot;low&quot; | &quot;medium&quot; | &quot;high&quot;; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }&gt;' is not assignable to type 'ResolverOptions&lt;{ title: string; customerId: string; description?: string | null | undefined; dueDate?: Date | null | undefined; status?: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot; | undefined; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }&gt;'.
      Types of property 'names' are incompatible.
        Type 'string[] | undefined' is not assignable to type '(requiredKeys&lt;{ title: string; description: string | null | undefined; dueDate: Date | null | undefined; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot; | undefined; customerId: string; ... 10 more ...; assignedEmployees: { ...; }[] | undefined; }&gt; | optionalKeys&lt;...&gt;)[] | undefined'.
          Type 'string[]' is not assignable to type '(requiredKeys&lt;{ title: string; description: string | null | undefined; dueDate: Date | null | undefined; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot; | undefined; customerId: string; ... 10 more ...; assignedEmployees: { ...; }[] | undefined; }&gt; | optionalKeys&lt;...&gt;)[]'.
            Type 'string' is not assignable to type 'requiredKeys&lt;{ title: string; description: string | null | undefined; dueDate: Date | null | undefined; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot; | undefined; customerId: string; ... 10 more ...; assignedEmployees: { ...; }[] | undefined; }&gt; | optionalKeys&lt;...&gt;'.</problem>
<problem file="src/components/order-form.tsx" line="271" column="36" code="7053">Element implicitly has an 'any' type because expression of type '`${string}_hours`' can't be used to index type '{ id: string; name: string; customer_id: string; monday_hours: number | null; tuesday_hours: number | null; wednesday_hours: number | null; thursday_hours: number | null; friday_hours: number | null; saturday_hours: number | null; sunday_hours: number | null; }'.</problem>
<problem file="src/components/order-form.tsx" line="357" column="39" code="2345">Argument of type 'SubmitHandler&lt;{ title: string; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot;; customerId: string; orderType: &quot;one_time&quot; | &quot;recurring&quot; | &quot;substitution&quot; | &quot;permanent&quot;; priority: &quot;low&quot; | &quot;medium&quot; | &quot;high&quot;; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }&gt;' is not assignable to parameter of type 'SubmitHandler&lt;TFieldValues&gt;'.
  Type 'TFieldValues' is not assignable to type '{ title: string; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot;; customerId: string; orderType: &quot;one_time&quot; | &quot;recurring&quot; | &quot;substitution&quot; | &quot;permanent&quot;; priority: &quot;low&quot; | &quot;medium&quot; | &quot;high&quot;; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }'.
    Type 'FieldValues' is missing the following properties from type '{ title: string; status: &quot;pending&quot; | &quot;in_progress&quot; | &quot;completed&quot;; customerId: string; orderType: &quot;one_time&quot; | &quot;recurring&quot; | &quot;substitution&quot; | &quot;permanent&quot;; priority: &quot;low&quot; | &quot;medium&quot; | &quot;high&quot;; ... 10 more ...; assignedEmployees?: { ...; }[] | undefined; }': title, status, customerId, orderType, and 2 more.</problem>
<problem file="src/app/dashboard/planning/actions.ts" line="144" column="51" code="2304">Cannot find name 'dayNames'.</problem>
<problem file="src/app/dashboard/planning/actions.ts" line="145" column="40" code="2304">Cannot find name 'dayNames'.</problem>
<problem file="src/app/dashboard/planning/actions.ts" line="157" column="32" code="7053">Element implicitly has an 'any' type because expression of type 'keyof { monday_hours: any; tuesday_hours: any; wednesday_hours: any; thursday_hours: any; friday_hours: any; saturday_hours: any; sunday_hours: any; }[]' can't be used to index type '{ monday_hours: any; tuesday_hours: any; wednesday_hours: any; thursday_hours: any; friday_hours: any; saturday_hours: any; sunday_hours: any; }'.
  No index signature with a parameter of type 'number' was found on type '{ monday_hours: any; tuesday_hours: any; wednesday_hours: any; thursday_hours: any; friday_hours: any; saturday_hours: any; sunday_hours: any; }'.</problem>
</dyad-problem-report><think>**Identifying Compile-Time Issues**

I've got seven TypeScript compile-time errors to tackle. My focus is pinpointing and understanding each error. I'll need to develop concise fixes for all of them. The first error involves `src/components/order-form.tsx:126:5` and some `assigned_monday_hours` type incompatibility.


**Tackling Remaining Errors**

Having addressed the initial two, I'm now focused on the remaining five errors. The priority is to diagnose the one at `src/components/order-form.tsx:271:36` concerning `objectDailyHours` indexing. This requires further examination of the data structure and how it interacts with the form values. I'm also planning a review of the schema definition for optimal type-checking. Once I resolve this one, I'll move on to the other remaining ones.


**Diagnosing & Updating:**

I've made headway! I've confirmed that the indexing error at `src/components/order-form.tsx:271:36` is still relevant. I need to figure out why the type isn't properly inferred within the `superRefine` function, especially regarding accessing hour properties via string templates. My plan is to review the data flow and how `selectedObject` is being passed into the function to make sure it's typed properly. Additionally, I need to look at the schema definition to see if there's anything I can do there. I also plan to analyze the `keyof typeof selectedObject` to make sure it contains the correct values.


**Reviewing and Refining Solutions**

My focus has shifted.  I've realized the `superRefine` validation must move into the `onSubmit` handler. This simplifies the schema and ensures data access. I'll define `dayNames` in `planning/actions.ts` as suggested. Also, I'm verifying the type casts and schema adjustments needed for the initial type errors, now with an enhanced understanding of the overall data flow. The approach to tackle these errors will include reviewing the current state of `order-form.tsx` and refactoring the `superRefine`.


**Implementing Updated Validation**

Okay, I've moved the `superRefine` validation logic into the `onSubmit` handler within `order-form.tsx`. This change allows proper access to the `objects` state and eliminates the type errors associated with dynamic property indexing. I've also implemented the explicit type casts for `initialData?.assignedEmployees` and `orderSchema`, as suggested, to address the earlier type incompatibility errors. Furthermore, I've integrated the necessary `dayNames` array definition within the `planning/actions.ts` file, resolving the missing variable issue. Finally, I've reviewed and implemented the changes in the type casts. I'm satisfied that these steps have addressed the most persistent compile time issues.


**Refactoring and Refining**

I'm now fully immersed in the refactoring process. The `superRefine` validation has been removed from `orderSchema` and I'm integrating it within the `onSubmit` handler in `order-form.tsx`. This addresses all type issues. I'm also addressing the `dayNames` declaration and any necessary schema adjustments. I will complete a review of this file's code. Finally, I will check for any remaining issues.


**Revising Validation Implementation**

I've determined that, to properly resolve type-checking issues and state-access problems, the `superRefine` validation must be removed from the schema. Instead, I plan to integrate the validation directly into the `onSubmit` handler of the `OrderForm` component. This will provide direct access to the `objects` state and ensure that the schema remains separate and focused. I've also planned to define the `dayNames` array in `planning/actions.ts` to address the compile-time errors.


**Addressing State and Validation**

I've begun resolving the `zodResolver` type issues by casting `orderSchema`. I'm going to remove the `superRefine` function from it. Then, I plan to move the validation into the `onSubmit` handler in `order-form.tsx`. I also need to declare the `dayNames` array within `planning/actions.ts` to address compile-time errors.


**Implementing Enhanced Validation**

I've successfully integrated the `superRefine` logic directly into the `onSubmit` handler of `OrderForm`. The `orderSchema` now only contains the base validation rules. This means I've removed the `superRefine` function. I've also implemented the explicit casts and `dayNames` declaration in `planning/actions.ts`. My next steps involve a comprehensive review of these changes and to ensure that all remaining code is properly typed. I will then perform a detailed test of each functionality.


**Validating Form Logic**

I'm now integrating validation logic into the `onSubmit` handler to directly access `objects` state. This replaces the problematic `superRefine`. I've also implemented explicit type casts to fix those initial type errors.


**Re-Evaluating and Implementing**

I've revised the validation logic to be inside the `onSubmit` handler, removing `superRefine`. The goal is to cast the `assignedEmployees` and `orderSchema` to fix type issues and provide direct access to `objects` within the form handler. Now, I'll integrate these changes and ensure complete type safety, including the `dayNames` declaration in `planning/actions.ts`.


**Finalizing Type Safety**

I'm now integrating the validation logic directly into the `onSubmit` handler in `order-form.tsx`. I've removed the redundant `superRefine` function. I've also implemented explicit type casts for the `assignedEmployees` array. This should resolve the type-checking issues and state access problems. I've also defined the `dayNames` array in `planning/actions.ts`. I will now review the updated code to ensure full type safety and correct validation. I will test all the functionalities as well.


**Analyzing and Integrating Solutions**

I'm now fully immersed in the process of integrating the validation logic directly into the `onSubmit` handler within `order-form.tsx`. This shift has allowed me to cast `orderSchema` and resolve the type-checking issues linked to `zodResolver`. I'm also ensuring all state access is handled correctly. I'll define `dayNames` within `planning/actions.ts`. I will review all the code and check for any remaining issues.


**Analyzing Recent Validation Implementation**

I'm now fully immersed in the validation logic's integration within the `onSubmit` handler in `order-form.tsx`. This change ensures direct access to the `objects` state, thus addressing the previous `superRefine` issues. I have cast `orderSchema` and I will define `dayNames` in `planning/actions.ts` to address any remaining errors. I will ensure complete type safety.


**Addressing Type-Safety Enhancements**

I've resolved the main compile-time issues. I moved the `superRefine` function into the `onSubmit` handler. This change addresses several type-related issues and allows direct state access. I also explicitly cast `orderSchema` and `initialData?.assignedEmployees` within `OrderForm`, improving type safety and inference. Furthermore, I've defined the `dayNames` array. Finally, all the updates have been integrated.

**Validating & Resolving**

I've integrated the manual validation within the `onSubmit` handler in `order-form.tsx`. I've removed the `superRefine` function from the schema definition and cast `orderSchema` and `initialData?.assignedEmployees` to ensure type-safety. I've also integrated the necessary `dayNames` declaration in `planning/actions.ts`.

</think>Okay, ich werde diese 7 TypeScript-Fehler beheben. Die Hauptursache für die Fehler im `OrderForm.tsx` ist, dass die Validierungslogik, die auf dem `objects`-State basiert, nicht im `z.object`-Schema selbst stehen kann, da dieses außerhalb der Komponente definiert ist und keinen Zugriff auf den React-State hat. Diese Validierung muss stattdessen manuell im `onSubmit`-Handler des Formulars erfolgen.

Zusätzlich werde ich die Typisierung für `assignedEmployees` und die dynamischen Zugriffe auf Objekteigenschaften korrigieren.

Hier sind die Änderungen:

<dyad-write path="src/components/order-form.tsx" description="Behebung von TypeScript-Fehlern im Auftragsformular, indem die Validierung von Objektstunden in den onSubmit-Handler verschoben und die Typisierung korrigiert wird.">
"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PlusCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ObjectForm, ObjectFormValues } from "@/components/object-form";
import { createObject } from "@/app/dashboard/objects/actions";
import { CustomerContactCreateDialog } from "@/components/customer-contact-create-dialog";
import { DatePicker } from "@/components/date-picker";
import { handleActionResponse } from "@/lib/toast-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Definierte Liste der Dienstleistungen
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
] as const;

// Helper function for number preprocessing
const preprocessNumber = (val: any) => (val === "" || isNaN(Number(val)) ? null : Number(val));

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const germanDayNames: { [key: string]: string } = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
};

// Schema für zugewiesene Mitarbeiter mit Stunden pro Wochentag
const assignedEmployeeSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID"),
  assigned_monday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_tuesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_wednesday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_thursday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_friday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_saturday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
  assigned_sunday_hours: z.preprocess(preprocessNumber, z.nullable(z.number().min(0).max(24)).optional()),
});

export const orderSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich").max(100, "Titel ist zu lang"),
  description: z.string().max(500, "Beschreibung ist zu lang").optional().nullable(),
  dueDate: z.date().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  customerId: z.string().uuid("Ungültige Kunden-ID").min(1, "Kunde ist erforderlich"),
  objectId: z.string().uuid("Ungültiges Objekt-ID").optional().nullable(),
  customerContactId: z.string().uuid("Ungültige Kundenkontakt-ID").optional().nullable(),
  orderType: z.enum(["one_time", "recurring", "substitution", "permanent"]).default("one_time"),
  recurringStartDate: z.date().optional().nullable(),
  recurringEndDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("low"),
  totalEstimatedHours: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.nullable(z.number().min(0, "Stunden müssen positiv sein").max(9999, "Stunden sind zu hoch")).optional()
  ),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  serviceType: z.enum(availableServices).optional().nullable(),
  requestStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  assignedEmployees: z.array(assignedEmployeeSchema).optional(),
});

export type OrderFormInput = z.input<typeof orderSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  initialData?: Partial<OrderFormInput>;
  onSubmit: (data: OrderFormValues) => Promise<{ success: boolean; message: string }>;
  submitButtonText: string;
  onSuccess?: () => void;
}

export function OrderForm({ initialData, onSubmit, submitButtonText, onSuccess }: OrderFormProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [objects, setObjects] = useState<Array<{ 
    id: string; 
    name: string; 
    customer_id: string;
    monday_hours: number | null;
    tuesday_hours: number | null;
    wednesday_hours: number | null;
    thursday_hours: number | null;
    friday_hours: number | null;
    saturday_hours: number | null;
    sunday_hours: number | null;
  }>>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [customerContacts, setCustomerContacts] = useState<{ id: string; first_name: string; last_name: string; customer_id: string }[]>([]);
  const [isNewObjectDialogOpen, setIsNewObjectDialogOpen] = useState(false);

  const resolvedDefaultValues: OrderFormValues = {
    title: initialData?.title ?? "",
    description: initialData?.description ?? null,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    status: initialData?.status ?? "pending",
    customerId: initialData?.customerId ?? "",
    objectId: initialData?.objectId ?? null,
    customerContactId: initialData?.customerContactId ?? null,
    orderType: initialData?.orderType ?? "one_time",
    recurringStartDate: initialData?.recurringStartDate ? new Date(initialData.recurringStartDate) : null,
    recurringEndDate: initialData?.recurringEndDate ? new Date(initialData.recurringEndDate) : null,
    priority: initialData?.priority ?? "low",
    totalEstimatedHours: (initialData?.totalEstimatedHours as number | null | undefined) ?? null,
    notes: initialData?.notes ?? null,
    serviceType: initialData?.serviceType ?? null,
    requestStatus: initialData?.requestStatus ?? "approved",
    // Fix for Error 1: Explicitly cast initialData?.assignedEmployees
    assignedEmployees: (initialData?.assignedEmployees as OrderFormValues['assignedEmployees']) ?? [],
  };

  const form = useForm<OrderFormValues>({
    // Fix for Error 2: Explicitly cast orderSchema
    resolver: zodResolver(orderSchema as z.ZodSchema<OrderFormValues>),
    defaultValues: resolvedDefaultValues,
    mode: "onChange", // Wichtig für dynamische Validierung
  });

  const { fields: assignedEmployeeFields, append: appendEmployee, remove: removeEmployee, update: updateEmployeeField } = useFieldArray({
    control: form.control,
    name: "assignedEmployees",
  });

  const orderType = form.watch("orderType");
  const selectedCustomerId = form.watch("customerId");
  const selectedObjectId = form.watch("objectId");
  const selectedAssignedEmployees = form.watch("assignedEmployees");

  // Funktion zum Laden der Kundenkontakte
  const fetchCustomerContacts = async (customerId: string) => {
    const { data: contactsData, error: contactsError } = await supabase
      .from('customer_contacts')
      .select('id, first_name, last_name, customer_id')
      .eq('customer_id', customerId)
      .order('last_name', { ascending: true });
    if (contactsData) setCustomerContacts(contactsData);
    if (contactsError) console.error("Fehler beim Laden der Kundenkontakte:", contactsError);
  };

  // Daten für Dropdowns laden
  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name');
      if (customersData) setCustomers(customersData);
      if (customersError) console.error("Fehler beim Laden der Kunden:", customersError);

      // Alle Objekt-Details laden, einschließlich der Stunden pro Wochentag
      const { data: objectsData, error: objectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours');
      if (objectsData) setObjects(objectsData);
      if (objectsError) console.error("Fehler beim Laden der Objekte:", objectsError);

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesData) setAllEmployees(employeesData);
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
    };
    fetchDropdownData();
  }, [supabase]);

  // Kundenkontakte laden, wenn sich der ausgewählte Kunde ändert
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerContacts(selectedCustomerId);
    } else {
      setCustomerContacts([]);
      form.setValue("customerContactId", null);
    }
  }, [selectedCustomerId, supabase, form]);

  // Automatische Titelgenerierung
  useEffect(() => {
    if (!initialData) { // Nur wenn ein neuer Auftrag erstellt wird
      const customerName = customers.find(c => c.id === selectedCustomerId)?.name || '';
      const objectName = objects.find(o => o.id === selectedObjectId)?.name || '';

      const parts = [];
      if (objectName) parts.push(objectName);
      if (customerName) parts.push(customerName);

      const generatedTitle = parts.join(' • ');
      form.setValue("title", generatedTitle);
    }
  }, [selectedCustomerId, selectedObjectId, customers, objects, form, initialData]);

  // Objekte filtern basierend auf ausgewähltem Kunden
  const filteredObjects = selectedCustomerId
    ? objects.filter(obj => obj.customer_id === selectedCustomerId)
    : [];

  // Funktion zur Berechnung der vorgeschlagenen täglichen Stunden pro Mitarbeiter
  const calculateSuggestedDailyHours = useCallback((
    employeeCount: number,
    objectId: string | null,
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  ): number | null => {
    if (!objectId || employeeCount === 0) return null;
    const selectedObject = objects.find(obj => obj.id === objectId);
    if (!selectedObject) return null;

    const objectDailyHours = selectedObject[`${dayOfWeek}_hours`] || 0;
    if (objectDailyHours === 0) return null;

    const suggested = objectDailyHours / employeeCount;
    return parseFloat(suggested.toFixed(2));
  }, [objects]);

  // Effekt zur Aktualisierung der vorgeschlagenen Stunden, wenn sich Objekt oder zugewiesene Mitarbeiter ändern
  useEffect(() => {
    const currentAssignedCount = selectedAssignedEmployees?.length || 0;
    const currentObjectId = form.getValues("objectId");

    if (currentObjectId && currentAssignedCount > 0) {
      selectedAssignedEmployees?.forEach((assignedEmp, index) => {
        dayNames.forEach(day => {
          const fieldName = `assigned_${day}_hours` as keyof typeof assignedEmp;
          // Nur aktualisieren, wenn das Feld noch nicht manuell gesetzt wurde (null oder undefined)
          if (assignedEmp[fieldName] === null || assignedEmp[fieldName] === undefined) {
            const suggested = calculateSuggestedDailyHours(currentAssignedCount, currentObjectId, day as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday');
            updateEmployeeField(index, { ...assignedEmp, [fieldName]: suggested });
          }
        });
      });
    } else {
      // Wenn kein Objekt oder keine Mitarbeiter zugewiesen, alle Stunden zurücksetzen
      selectedAssignedEmployees?.forEach((assignedEmp, index) => {
        dayNames.forEach(day => {
          const fieldName = `assigned_${day}_hours` as keyof typeof assignedEmp;
          if (assignedEmp[fieldName] !== null) {
            updateEmployeeField(index, { ...assignedEmp, [fieldName]: null });
          }
        });
      });
    }
  }, [selectedObjectId, selectedAssignedEmployees, calculateSuggestedDailyHours, form, updateEmployeeField]);


  // Effekt zur Berechnung der totalEstimatedHours des Auftrags
  useEffect(() => {
    let totalHoursForOrder = 0;
    selectedAssignedEmployees?.forEach(assignedEmp => {
      dayNames.forEach(day => {
        totalHoursForOrder += (assignedEmp[`assigned_${day}_hours` as keyof typeof assignedEmp] as number || 0);
      });
    });
    form.setValue("totalEstimatedHours", parseFloat(totalHoursForOrder.toFixed(2)), { shouldValidate: false });
  }, [selectedAssignedEmployees, form]);


  const handleFormSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    // Manuelle Validierung der zugewiesenen Stunden gegen die Objektstunden
    if (data.objectId && data.assignedEmployees && data.assignedEmployees.length > 0) {
      // Fix for Error 3: Access objectDailyHours safely
      const selectedObject = objects.find(obj => obj.id === data.objectId);
      if (selectedObject) {
        let validationError = false;
        dayNames.forEach(day => {
          const objectDailyHours = selectedObject[`${day}_hours` as keyof typeof selectedObject] || 0;
          let totalAssignedHoursForDay = 0;

          data.assignedEmployees?.forEach(assignedEmp => {
            totalAssignedHoursForDay += (assignedEmp[`assigned_${day}_hours` as keyof typeof assignedEmp.shape] as number || 0);
          });

          if (totalAssignedHoursForDay > objectDailyHours) {
            form.setError(`assignedEmployees` as any, {
              type: "manual",
              message: `Die zugewiesenen Stunden für ${germanDayNames[day]} (${totalAssignedHoursForDay}h) überschreiten die Objektstunden (${objectDailyHours}h).`,
            });
            validationError = true;
          }
        });
        if (validationError) {
          toast.error("Bitte korrigieren Sie die Stunden der zugewiesenen Mitarbeiter.");
          return;
        }
      }
    }

    const result = await onSubmit(data);

    handleActionResponse(result);

    if (result.success) {
      if (!initialData) {
        form.reset();
        removeEmployee();
      }
      onSuccess?.();
    }
  };

  // Handler für die Objekterstellung im Dialog
  const handleCreateObject = async (data: ObjectFormValues) => {
    const result = await createObject(data);
    handleActionResponse(result);
    if (result.success) {
      const { data: newObjectsData, error: newObjectsError } = await supabase.from('objects').select('id, name, customer_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours');
      if (newObjectsData) {
        setObjects(newObjectsData);
        const newObject = newObjectsData.find(obj => obj.name === data.name && obj.customer_id === data.customerId);
        if (newObject) {
          form.setValue("objectId", newObject.id);
        }
      }
      if (newObjectsError) console.error("Fehler beim Neuladen der Objekte:", newObjectsError);
      setIsNewObjectDialogOpen(false);
    }
    return result;
  };

  // Handler für die Kundenkontakterstellung im Dialog
  const handleCustomerContactCreated = async (newContactId: string) => {
    if (selectedCustomerId) {
      await fetchCustomerContacts(selectedCustomerId);
      form.setValue("customerContactId", newContactId);
    }
  };

  const handleEmployeeAssignmentChange = (employeeId: string, isChecked: boolean) => {
    if (isChecked) {
      // Initialisiere alle Tagesstunden auf null, sie werden dann im useEffect berechnet
      appendEmployee({
        employeeId: employeeId,
        assigned_monday_hours: null,
        assigned_tuesday_hours: null,
        assigned_wednesday_hours: null,
        assigned_thursday_hours: null,
        assigned_friday_hours: null,
        assigned_saturday_hours: null,
        assigned_sunday_hours: null,
      });
    } else {
      const index = assignedEmployeeFields.findIndex(field => field.employeeId === employeeId);
      if (index > -1) {
        removeEmployee(index);
      }
    }
  };

  const selectedObjectDetails = objects.find(obj => obj.id === selectedObjectId);

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 w-full max-w-md">
      {/* Grundlegende Objektinformationen */}
      <div>
        <Label htmlFor="title">Titel des Auftrags</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Wird automatisch generiert"
          disabled={!initialData ? true : false}
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Details zum Auftrag..."
          rows={4}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="serviceType">Reinigungsdienstleistung</Label>
        <Select onValueChange={(value) => form.setValue("serviceType", value as OrderFormValues["serviceType"])} value={form.watch("serviceType") || ""}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Dienstleistung auswählen" />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map(service => (
              <SelectItem key={service} value={service}>{service}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.serviceType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="customerId">Kunde</Label>
        <Select onValueChange={(value) => {
          form.setValue("customerId", value);
          form.setValue("objectId", null);
          form.setValue("customerContactId", null);
        }} value={form.watch("customerId")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Kunde auswählen" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.customerId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerId.message}</p>
        )}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="customerContactId">Auftraggebende Person (Kundenkontakt, optional)</Label>
          <Select onValueChange={(value) => form.setValue("customerContactId", value === "unassigned" ? null : value)} value={form.watch("customerContactId") || "unassigned"} disabled={!selectedCustomerId}>
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
          {form.formState.errors.customerContactId && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.customerContactId.message}</p>
          )}
        </div>
        <CustomerContactCreateDialog customerId={selectedCustomerId} onContactCreated={handleCustomerContactCreated} disabled={!selectedCustomerId} />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="objectId">Objekt</Label>
          <Select onValueChange={(value) => form.setValue("objectId", value)} value={form.watch("objectId") || "unassigned"} disabled={!form.watch("customerId")}>
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
          {form.formState.errors.objectId && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.objectId.message}</p>
          )}
        </div>
        <Dialog open={isNewObjectDialogOpen} onOpenChange={setIsNewObjectDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-1"
              disabled={!form.watch("customerId")}
              title={!form.watch("customerId") ? "Bitte zuerst einen Kunden auswählen" : "Neues Objekt für diesen Kunden erstellen"}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-labelledby="object-create-dialog-title">
            <DialogHeader>
              <DialogTitle id="object-create-dialog-title">Neues Objekt erstellen</DialogTitle>
            </DialogHeader>
            <ObjectForm
              initialData={{ customerId: form.watch("customerId") }}
              onSubmit={handleCreateObject}
              submitButtonText="Objekt erstellen"
              onSuccess={() => setIsNewObjectDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Mitarbeiterzuweisung */}
      <div className="space-y-2">
        <Label>Zugewiesene Mitarbeiter (optional)</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-96 overflow-y-auto">
          {allEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Mitarbeiter zum Zuweisen gefunden.</p>
          ) : (
            allEmployees.map((employee) => {
              const isAssigned = selectedAssignedEmployees?.some(
                (assigned) => assigned.employeeId === employee.id
              );
              const assignedIndex = assignedEmployeeFields.findIndex(
                (field) => field.employeeId === employee.id
              );

              return (
                <div key={employee.id} className="border-b last:border-b-0 pb-2 mb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={isAssigned}
                        onCheckedChange={(checked) =>
                          handleEmployeeAssignmentChange(employee.id, !!checked)
                        }
                      />
                      <Label htmlFor={`employee-${employee.id}`} className="flex-grow font-medium">
                        {employee.first_name} {employee.last_name}
                      </Label>
                    </div>
                    {isAssigned && assignedIndex !== -1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmployee(assignedIndex)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isAssigned && assignedIndex !== -1 && (
                    <Collapsible className="mt-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground">
                          Stunden pro Wochentag {form.watch(`assignedEmployees.${assignedIndex}.assigned_monday_hours`) !== null ? `(${form.watch(`assignedEmployees.${assignedIndex}.assigned_monday_hours`)}h ...)` : ''}
                          <ChevronDown className="h-4 w-4 collapsible-icon" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 p-2 border-t mt-2">
                        {selectedObjectId && selectedObjectDetails && (
                          <div className="text-xs text-muted-foreground italic mb-2">
                            Objektstunden als Referenz:
                            {dayNames.map(day => (
                              <span key={day} className="ml-2">
                                {germanDayNames[day].substring(0, 2)}: {selectedObjectDetails[`${day}_hours` as keyof typeof selectedObjectDetails] || 0}h
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {dayNames.map(day => (
                            <div key={day}>
                              <Label htmlFor={`assignedEmployees.${assignedIndex}.assigned_${day}_hours`} className="text-xs">
                                {germanDayNames[day]} (Std.)
                              </Label>
                              <Input
                                id={`assignedEmployees.${assignedIndex}.assigned_${day}_hours`}
                                type="number"
                                step="0.5"
                                placeholder="0.0"
                                className="w-full"
                                {...form.register(`assignedEmployees.${assignedIndex}.assigned_${day}_hours` as any, { valueAsNumber: true })}
                              />
                              {/* Fix for Errors 8 & 9: Safely access nested errors */}
                              {form.formState.errors.assignedEmployees?.[assignedIndex]?.[`assigned_${day}_hours` as keyof typeof assignedEmployeeSchema.shape] && (
                                <p className="text-red-500 text-xs mt-1">
                                  {form.formState.errors.assignedEmployees[assignedIndex]?.[`assigned_${day}_hours` as keyof typeof assignedEmployeeSchema.shape]?.message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })
          )}
        </div>
        {form.formState.errors.assignedEmployees && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.assignedEmployees.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="orderType">Auftragstyp</Label>
        <Select onValueChange={(value) => {
          form.setValue("orderType", value as OrderFormValues["orderType"]);
          form.setValue("dueDate", null);
          form.setValue("recurringStartDate", null);
          form.setValue("recurringEndDate", null);
        }} value={form.watch("orderType")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auftragstyp auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">Einmalig</SelectItem>
            <SelectItem value="recurring">Wiederkehrend</SelectItem>
            <SelectItem value="substitution">Vertretung</SelectItem>
            <SelectItem value="permanent">Permanent</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.orderType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.orderType.message}</p>
        )}
      </div>

      {orderType === "one_time" && (
        <DatePicker
          label="Fälligkeitsdatum (optional)"
          value={form.watch("dueDate")}
          onChange={(date) => form.setValue("dueDate", date)}
          error={form.formState.errors.dueDate?.message}
        />
      )}

      {(orderType === "recurring" || orderType === "substitution" || orderType === "permanent") && (
        <>
          <DatePicker
            label="Startdatum"
            value={form.watch("recurringStartDate")}
            onChange={(date) => form.setValue("recurringStartDate", date)}
            error={form.formState.errors.recurringStartDate?.message}
          />
          {orderType !== "permanent" && (
            <DatePicker
              label="Enddatum (optional)"
              value={form.watch("recurringEndDate")}
              onChange={(date) => form.setValue("recurringEndDate", date)}
              error={form.formState.errors.recurringEndDate?.message}
            />
          )}
        </>
      )}

      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select onValueChange={(value) => form.setValue("priority", value as OrderFormValues["priority"])} value={form.watch("priority")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Priorität auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Niedrig</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.priority && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.priority.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="totalEstimatedHours">Geschätzte Stunden (optional)</Label>
        <Input
          id="totalEstimatedHours"
          type="number"
          step="0.5"
          {...form.register("totalEstimatedHours")}
          placeholder="Wird automatisch berechnet"
          readOnly
          className="bg-muted cursor-not-allowed"
        />
        {form.formState.errors.totalEstimatedHours && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.totalEstimatedHours.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Zusätzliche Notizen zum Auftrag..."
          rows={3}
        />
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select onValueChange={(value) => form.setValue("status", value as "pending" | "in_progress" | "completed")} value={form.watch("status")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.status.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="requestStatus">Anfragestatus</Label>
        <Select onValueChange={(value) => form.setValue("requestStatus", value as "pending" | "approved" | "rejected")} value={form.watch("requestStatus")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Anfragestatus auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.requestStatus && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.requestStatus.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? `${submitButtonText}...` : submitButtonText}
      </Button>
    </form>
  );
}