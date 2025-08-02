import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeText, validateSQLParam } from "@/utils/input-validation";
import { logSecurityEvent, SecurityEvents } from "@/utils/security-service";

export interface SecureInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  enableXSSProtection?: boolean;
  enableSQLProtection?: boolean;
  maxLength?: number;
  onSecurityViolation?: (violation: string) => void;
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    className, 
    type, 
    value,
    onChange,
    enableXSSProtection = true,
    enableSQLProtection = true,
    maxLength = 255,
    onSecurityViolation,
    ...props 
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Length validation
      if (inputValue.length > maxLength) {
        inputValue = inputValue.substring(0, maxLength);
        onSecurityViolation?.('Input exceeded maximum length');
      }
      
      // XSS Protection
      if (enableXSSProtection && inputValue !== sanitizeText(inputValue)) {
        onSecurityViolation?.('Potential XSS attempt detected');
        logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
          reason: 'xss_attempt',
          input: inputValue,
          sanitized: sanitizeText(inputValue),
        });
        inputValue = sanitizeText(inputValue);
      }
      
      // SQL Injection Protection
      if (enableSQLProtection && !validateSQLParam(inputValue)) {
        onSecurityViolation?.('Potential SQL injection attempt detected');
        logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
          reason: 'sql_injection_attempt',
          input: inputValue,
        });
        // Don't allow the input
        return;
      }
      
      // Update the event with sanitized value
      const sanitizedEvent = {
        ...e,
        target: {
          ...e.target,
          value: inputValue,
        },
      };
      
      onChange?.(sanitizedEvent as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        {...props}
      />
    );
  }
);

SecureInput.displayName = "SecureInput";

export { SecureInput };