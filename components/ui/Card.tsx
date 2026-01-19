import React from 'react';

// FIX: Extend component props to accept standard div attributes like onClick.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white p-4 sm:p-6 rounded-xl shadow-md ${className}`} {...props}>
      {children}
    </div>
  );
};
