import React from 'react';

export const SickFaceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 36 36"
    {...props}
  >
    {/* Gesichtshintergrund */}
    <circle fill="#FFCC4D" cx="18" cy="18" r="18"/>
    
    {/* Augen */}
    <ellipse fill="#664500" cx="12" cy="14.5" rx="2.5" ry="3.5"/>
    <ellipse fill="#664500" cx="24" cy="14.5" rx="2.5" ry="3.5"/>
    
    {/* Augenbrauen */}
    <path 
        fill="none" 
        stroke="#664500" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        d="M9 11c1.5-1.5 4-1.5 6 0 M21 11c2-1.5 4.5-1.5 6 0"
    />
    
    {/* Wangen (Rötung) */}
    <circle fill="#FF5B5B" opacity="0.5" cx="7" cy="22" r="3.5"/>
    <circle fill="#FF5B5B" opacity="0.5" cx="29" cy="22" r="3.5"/>
    
    {/* Mund (Traurig) */}
    <path 
        fill="none" 
        stroke="#664500" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        d="M13 26c2-1.5 7-1.5 10 0"
    />
    
    {/* Thermometer */}
    <g transform="translate(15, 23) rotate(-20)">
        {/* Glaskörper */}
        <rect x="0" y="0" width="16" height="5" rx="2.5" fill="#F5F8FA" stroke="#99AAB5" strokeWidth="0.5" />
        {/* Rote Spitze (Bulb) */}
        <circle cx="2.5" cy="2.5" r="2" fill="#DD2E44" />
        {/* Flüssigkeit */}
        <rect x="2.5" y="1.5" width="8" height="2" fill="#DD2E44" />
        {/* Markierungen */}
        <line x1="10" y1="0.5" x2="10" y2="2" stroke="#99AAB5" strokeWidth="0.5"/>
        <line x1="12" y1="0.5" x2="12" y2="2" stroke="#99AAB5" strokeWidth="0.5"/>
        <line x1="14" y1="0.5" x2="14" y2="2" stroke="#99AAB5" strokeWidth="0.5"/>
    </g>
  </svg>
);