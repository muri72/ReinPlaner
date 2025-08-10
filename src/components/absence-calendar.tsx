"use client";

import * as React from "react";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAbsencesForMonth } from "@/app/dashboard/absence-requests/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AbsenceData {
  start_date: string;
  end_date: string;
  type: string;
  employees: { first_name: string | null; last_name: string | null } | null;
}

interface AbsencesByDay {
  [key: string]: { name: string; type: string }[];
}

export function AbsenceCalendar() {
  const [month, setMonth] = React.useState(new Date());
  const [absences, setAbsences] = React.useState<AbsencesByDay>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAndProcessAbsences = async () => {
      setLoading(true);
      const result = await getAbsencesForMonth(month);
      if (result.success && result.data) {
        const processedAbsences: AbsencesByDay = {};
        result.data.forEach((absence: any) => {
          const interval = eachDayOfInterval({
            start: new Date(absence.start_date),
            end: new Date(absence.end_date),
          });
          interval.forEach((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            if (!processedAbsences[dayKey]) {
              processedAbsences[dayKey] = [];
            }
            processedAbsences[dayKey].push({
              name: `${absence.employees?.first_name || ''} ${absence.employees?.last_name || ''}`.trim(),
              type: absence.type,
            });
          });
        });
        setAbsences(processedAbsences);
      }
      setLoading(false);
    };
    fetchAndProcessAbsences();
  }, [month]);

  const absentDays = Object.keys(absences).map((dayStr) => new Date(dayStr));

  const handlePrevMonth = () => {
    setMonth(new Date(month.setMonth(month.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setMonth(new Date(month.setMonth(month.getMonth() + 1)));
  };
  
  const typeTranslations: { [key: string]: string } = {
    vacation: "Urlaub",
    sick_leave: "Krank",
    training: "Schulung",
    other: "Sonstiges",
  };

  function DayContent(props: { date: Date }) {
    const dayKey = format(props.date, "yyyy-MM-dd");
    const dayAbsences = absences[dayKey];

    if (!dayAbsences) {
      return <div className="p-2">{format(props.date, "d")}</div>;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-full h-full flex items-center justify-center cursor-pointer">
            {format(props.date, "d")}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-60">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Abwesenheiten am {format(props.date, "dd.MM.yyyy")}</h4>
            <div className="space-y-1">
              {dayAbsences.map((absence, index) => (
                <div key={index} className="text-sm">
                  <span className="font-semibold">{absence.name}:</span> {typeTranslations[absence.type] || absence.type}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
       <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(month, "MMMM yyyy", { locale: de })}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={undefined} // We don't need to select a single day
        modifiers={{ absent: absentDays }}
        modifiersClassNames={{
          absent: "bg-destructive/20 text-destructive-foreground rounded-md",
        }}
        components={{
          DayContent: DayContent,
        }}
        className="w-full"
        locale={de}
      />
    </div>
  );
}