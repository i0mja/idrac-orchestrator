import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const timezones = [
  { value: "UTC", label: "UTC - Coordinated Universal Time" },
  { value: "America/New_York", label: "America/New_York - Eastern Time" },
  { value: "America/Chicago", label: "America/Chicago - Central Time" },
  { value: "America/Denver", label: "America/Denver - Mountain Time" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles - Pacific Time" },
  { value: "America/Phoenix", label: "America/Phoenix - Arizona Time" },
  { value: "America/Toronto", label: "America/Toronto - Eastern Canada" },
  { value: "America/Vancouver", label: "America/Vancouver - Pacific Canada" },
  { value: "Europe/London", label: "Europe/London - GMT/BST" },
  { value: "Europe/Paris", label: "Europe/Paris - Central European Time" },
  { value: "Europe/Berlin", label: "Europe/Berlin - Central European Time" },
  { value: "Europe/Rome", label: "Europe/Rome - Central European Time" },
  { value: "Europe/Madrid", label: "Europe/Madrid - Central European Time" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam - Central European Time" },
  { value: "Europe/Zurich", label: "Europe/Zurich - Central European Time" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm - Central European Time" },
  { value: "Europe/Oslo", label: "Europe/Oslo - Central European Time" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki - Eastern European Time" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw - Central European Time" },
  { value: "Europe/Prague", label: "Europe/Prague - Central European Time" },
  { value: "Europe/Vienna", label: "Europe/Vienna - Central European Time" },
  { value: "Europe/Budapest", label: "Europe/Budapest - Central European Time" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest - Eastern European Time" },
  { value: "Europe/Athens", label: "Europe/Athens - Eastern European Time" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul - Turkey Time" },
  { value: "Europe/Moscow", label: "Europe/Moscow - Moscow Standard Time" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo - Japan Standard Time" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai - China Standard Time" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong - Hong Kong Time" },
  { value: "Asia/Singapore", label: "Asia/Singapore - Singapore Time" },
  { value: "Asia/Seoul", label: "Asia/Seoul - Korea Standard Time" },
  { value: "Asia/Mumbai", label: "Asia/Mumbai - India Standard Time" },
  { value: "Asia/Dubai", label: "Asia/Dubai - Gulf Standard Time" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh - Arabia Standard Time" },
  { value: "Australia/Sydney", label: "Australia/Sydney - Australian Eastern Time" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne - Australian Eastern Time" },
  { value: "Australia/Perth", label: "Australia/Perth - Australian Western Time" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland - New Zealand Time" },
];

interface TimezoneSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function TimezoneSelect({
  value,
  onValueChange,
  placeholder = "Select timezone...",
}: TimezoneSelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? timezones.find((timezone) => timezone.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {timezones.map((timezone) => (
                <CommandItem
                  key={timezone.value}
                  value={timezone.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === timezone.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {timezone.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}