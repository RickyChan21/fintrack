"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FiltersProps {
  categories: string[];
  search: string;
  category: string;
  days: number | null;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDaysChange: (v: number | null) => void;
}

export function Filters({ categories, search, category, days, onSearchChange, onCategoryChange, onDaysChange }: FiltersProps) {
  const dateOptions = [
    { label: "7d", value: 7 },
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
    { label: "All", value: null },
  ] as const;

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
        {dateOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={days === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => onDaysChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
