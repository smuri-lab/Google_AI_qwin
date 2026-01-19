import React, { useState, useEffect } from 'react';
import { HoursMinutesInputCompact } from './HoursMinutesInputCompact';

interface FlexibleTimeInputCompactProps {
  value: number | undefined;
  onChange: (value: number) => void;
  format: 'decimal' | 'hoursMinutes';
  disabled?: boolean;
}

export const FlexibleTimeInputCompact: React.FC<FlexibleTimeInputCompactProps> = ({ value, onChange, format, disabled }) => {
  if (format === 'decimal') {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (typeof value === 'number' && value > 0) {
            setDisplayValue(value.toFixed(2).replace('.', ','));
        } else {
            setDisplayValue('');
        }
    }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const strValue = e.target.value;
        setDisplayValue(strValue);

        if (strValue.trim() === '') {
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
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            disabled={disabled}
            placeholder="0,00"
            className="w-full px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center pr-5"
        />
        <span className="absolute inset-y-0 right-1.5 flex items-center text-gray-500 text-sm">h</span>
      </div>
    );
  }
  
  return (
    <HoursMinutesInputCompact
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
};
