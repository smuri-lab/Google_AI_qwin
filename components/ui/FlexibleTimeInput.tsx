import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { HoursMinutesInput } from './HoursMinutesInput';

interface FlexibleTimeInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  format: 'decimal' | 'hoursMinutes';
  disabled?: boolean;
}

export const FlexibleTimeInput: React.FC<FlexibleTimeInputProps> = ({ label, value, onChange, format, disabled }) => {
  if (format === 'decimal') {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (typeof value === 'number') {
            setDisplayValue(value.toFixed(2).replace('.', ','));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const strValue = e.target.value;
        setDisplayValue(strValue);

        if (strValue.trim() === '' || strValue.trim() === '-') {
            onChange(0);
            return;
        }

        const parsedValue = parseFloat(strValue.replace(',', '.'));
        if (!isNaN(parsedValue)) {
            onChange(parsedValue);
        }
    };

    return (
        <div className="relative">
            <Input
                label={label}
                type="text"
                value={displayValue}
                onChange={handleChange}
                disabled={disabled}
                className="pr-6"
            />
            <span className="absolute bottom-2 right-3 text-gray-500 text-sm">h</span>
        </div>
    );
  }

  return (
    <HoursMinutesInput
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
};
