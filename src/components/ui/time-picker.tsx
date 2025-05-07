
import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({ 
  value, 
  onChange, 
  className,
  disabled = false
}: TimePickerProps) {
  // Parse the time string into hours and minutes
  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  };

  // Format hours and minutes into a time string
  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const { hours, minutes } = parseTime(value);

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Only validate and update if the input matches the time format
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  // Increment or decrement hours
  const adjustHours = (amount: number) => {
    let newHours = (hours + amount) % 24;
    if (newHours < 0) newHours += 24;
    onChange(formatTime(newHours, minutes));
  };

  // Increment or decrement minutes
  const adjustMinutes = (amount: number) => {
    let newMinutes = (minutes + amount) % 60;
    if (newMinutes < 0) newMinutes += 60;
    onChange(formatTime(hours, newMinutes));
  };

  // Common time shortcuts
  const timePresets = [
    { label: "Morning", value: "08:00" },
    { label: "Noon", value: "12:00" },
    { label: "Evening", value: "18:00" },
    { label: "Night", value: "22:00" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "flex-1 justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hours">Hours</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustHours(-1)}
                >
                  -
                </Button>
                <span className="w-8 text-center">{hours.toString().padStart(2, "0")}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustHours(1)}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="minutes">Minutes</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustMinutes(-5)}
                >
                  -
                </Button>
                <span className="w-8 text-center">{minutes.toString().padStart(2, "0")}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => adjustMinutes(5)}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {timePresets.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(preset.value);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-time">Custom</Label>
            <Input 
              id="custom-time" 
              value={value} 
              onChange={handleInputChange} 
              placeholder="HH:MM"
              pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePicker;
