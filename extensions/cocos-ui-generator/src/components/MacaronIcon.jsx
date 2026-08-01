import React from 'react';

export const MacaronIcon = ({ color = '#9333ea', size = 48, className = '' }) => {
  // Determine top/bottom shade based on base color
  const colorMap = {
    purple: { top: '#c084fc', base: '#9333ea', cream: '#f472b6', shadow: '#581c87' },
    red: { top: '#f87171', base: '#dc2626', cream: '#fef08a', shadow: '#7f1d1d' },
    cyan: { top: '#38bdf8', base: '#0284c7', cream: '#fef08a', shadow: '#0c4a6e' },
    green: { top: '#4ade80', base: '#16a34a', cream: '#fef08a', shadow: '#14532d' },
    gold: { top: '#fde047', base: '#eab308', cream: '#ffffff', shadow: '#713f12' },
  };

  const selected = colorMap[color] || { top: color, base: color, cream: '#ffffff', shadow: '#000000' };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <radialGradient id={`macaron-top-${color}`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="40%" stopColor={selected.top} />
          <stop offset="100%" stopColor={selected.base} />
        </radialGradient>
        <linearGradient id={`macaron-cream-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={selected.cream} />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#glow)">
        {/* Bottom Macaron Half */}
        <ellipse cx="50" cy="65" rx="36" ry="14" fill={selected.shadow} />
        <ellipse cx="50" cy="62" rx="36" ry="13" fill={selected.base} />

        {/* Cream Filling */}
        <path d="M 16 52 C 16 52, 24 58, 50 58 C 76 58, 84 52, 84 52 C 84 56, 76 60, 50 60 C 24 60, 16 56, 16 52 Z" fill={selected.cream} />
        
        {/* Top Macaron Shell */}
        <path d="M 14 46 C 14 26, 30 18, 50 18 C 70 18, 86 26, 86 46 C 86 52, 72 54, 50 54 C 28 54, 14 52, 14 46 Z" fill={`url(#macaron-top-${color})`} stroke="#ffffff" strokeWidth="1.5" />

        {/* Sprinkles on top */}
        <circle cx="38" cy="30" r="2.5" fill="#fef08a" />
        <circle cx="48" cy="26" r="2" fill="#f472b6" />
        <circle cx="62" cy="32" r="2.5" fill="#60a5fa" />
        <circle cx="42" cy="38" r="2" fill="#4ade80" />
        <circle cx="56" cy="38" r="2.2" fill="#fde047" />
        <circle cx="30" cy="36" r="1.8" fill="#ffffff" />
      </g>
    </svg>
  );
};
