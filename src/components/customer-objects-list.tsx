"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

interface ObjectData {
  id: string;
  name: string;
  address: string | null;
  priority: string;
}

interface CustomerObjectsListProps {
  objects: ObjectData[];
}

export function CustomerObjectsList({ objects }: CustomerObjectsListProps) {
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  if (objects.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Building className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-base font-semibold">Keine Objekte für diesen Kunden gefunden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Priorität</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((object) => (
            <TableRow key={object.id}>
              <TableCell className="font-medium">{object.name}</TableCell>
              <TableCell>{object.address || 'N/A'}</TableCell>
              <TableCell><Badge variant={getPriorityBadgeVariant(object.priority)}>{object.priority}</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/objects?query=${object.name}`}>
                    Zum Objekt
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}