import React from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';

interface MobileOptimizedFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  children?: React.ReactNode;
  className?: string;
  submitText?: string;
  loading?: boolean;
  loadingText?: string;
}

export const MobileOptimizedForm: React.FC<MobileOptimizedFormProps> = ({
  form,
  onSubmit,
  children,
  className,
  submitText = "Submit",
  loading = false,
  loadingText = "Loading..."
}) => {
  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className={cn("space-y-3 sm:space-y-4", className)}
      >
        {children}
        <Button 
          type="submit" 
          className="w-full h-11 text-base font-medium mt-6"
          disabled={loading}
        >
          {loading ? loadingText : submitText}
        </Button>
      </form>
    </Form>
  );
};

interface MobileFormFieldProps {
  control: any;
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
}

export const MobileFormField: React.FC<MobileFormFieldProps> = ({
  control,
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  className,
  inputClassName
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-1.5", className)}>
          <FormLabel className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              className={cn(
                "h-11 text-base border-input bg-background",
                "focus:border-primary focus:ring-1 focus:ring-primary",
                "placeholder:text-muted-foreground/60",
                inputClassName
              )}
              {...field}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
};

interface MobileFormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2;
  className?: string;
}

export const MobileFormGrid: React.FC<MobileFormGridProps> = ({
  children,
  cols = 2,
  className
}) => {
  return (
    <div className={cn(
      "grid gap-3 sm:gap-4",
      cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
      className
    )}>
      {children}
    </div>
  );
};

export default MobileOptimizedForm;
