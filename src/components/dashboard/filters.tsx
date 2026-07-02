"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export function Filters({ categories, search, category, dateFrom, dateTo, onSearchChange, onCategoryChange, onDateChange }: FiltersProps) {
  const quickOptions = [
    { label: "7d", from: daysAgo(7), to: today() },
    { label: "30d", from: daysAgo(30), to: today() },
    { label: "This Month", from: monthStart(), to: today() },
    { label: "All", from: "", to: "" },
  ];

  const isActive = (opt: typeof quickOptions[number]) => {
    if (opt.from === "" && opt.to === "") return dateFrom === "" && dateTo === "";
    return dateFrom === opt.from && dateTo === opt.to;
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input placeholder="Search transactions..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-10" />
      </div>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1.5">
        {quickOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={isActive(opt) ? "default" : "outline"}
            size="sm"
            onClick={() => onDateChange(opt.from, opt.to)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateChange(e.target.value, dateTo)}
          className="w-[140px] h-8 text-xs"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateChange(dateFrom, e.target.value)}
          className="w-[140px] h-8 text-xs"
        />
      </div>
    </div>
  );
}
