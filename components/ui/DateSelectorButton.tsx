
import React from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

interface DateSelectorButtonProps {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
  disabled?: boolean;
}

export const DateSelectorButton: React.FC<DateSelectorButtonProps> = ({ label, value, placeholder, onClick, disabled }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white text-left flex justify-between items-center disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value || placeholder}
            </span>
        </div>
        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
      </button>
    </div>
  );
};
