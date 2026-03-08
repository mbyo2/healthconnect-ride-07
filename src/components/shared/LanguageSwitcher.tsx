import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableLocales, getLocale, setLocale, type Locale } from '@/utils/i18n';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const locales = getAvailableLocales();
  const [current, setCurrent] = React.useState<Locale>(getLocale());

  const handleChange = (value: string) => {
    const locale = value as Locale;
    setLocale(locale);
    setCurrent(locale);
    // Trigger re-render across the app
    window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }));
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map(l => (
            <SelectItem key={l.code} value={l.code}>
              {l.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
