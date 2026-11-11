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
import { Globe, Check } from 'lucide-react';

export function CurrencyToggle() {
  const { currency, setCurrency, ratesLive } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Ghost-on-navy treatment: the toggle lives only in the classic
            navy app bars (CEO decision 2026-11-11). */}
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2 md:px-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 border-white/30 text-white shadow-none">
          <Globe className="h-3.5 w-3.5 text-white" />
          {/* Full "K (ZMW)" label from md up; below md the header cluster
              only has room for the symbol — the menu still names every
              currency in full. (Responsive shell fix, 2026-11-11.) */}
          <span className="hidden md:inline">{currency === 'ZMW' ? 'K (ZMW)' : currency === 'USD' ? '$ (USD)' : currency}</span>
          <span className="md:hidden">{currency === 'ZMW' ? 'K' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'KES' ? 'KSh' : currency === 'NGN' ? '₦' : currency === 'ZAR' ? 'R' : currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-[70] text-xs">
        <DropdownMenuLabel className="text-[13px] font-medium text-muted-foreground">
          Display Currency · ZMW default
        </DropdownMenuLabel>
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          {ratesLive ? 'Live bank rates · charges settle in ZMW' : 'Loading live rates… · charges settle in ZMW'}
        </p>
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
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
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
