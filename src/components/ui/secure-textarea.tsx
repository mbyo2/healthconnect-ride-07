import * as React from "react";
import { cn } from "@/lib/utils";
import { validateRichTextContent } from "@/utils/input-validation";
import { logSecurityEvent, SecurityEvents } from "@/utils/security-service";

export interface SecureTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  enableContentValidation?: boolean;
  maxLength?: number;
  onSecurityViolation?: (violation: string) => void;
}

const SecureTextarea = React.forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ 
    className, 
    value,
    onChange,
    enableContentValidation = true,
    maxLength = 2000,
    onSecurityViolation,
    ...props 
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let inputValue = e.target.value;
      
      // Length validation
      if (inputValue.length > maxLength) {
        inputValue = inputValue.substring(0, maxLength);
        onSecurityViolation?.('Content exceeded maximum length');
      }
      
      // Rich text content validation
      if (enableContentValidation) {
        const { valid, sanitized } = validateRichTextContent(inputValue);
        
        if (!valid) {
          onSecurityViolation?.('Content too long or contains invalid elements');
          inputValue = sanitized.substring(0, maxLength);
        } else if (inputValue !== sanitized) {
          onSecurityViolation?.('Potentially dangerous content removed');
          logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
            reason: 'dangerous_content_detected',
            original: inputValue,
            sanitized,
          });
          inputValue = sanitized;
        }
      }
      
      // Update the event with sanitized value
      const sanitizedEvent = {
        ...e,
        target: {
          ...e.target,
          value: inputValue,
        },
      };
      
      onChange?.(sanitizedEvent as React.ChangeEvent<HTMLTextAreaElement>);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

SecureTextarea.displayName = "SecureTextarea";

export { SecureTextarea };