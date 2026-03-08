import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/use-currency";

export const CurrencySelector = () => {
  const { currency, setCurrency, detectedCountry } = useCurrency();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <Globe className="h-4 w-4" />
        Display Currency
      </Label>
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {SUPPORTED_CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {detectedCountry && (
        <p className="text-xs text-muted-foreground">
          Auto-detected from your location ({detectedCountry})
        </p>
      )}
    </div>
  );
};
