import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
  control?: any
}

// Default to undefined so we can detect missing provider and give clearer errors
const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name, control: (props as any).control }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)

  // If contexts are missing, return safe defaults and warn instead of crashing
  if (!fieldContext || !itemContext) {
    // eslint-disable-next-line no-console
    console.warn('[ui/form] Form context missing. Make sure your fields are wrapped with <Form>, <FormItem> and <FormField>. Falling back to safe defaults.')

    const fallbackId = React.useId()
    const fallbackState = {
      invalid: false,
      isTouched: false,
      isDirty: false,
      error: undefined,
    }

    return {
      id: fallbackId,
      name: fieldContext?.name ?? ('unknown' as any),
      formItemId: `${fallbackId}-form-item`,
      formDescriptionId: `${fallbackId}-form-item-description`,
      formMessageId: `${fallbackId}-form-item-message`,
      ...fallbackState,
    }
  }

  // Guard useFormContext: if the component is not wrapped with FormProvider this
  // can throw or return undefined depending on react-hook-form version/build.
  let formContext: any
  try {
    formContext = useFormContext()
  } catch (err) {
    formContext = undefined
  }

  if (!formContext || typeof formContext.getFieldState !== 'function') {
    // eslint-disable-next-line no-console
    console.warn('[ui/form] useFormContext is not available. Returning empty field state to avoid crash.')

    const fallbackId = React.useId()
    const fallbackState = {
      invalid: false,
      isTouched: false,
      isDirty: false,
      error: undefined,
    }

    return {
      id: fallbackId,
      name: fieldContext.name,
      formItemId: `${fallbackId}-form-item`,
      formDescriptionId: `${fallbackId}-form-item-description`,
      formMessageId: `${fallbackId}-form-item-message`,
      ...fallbackState,
    }
  }

  const { getFieldState, formState } = formContext

  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | undefined>(
  undefined
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
