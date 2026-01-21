
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => {
  const hasTextColor = className.includes('text-');
  return (
    <button
      className={`px-4 py-2 ${!hasTextColor ? 'text-white' : ''} font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};