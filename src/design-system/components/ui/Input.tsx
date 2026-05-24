import React, { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, min, onWheel, ...props }, ref) => {
    const isNumber = type === 'number';
    return (
      <input
        ref={ref}
        type={type}
        min={isNumber ? (min ?? 0) : min}
        className={`input-field ${className}`}
        onWheel={isNumber ? (e) => e.currentTarget.blur() : onWheel}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
