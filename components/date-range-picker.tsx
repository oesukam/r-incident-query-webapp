'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: 'Today',
      getValue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return { from: today, to: new Date() };
      },
    },
    {
      label: 'This Week',
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        firstDay.setHours(0, 0, 0, 0);
        return { from: firstDay, to: new Date() };
      },
    },
    {
      label: 'This Month',
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: firstDay, to: new Date() };
      },
    },
    {
      label: 'Last 7 Days',
      getValue: () => {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0);
        return { from: lastWeek, to: new Date() };
      },
    },
    {
      label: 'Last 30 Days',
      getValue: () => {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);
        lastMonth.setHours(0, 0, 0, 0);
        return { from: lastMonth, to: new Date() };
      },
    },
    {
      label: 'Last 90 Days',
      getValue: () => {
        const today = new Date();
        const last90 = new Date(today);
        last90.setDate(last90.getDate() - 90);
        last90.setHours(0, 0, 0, 0);
        return { from: last90, to: new Date() };
      },
    },
  ];

  const formatDateRange = () => {
    if (!dateRange.from) return 'Select date range';
    if (!dateRange.to) return dateRange.from.toLocaleDateString();
    return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
  };

  const handlePresetClick = (preset: { label: string; getValue: () => DateRange }) => {
    const range = preset.getValue();
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleClearDates = () => {
    onDateRangeChange({ from: undefined, to: undefined });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start gap-2 text-left font-normal',
            !dateRange.from && 'text-muted-foreground'
          )}
        >
          <Calendar className="h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r border-border p-3">
            <div className="space-y-1">
              <p className="mb-2 text-sm font-semibold text-foreground">Quick Select</p>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start font-normal text-destructive hover:text-destructive"
                onClick={handleClearDates}
              >
                Clear Dates
              </Button>
            </div>
          </div>
          <div className="p-3">
            <CalendarComponent
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range) {
                  onDateRangeChange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
