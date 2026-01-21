
import React, { useState, useEffect } from 'react';

interface HoursMinutesInputProps {
  label: string;
  value: number | undefined; // decimal hours
  onChange: (value: number) => void;
  disabled?: boolean;
}

const decimalToHoursMinutes = (decimalHours: number | undefined) => {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours)) return { hours: '', minutes: '' };
    
    const sign = decimalHours < 0 ? -1 : 1;
    const absDecimal = Math.abs(decimalHours);
    let h = Math.floor(absDecimal);
    let m = Math.round((absDecimal - h) * 60);

    if (m === 60) {
        h += 1;
        m = 0;
    }

    return {
        hours: (h * sign).toString(),
        minutes: m.toString()
    };
};

export const HoursMinutesInput: React.FC<HoursMinutesInputProps> = ({ label, value, onChange, disabled }) => {
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');

    useEffect(() => {
        const { hours: h, minutes: m } = decimalToHoursMinutes(value);
        setHours(h);
        setMinutes(m);
    }, [value]);

    const triggerChange = (hStr: string, mStr: string) => {
        const h = parseFloat(hStr) || 0;
        const m = parseFloat(mStr) || 0;
        const sign = h < 0 ? -1 : 1;
        onChange(sign * (Math.abs(h) + (m / 60)));
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
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                    <input
                        type="number"
                        value={hours}
                        onChange={handleHoursChange}
                        disabled={disabled}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-8"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 text-sm">h</span>
                </div>
                 <div className="relative">
                    <input
                        type="number"
                        value={minutes}
                        onChange={handleMinutesChange}
                        disabled={disabled}
                        placeholder="0"
                        max="59"
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-12"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 text-sm">m</span>
                </div>
            </div>
        </div>
    );
};