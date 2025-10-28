"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Search, 
  Filter,
  X,
  ChevronDown,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  avatar_url?: string;
  totalHours: number;
  plannedHours: number;
  status: 'available' | 'busy' | 'off';
  skills?: string[];
}

interface MobileEmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee?: string | null;
  onEmployeeSelect?: (employeeId: string) => void;
  onFilterChange?: (filters: any) => void;
  showWorkload?: boolean;
  compact?: boolean;
}

export function MobileEmployeeSelector({ 
  employees, 
  selectedEmployee, 
  onEmployeeSelect, 
  onFilterChange,
  showWorkload = true,
  compact = false 
}: MobileEmployeeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkills = selectedSkills.length === 0 || 
      employee.skills?.some(skill => selectedSkills.includes(skill));
    
    return matchesSearch && matchesSkills;
  });

  const getWorkloadColor = (planned: number, total: number) => {
    const percentage = total > 0 ? (planned / total) * 100 : 0;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return { variant: 'default' as const, text: 'Verfügbar' };
      case 'busy': return { variant: 'secondary' as const, text: 'Beschäftigt' };
      case 'off': return { variant: 'outline' as const, text: 'Abwesend' };
      default: return { variant: 'outline' as const, text: status };
    }
  };

  const commonSkills = ['Reinigung', 'Fensterputzen', 'Büroreinigung', 'Teppichböden', 'Sanitär'];

  if (compact) {
    return (
      <div className="space-y-2">
        {filteredEmployees.slice(0, 3).map((employee) => (
          <Button
            key={employee.id}
            variant={selectedEmployee === employee.id ? 'default' : 'outline'}
            onClick={() => onEmployeeSelect?.(employee.id)}
            className={cn(
              "w-full justify-start h-12 p-3",
              selectedEmployee === employee.id && "ring-2 ring-primary"
            )}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={employee.avatar_url} alt={employee.name} />
                <AvatarFallback className="text-xs">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-medium text-sm">{employee.name}</div>
                {showWorkload && (
                  <div className="text-xs text-muted-foreground">
                    {employee.plannedHours.toFixed(1)}h / {employee.totalHours.toFixed(1)}h
                  </div>
                )}
              </div>
            </div>
          </Button>
        ))}
        {filteredEmployees.length > 3 && (
          <Button
            variant="outline"
            onClick={() => setShowFilters(true)}
            className="w-full"
          >
            Weitere ({filteredEmployees.length - 3})
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Mitarbeiter
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="mobile-tap-target"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Mitarbeiter suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-sm mobile-input"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filter</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Skills Filter */}
            <div>
              <h4 className="text-sm font-medium mb-2">Fähigkeiten</h4>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill) => (
                  <Button
                    key={skill}
                    variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSkills(prev => 
                        prev.includes(skill) 
                          ? prev.filter(s => s !== skill)
                          : [...prev, skill]
                      );
                    }}
                    className="text-xs mobile-tap-target"
                  >
                    {skill}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Keine Mitarbeiter gefunden</p>
              <p className="text-sm">Versuchen Sie, Ihre Suchkriterien anzupassen</p>
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const statusBadge = getStatusBadge(employee.status);
              const workloadColor = getWorkloadColor(employee.plannedHours, employee.totalHours);
              
              return (
                <div
                  key={employee.id}
                  onClick={() => onEmployeeSelect?.(employee.id)}
                  className={cn(
                    "bg-card border rounded-lg p-4 cursor-pointer transition-all duration-200 mobile-tap-target",
                    selectedEmployee === employee.id && "ring-2 ring-primary",
                    "hover:shadow-md active:scale-95"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.avatar_url} alt={employee.name} />
                      <AvatarFallback className="text-sm font-medium">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{employee.name}</h4>
                          {employee.skills && employee.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {employee.skills.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {employee.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{employee.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge {...statusBadge} className="text-xs" />
                          {showWorkload && (
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Auslastung</div>
                              <div className={cn("text-sm font-bold", workloadColor)}>
                                {employee.totalHours > 0 
                                  ? `${((employee.plannedHours / employee.totalHours) * 100).toFixed(0)}%`
                                  : '0%'
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}