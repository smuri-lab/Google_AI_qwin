import React from 'react';

export const VacationSunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 36 36"
    {...props}
  >
    {/* Strahlen (Orange) */}
    <g fill="#FF9900">
        {/* Hauptachsen */}
        <path d="M18 1L20.5 8H15.5L18 1Z" />
        <path d="M18 35L20.5 28H15.5L18 35Z" />
        <path d="M35 18L28 20.5V15.5L35 18Z" />
        <path d="M1 18L8 20.5V15.5L1 18Z" />
        
        {/* Diagonalen (rotiert um 45 Grad) */}
        <g transform="rotate(45 18 18)">
            <path d="M18 1L20.5 8H15.5L18 1Z" />
            <path d="M18 35L20.5 28H15.5L18 35Z" />
            <path d="M35 18L28 20.5V15.5L35 18Z" />
            <path d="M1 18L8 20.5V15.5L1 18Z" />
        </g>
    </g>
    
    {/* Sonnenkörper (Gelb) */}
    <circle fill="#FFCC4D" cx="18" cy="18" r="10" />
    
    {/* Glanzlicht (Weiß, leicht transparent) */}
    <ellipse fill="#FFFFFF" opacity="0.6" cx="13.5" cy="13.5" rx="3" ry="1.5" transform="rotate(-45 13.5 13.5)" />
  </svg>
);