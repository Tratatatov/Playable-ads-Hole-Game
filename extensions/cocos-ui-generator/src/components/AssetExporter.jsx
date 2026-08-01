import React from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import { MacaronIcon } from './MacaronIcon';

export const AssetExporter = () => {
  const downloadSVG = (svgContent, fileName) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMacaronSVG = (color) => {
    const colorMap = {
      purple: { top: '#c084fc', base: '#9333ea', cream: '#f472b6', shadow: '#581c87' },
      red: { top: '#f87171', base: '#dc2626', cream: '#fef08a', shadow: '#7f1d1d' },
      cyan: { top: '#38bdf8', base: '#0284c7', cream: '#fef08a', shadow: '#0c4a6e' },
      green: { top: '#4ade80', base: '#16a34a', cream: '#fef08a', shadow: '#14532d' },
    };
    const sel = colorMap[color] || colorMap.purple;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100">
      <ellipse cx="50" cy="65" rx="36" ry="14" fill="${sel.shadow}" />
      <ellipse cx="50" cy="62" rx="36" ry="13" fill="${sel.base}" />
      <path d="M 16 52 C 16 52, 24 58, 50 58 C 76 58, 84 52, 84 52 C 84 56, 76 60, 50 60 C 24 60, 16 56, 16 52 Z" fill="${sel.cream}" />
      <path d="M 14 46 C 14 26, 30 18, 50 18 C 70 18, 86 26, 86 46 C 86 52, 72 54, 50 54 C 28 54, 14 52, 14 46 Z" fill="${sel.top}" stroke="#ffffff" stroke-width="1.5" />
      <circle cx="38" cy="30" r="2.5" fill="#fef08a" />
      <circle cx="48" cy="26" r="2" fill="#f472b6" />
      <circle cx="62" cy="32" r="2.5" fill="#60a5fa" />
    </svg>`;
  };

  const getCardBgSVG = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="160" viewBox="0 0 128 160">
      <rect x="4" y="4" width="120" height="152" rx="24" fill="#334155" stroke="#94a3b8" stroke-width="4"/>
      <rect x="12" y="12" width="104" height="96" rx="16" fill="#0f172a" stroke="#475569" stroke-width="2"/>
    </svg>`;
  };

  const getTimeBadgeSVG = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect x="2" y="2" width="116" height="36" rx="18" fill="#fbbf24" stroke="#d97706" stroke-width="3"/>
      <text x="60" y="25" font-family="Arial, sans-serif" font-weight="900" font-size="18" fill="#451a03" text-anchor="middle">TIME</text>
    </svg>`;
  };

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
      <h3 className="text-lg font-bold text-sky-400 flex items-center gap-2">
        <ImageIcon className="w-5 h-5" /> Генератор спрайтов UI для Cocos Creator
      </h3>
      <p className="text-xs text-slate-300">
        Вы можете скачать готовые SVG спрайты и перетащить их прямо в папку <code>Assets</code> вашего проекта Cocos Creator.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card Background Sprite */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
          <div className="w-16 h-20 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center p-1">
            <div className="w-full h-full border border-slate-400 rounded bg-slate-900"></div>
          </div>
          <span className="text-xs font-semibold text-slate-200">Фон карточки (9-Slice)</span>
          <button
            onClick={() => downloadSVG(getCardBgSVG(), 'card_bg.svg')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs py-1 rounded-lg font-bold flex items-center justify-center gap-1 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> card_bg.svg
          </button>
        </div>

        {/* Time Badge Sprite */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
          <div className="w-20 h-10 bg-amber-400 border border-amber-600 rounded-full flex items-center justify-center text-amber-950 font-black text-xs">
            TIME
          </div>
          <span className="text-xs font-semibold text-slate-200">Бейдж времени</span>
          <button
            onClick={() => downloadSVG(getTimeBadgeSVG(), 'time_badge.svg')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs py-1 rounded-lg font-bold flex items-center justify-center gap-1 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> badge.svg
          </button>
        </div>

        {/* Purple Macaron */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
          <MacaronIcon color="purple" size={40} />
          <span className="text-xs font-semibold text-slate-200">Иконка (Фиолетовый)</span>
          <button
            onClick={() => downloadSVG(getMacaronSVG('purple'), 'macaron_purple.svg')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs py-1 rounded-lg font-bold flex items-center justify-center gap-1 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> purple.svg
          </button>
        </div>

        {/* Red Macaron */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
          <MacaronIcon color="red" size={40} />
          <span className="text-xs font-semibold text-slate-200">Иконка (Красный)</span>
          <button
            onClick={() => downloadSVG(getMacaronSVG('red'), 'macaron_red.svg')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs py-1 rounded-lg font-bold flex items-center justify-center gap-1 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> red.svg
          </button>
        </div>
      </div>
    </div>
  );
};
