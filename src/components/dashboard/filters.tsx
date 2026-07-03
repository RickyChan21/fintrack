"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
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
  availableMonths?: string[];
  selectedMonth?: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDateChange: (from: string, to: string) => void;
  onMonthChange?: (month: string) => void;
}

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

const presets = [
  { label: "7d", from: () => daysAgo(7), to: () => today() },
  { label: "MTD", from: () => monthStart(), to: () => today() },
  { label: "All", from: () => "", to: () => "" },
];

export function Filters({ categories, search, category, dateFrom, dateTo, availableMonths = [], selectedMonth = "", onSearchChange, onCategoryChange, onDateChange, onMonthChange }: FiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(() => {
    if (dateFrom && dateTo) return { from: new Date(dateFrom), to: new Date(dateTo) };
    return undefined;
  });

  const isCustom = dateFrom && !presets.some((p) => p.from() === dateFrom && p.to() === dateTo) && !selectedMonth;

  const handlePreset = (from: string, to: string) => {
    onDateChange(from, to);
    if (onMonthChange) onMonthChange("");
  };

  const handleCustomApply = () => {
    if (tempRange?.from && tempRange?.to) {
      onDateChange(format(tempRange.from, "yyyy-MM-dd"), format(tempRange.to, "yyyy-MM-dd"));
    }
    if (onMonthChange) onMonthChange("");
    setCalendarOpen(false);
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
        {presets.map((p, i) => {
          const active = p.from() === dateFrom && p.to() === dateTo;
          return (
            <span key={p.label} className="contents">
              <button
                onClick={() => handlePreset(p.from(), p.to())}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
              {p.label === "MTD" && onMonthChange && availableMonths.length > 0 && (
                <Select value={selectedMonth} onValueChange={(v) => onMonthChange(v)}>
                  <SelectTrigger
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors h-auto min-h-0 border-0 shadow-none focus:ring-0 gap-1",
                      selectedMonth ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </span>
          );
        })}
        <Popover open={calendarOpen} onOpenChange={(open) => {
          setCalendarOpen(open);
          if (open) {
            setTempRange(
              dateFrom && dateTo
                ? { from: new Date(dateFrom), to: new Date(dateTo) }
                : undefined
            );
          }
        }}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                isCustom ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span className="whitespace-nowrap">{isCustom && dateFrom && dateTo ? `${format(new Date(dateFrom), "MMM d")} - ${format(new Date(dateTo), "MMM d")}` : "Custom"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <Calendar
              mode="range"
              defaultMonth={tempRange?.from}
              selected={tempRange}
              onSelect={setTempRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCustomApply} disabled={!tempRange?.from || !tempRange?.to}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
