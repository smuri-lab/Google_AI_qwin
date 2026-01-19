
import React from 'react';

interface RadioOption {
    value: string;
    label: string;
}

interface RadioGroupProps {
    label?: string;
    name: string;
    options: RadioOption[];
    selectedValue: string;
    onChange: (value: string) => void;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ label, name, options, selectedValue, onChange }) => {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
            <div className="space-y-2">
                {options.map(option => (
                    <label key={option.value} className="flex items-center p-3 border rounded-md has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer transition-colors">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={selectedValue === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};
