import React from 'react';

export const SickFaceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Face outline */}
    <circle cx="12" cy="12" r="10" fill="none" />
    
    {/* Eyes (filled) */}
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    
    {/* Sad mouth */}
    <path d="M8 15 q4 -2 8 0" fill="none" />
    
    {/* Thermometer */}
    <line x1="13.5" y1="14.5" x2="16.5" y2="12.5" />
    <circle cx="17.5" cy="12" r="1.5" fill="none"/>
  </svg>
);