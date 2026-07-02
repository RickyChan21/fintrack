"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface FiltersProps {
  categories: string[];
  search: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDateChange: (from: string, to: string) => void;
}

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

const presets = [
  { label: "7d", from: () => daysAgo(7), to: () => today() },
  { label: "30d", from: () => daysAgo(30), to: () => today() },
  { label: "MTD", from: () => monthStart(), to: () => today() },
  { label: "All", from: () => "", to: () => "" },
];

export function Filters({ categories, search, category, dateFrom, dateTo, onSearchChange, onCategoryChange, onDateChange }: FiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  });

  const isCustom = dateFrom && !presets.some((p) => p.from() === dateFrom && p.to() === dateTo);

  const handleCustomApply = () => {
    if (date.from && date.to) {
      onDateChange(format(date.from, "yyyy-MM-dd"), format(date.to, "yyyy-MM-dd"));
    }
    setCalendarOpen(false);
  };

  const formatRange = () => {
    if (date.from && date.to) return `${format(date.from, "MMM d")} - ${format(date.to, "MMM d")}`;
    return "Custom";
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input placeholder="Search transactions..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10" />
      </div>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5">
        {presets.map((p) => {
          const active = p.from() === dateFrom && p.to() === dateTo;
          return (
            <button
              key={p.label}
              onClick={() => onDateChange(p.from(), p.to())}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isCustom ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              <span>{isCustom ? formatRange() : "Custom"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <Calendar
              mode="range"
              selected={{ from: date.from, to: date.to }}
              onSelect={(range) => setDate({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCustomApply} disabled={!date.from || !date.to}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
