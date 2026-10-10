import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import {
  getCountryCompliance,
  getSupportedCountries,
  type CountryCompliance,
} from "@/utils/country-compliance";

interface CountrySelectorProps {
  value?: string;
  onChange?: (countryCode: string, compliance: CountryCompliance) => void;
  showDetails?: boolean;
}

/**
 * Country selector with automatic compliance configuration.
 *
 * When a user picks a country, the platform automatically applies:
 * - The statutory health insurance framework (NHIMA, SHA, NHIF, etc.)
 * - VAT/tax rules for invoicing
 * - Data protection requirements
 * - Currency and mobile money operators
 * - Medical regulatory references
 */
export function CountrySelector({ value, onChange, showDetails = true }: CountrySelectorProps) {
  const [selected, setSelected] = useState(value || "ZM");
  const countries = getSupportedCountries();
  const compliance = getCountryCompliance(selected);

  useEffect(() => {
    if (value && value !== selected) setSelected(value);
  }, [value]);

  const handleChange = (code: string) => {
    setSelected(code);
    onChange?.(code, getCountryCompliance(code));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm font-bold mb-2">
          <Globe className="h-4 w-4" />
          Country
        </label>
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-graphite-300 bg-white font-medium"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} — {c.currency}
            </option>
          ))}
        </select>
      </div>

      {showDetails && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3 text-sm">
          <p className="font-bold text-blue-900 dark:text-blue-200">
            {compliance.name} compliance auto-configured
          </p>

          {compliance.statutoryScheme ? (
            <div>
              <p className="font-semibold">Health insurance: {compliance.statutoryScheme.shortName}</p>
              <p className="text-xs text-muted-foreground">
                {compliance.statutoryScheme.mandatory ? "Mandatory. " : "Voluntary. "}
                {compliance.statutoryScheme.notes.split(".")[0]}.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold">Health insurance: no statutory scheme</p>
              <p className="text-xs text-muted-foreground">
                Private medical aid only. Billing defaults to cash/private rates.
              </p>
            </div>
          )}

          <div>
            <p className="font-semibold">
              Tax: {compliance.vat.name} {compliance.vat.rate}%
              {compliance.vat.medicalExempt && " (medical exempt)"}
            </p>
          </div>

          <div>
            <p className="font-semibold">Currency: {compliance.currencySymbol} ({compliance.currencyCode})</p>
            <p className="text-xs text-muted-foreground">
              Mobile money: {compliance.mobileMoney.map((m) => m.operator).join(", ")}
            </p>
          </div>

          <div>
            <p className="font-semibold">Data: {compliance.dataProtection.law}</p>
          </div>

          <div>
            <p className="font-semibold">Regulator: {compliance.medicalRegulator}</p>
          </div>

          <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-blue-200 dark:border-blue-800">
            Indicative compliance data only — not legal, tax, or insurance advice.
            Verify tariffs with the insurer and regulatory requirements with local
            counsel before billing.
          </p>
        </div>
      )}
    </div>
  );
}
