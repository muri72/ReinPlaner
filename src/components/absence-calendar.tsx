"use client";

import * as React from "react";
import { format, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAbsencesForMonth } from "@/app/dashboard/absence-requests/actions";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AbsencesByDay {
  [key: string]: { name: string; type: string }[];
}

const typeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const typeColors: { [key: string]: string } = {
  vacation: "bg-blue-200 text-blue-900",
  sick_leave: "bg-yellow-200 text-yellow-900",
  training: "bg-green-200 text-green-900",
  other: "bg-gray-200 text-gray-900",
};

export function AbsenceCalendar() {
  const [month, setMonth] = React.useState(new Date());
  const [absenceDetails, setAbsenceDetails] = React.useState<AbsencesByDay>({});
  const [vacationDays, setVacationDays] = React.useState<Date[]>([]);
  const [sickDays, setSickDays] = React.useState<Date[]>([]);
  const [trainingDays, setTrainingDays] = React.useState<Date[]>([]);
  const [otherDays, setOtherDays] = React.useState<Date[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAndProcessAbsences = async () => {
      setLoading(true);
      const result = await getAbsencesForMonth(month);
      if (result.success && result.data) {
        const details: AbsencesByDay = {};
        const vacation: Date[] = [];
        const sick: Date[] = [];
        const training: Date[] = [];
        const other: Date[] = [];

        result.data.forEach((absence: any) => {
          const interval = eachDayOfInterval({
            start: new Date(absence.start_date),
            end: new Date(absence.end_date),
          });
          interval.forEach((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            if (!details[dayKey]) {
              details[dayKey] = [];
            }
            details[dayKey].push({
              name: `${absence.employees?.first_name || ''} ${absence.employees?.last_name || ''}`.trim(),
              type: absence.type,
            });

            switch (absence.type) {
              case 'vacation': vacation.push(day); break;
              case 'sick_leave': sick.push(day); break;
              case 'training': training.push(day); break;
              default: other.push(day); break;
            }
          });
        });

        setAbsenceDetails(details);
        setVacationDays(vacation);
        setSickDays(sick);
        setTrainingDays(training);
        setOtherDays(other);
      }
      setLoading(false);
    };
    fetchAndProcessAbsences();
  }, [month]);

  const handlePrevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const handleNextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  function DayContent(props: { date: Date }) {
    const dayKey = format(props.date, "yyyy-MM-dd");
    const dayAbsences = absenceDetails[dayKey];

    if (!dayAbsences) {
      return <div className="p-2">{format(props.date, "d")}</div>;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-full h-full flex items-center justify-center cursor-pointer rounded-md">
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
        selected={undefined}
        modifiers={{
          vacation: vacationDays,
          sick: sickDays,
          training: trainingDays,
          other: otherDays,
        }}
        modifiersClassNames={{
          vacation: `${typeColors.vacation} rounded-md`,
          sick: `${typeColors.sick_leave} rounded-md`,
          training: `${typeColors.training} rounded-md`,
          other: `${typeColors.other} rounded-md`,
        }}
        components={{ DayContent }}
        className="w-full"
        locale={de}
      />
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {Object.entries(typeTranslations).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${typeColors[key]?.split(' ')[0]}`}></div>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}