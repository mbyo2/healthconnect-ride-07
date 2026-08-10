import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/hooks/use-currency';
import { Globe, DollarSign, Check } from 'lucide-react';

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs font-bold bg-background/80 hover:bg-accent border-border shadow-xs">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span>{currency === 'ZMW' ? 'K (ZMW)' : currency === 'USD' ? '$ (USD)' : currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[70] text-xs">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase">
          Switch Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Quick Toggle: ZMW <-> USD */}
        <DropdownMenuItem
          onClick={() => setCurrency('ZMW')}
          className="flex items-center justify-between cursor-pointer font-medium"
        >
          <span className="flex items-center gap-2">
            <span className="font-bold text-primary w-5">K</span>
            ZMW (Zambian Kwacha)
          </span>
          {currency === 'ZMW' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setCurrency('USD')}
          className="flex items-center justify-between cursor-pointer font-medium"
        >
          <span className="flex items-center gap-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 w-5">$</span>
            USD (US Dollar)
          </span>
          {currency === 'USD' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
          Other Global Currencies
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => setCurrency('EUR')} className="flex items-center justify-between cursor-pointer">
          <span>€ EUR (Euro)</span>
          {currency === 'EUR' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setCurrency('GBP')} className="flex items-center justify-between cursor-pointer">
          <span>£ GBP (British Pound)</span>
          {currency === 'GBP' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setCurrency('KES')} className="flex items-center justify-between cursor-pointer">
          <span>KSh KES (Kenyan Shilling)</span>
          {currency === 'KES' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setCurrency('NGN')} className="flex items-center justify-between cursor-pointer">
          <span>₦ NGN (Nigerian Naira)</span>
          {currency === 'NGN' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setCurrency('ZAR')} className="flex items-center justify-between cursor-pointer">
          <span>R ZAR (South African Rand)</span>
          {currency === 'ZAR' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
