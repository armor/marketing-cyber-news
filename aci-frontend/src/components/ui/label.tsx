/**
 * Label Component
 *
 * Accessible label component for form inputs.
 * Built on native HTML label element with consistent styling.
 */

import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  readonly required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={className}
        style={{
          display: 'block',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-medium)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-gap-xs)',
          ...props.style,
        }}
        {...props}
      >
        {children}
        {required && (
          <span
            style={{
              color: 'var(--color-semantic-error)',
              marginLeft: 'var(--spacing-gap-xs)',
            }}
            aria-label="required"
          >
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };
