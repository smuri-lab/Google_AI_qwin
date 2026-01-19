
import React, { useState, useEffect } from 'react';

interface HoursMinutesInputCompactProps {
  value: number | undefined; // decimal hours
  onChange: (value: number) => void;
  disabled?: boolean;
}

const decimalToHoursMinutes = (decimalHours: number | undefined) => {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours) || decimalHours === 0) {
        return { hours: '', minutes: '' };
    }
    
    const h = Math.floor(decimalHours);
    let m = Math.round((decimalHours - h) * 60);

    if (m === 60) {
        return { hours: String(h + 1), minutes: '0' };
    }

    return {
        hours: String(h),
        minutes: String(m)
    };
};

export const HoursMinutesInputCompact: React.FC<HoursMinutesInputCompactProps> = ({ value, onChange, disabled }) => {
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');

    useEffect(() => {
        const { hours: h, minutes: m } = decimalToHoursMinutes(value);
        setHours(h);
        setMinutes(m);
    }, [value]);

    const triggerChange = (hStr: string, mStr: string) => {
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        
        onChange(h + (m / 60));
    };

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHours = e.target.value;
        setHours(newHours);
        triggerChange(newHours, minutes);
    };

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newMinutes = e.target.value;
        const mInt = parseInt(newMinutes, 10);
        
        if (!isNaN(mInt) && mInt > 59) {
            newMinutes = '59';
        }
        
        setMinutes(newMinutes);
        triggerChange(hours, newMinutes);
    };

    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                value={hours}
                onChange={handleHoursChange}
                disabled={disabled}
                placeholder="h"
                min="0"
                className="w-full px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
            />
            <span className="text-gray-500 font-bold">:</span>
            <input
                type="number"
                value={minutes}
                onChange={handleMinutesChange}
                disabled={disabled}
                placeholder="m"
                max="59"
                min="0"
                step="1"
                className="w-full px-1 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
            />
        </div>
    );
};
