import type { ReactNode } from 'react';

interface FormFieldProps {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}

/**
 * Generic form field wrapper: label + input slot + inline error or hint.
 * Error takes priority over hint when both are provided.
 *
 * Usage:
 *   <FormField label="Name" htmlFor="name" error={errors.name} required>
 *     <input id="name" className={`form-input${errors.name ? ' has-error' : ''}`} ... />
 *   </FormField>
 */
export function FormField({ label, htmlFor, error, hint, required, className, children }: FormFieldProps) {
    return (
        <div className={`form-group${className ? ` ${className}` : ''}`}>
            <label className="form-label" htmlFor={htmlFor}>
                {label}{required && ' *'}
            </label>
            {children}
            {error
                ? <span className="field-error">{error}</span>
                : hint
                    ? <span className="form-hint">{hint}</span>
                    : null
            }
        </div>
    );
}
