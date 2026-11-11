import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from './LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(val) => setLanguage(val as any)}>
      {/*
        Responsive width: the fixed 140px trigger overflowed phone headers
        (the selector fell off-screen below ~500px). Below sm the trigger is
        icon-only (globe, 36px); the full labelled select returns at sm+.
        The chevron + value are hidden in icon-only mode so the 36px box
        contains exactly the globe.
        WHY A <div> WRAPS THE VALUE (bug fix 2026-11-11): the shared
        SelectTrigger base applies `[&>span]:line-clamp-1` to direct span
        children, and line-clamp sets `display: -webkit-box` — specificity
        (0,1,1) BEATS the value wrapper's `.hidden` (0,1,0), so a <span>
        wrapper's display:none never applied and the label ("En…") kept
        rendering at phone widths, overflowing the header budget (CEO
        phone screenshot 2026-11-11 17:06). A <div> is not matched by
        `[&>span]`, so `hidden` holds. `overflow-hidden` on the trigger is
        the belt-and-braces: content can never paint outside the 36px box.
      */}
      <SelectTrigger
        className="w-9 shrink-0 justify-center gap-0 px-0 overflow-hidden sm:w-[140px] sm:justify-between sm:gap-2 sm:px-3 [&>svg:last-of-type]:hidden sm:[&>svg:last-of-type]:block"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 shrink-0" />
        <div className="hidden min-w-0 sm:block">
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
