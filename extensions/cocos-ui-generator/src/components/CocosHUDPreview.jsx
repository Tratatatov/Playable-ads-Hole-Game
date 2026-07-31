import React from 'react';
import { MacaronIcon } from './MacaronIcon';
import { Clock, Plus, Trash2 } from 'lucide-react';

export const CocosHUDPreview = ({ config, setConfig }) => {
  const { timerText, badgeText, goals, hudScale, topPadding, spacing } = config;

  const updateGoal = (index, field, value) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setConfig({ ...config, goals: newGoals });
  };

  const addGoal = () => {
    if (goals.length >= 6) return;
    const colors = ['purple', 'red', 'cyan', 'green', 'gold'];
    const nextColor = colors[goals.length % colors.length];
    setConfig({
      ...config,
      goals: [...goals, { id: Date.now(), color: nextColor, count: 100 + goals.length * 50 }],
    });
  };

  const removeGoal = (id) => {
    if (goals.length <= 1) return;
    setConfig({
      ...config,
      goals: goals.filter((g) => g.id !== id),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 3D Game Stage Simulation Viewport */}
      <div className="relative w-full h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700 wood-floor flex flex-col items-center justify-between select-none">
        
        {/* Top Cocos Canvas Overlay Boundary */}
        <div className="absolute inset-x-0 top-0 border-b border-dashed border-sky-400/40 text-[10px] text-sky-300/60 px-2 py-0.5 pointer-events-none z-30 flex justify-between">
          <span>COCOS CANVAS UI (Layer: UI_2D)</span>
          <span>Camera: Orthographic</span>
        </div>

        {/* ----------------- COCOS HUD TOP BAR (Target of generation) ----------------- */}
        <div 
          className="z-20 flex items-start transition-all duration-300"
          style={{
            marginTop: `${topPadding}px`,
            gap: `${spacing}px`,
            transform: `scale(${hudScale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* 1. Timer Block */}
          <div className="relative flex flex-col items-center">
            {/* Top Yellow Time Badge */}
            <div className="absolute -top-3.5 z-10 bg-amber-400 border-2 border-amber-600 text-amber-950 font-black text-xs px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
              {badgeText}
            </div>

            {/* Main Timer Blue Container */}
            <div className="w-24 h-24 bg-gradient-to-b from-indigo-600 to-indigo-800 border-2 border-indigo-400 rounded-2xl shadow-xl flex flex-col items-center justify-center pt-3 px-2">
              <div className="flex items-center gap-1.5 mt-1">
                {/* Hourglass Icon */}
                <div className="w-6 h-6 bg-purple-500/80 rounded-full flex items-center justify-center border border-purple-300 shadow-inner">
                  <Clock className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                {/* Time Label */}
                <span className="text-white font-black text-xl tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {timerText}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Goals Horizontal Row Container */}
          <div className="flex items-center gap-2">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="cocos-hud-card relative w-20 h-24 bg-gradient-to-b from-slate-600/90 to-slate-800/90 border-2 border-slate-400/80 rounded-2xl p-1.5 flex flex-col items-center justify-between shadow-lg"
              >
                {/* Inner Slot Frame */}
                <div className="w-full h-14 bg-slate-900/80 rounded-xl border border-slate-500/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                  <MacaronIcon color={goal.color} size={44} className="drop-shadow-md" />
                </div>

                {/* Count Label with Heavy Outline */}
                <span className="text-white font-extrabold text-base tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {goal.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Game Scene Simulation (Wooden Track, Fence, Hole, Falling Macarons) */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-8">
          {/* Side Railings / Fence */}
          <div className="absolute inset-y-0 left-6 w-8 border-r-4 border-slate-700/60 bg-gradient-to-r from-slate-800/40 to-slate-900/60 transform -skew-x-6"></div>
          <div className="absolute inset-y-0 right-6 w-8 border-l-4 border-slate-700/60 bg-gradient-to-l from-slate-800/40 to-slate-900/60 transform skew-x-6"></div>

          {/* Black Hole in 3D Floor */}
          <div className="w-28 h-14 rounded-[100%] hole-3d border-2 border-slate-400/50 flex items-center justify-center">
            <div className="w-20 h-8 bg-black rounded-[100%] blur-[1px]"></div>
          </div>

          {/* Decorative Falling 3D Macarons Stack */}
          <div className="absolute top-36 flex flex-wrap gap-2 justify-center max-w-[280px] opacity-90">
            <MacaronIcon color="purple" size={32} className="transform rotate-12" />
            <MacaronIcon color="purple" size={36} className="transform -rotate-45" />
            <MacaronIcon color="purple" size={30} className="transform rotate-90" />
            <MacaronIcon color="purple" size={34} className="transform -rotate-12" />
          </div>
        </div>

      </div>

      {/* Control Dashboard Panel */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
        <h3 className="text-lg font-bold text-sky-400 flex items-center gap-2">
          ⚙️ Настройки интерфейса HUD
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timer Settings */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">Бейдж времени</label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-500"
            />

            <label className="text-xs font-semibold text-slate-300 mt-1">Значение таймера</label>
            <input
              type="text"
              value={timerText}
              onChange={(e) => setConfig({ ...config, timerText: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Position & Scale Settings */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">Отступ сверху (px): {topPadding}</label>
            <input
              type="range"
              min="5"
              max="60"
              value={topPadding}
              onChange={(e) => setConfig({ ...config, topPadding: Number(e.target.value) })}
              className="accent-indigo-500 cursor-pointer"
            />

            <label className="text-xs font-semibold text-slate-300 mt-2">Масштаб HUD: {hudScale.toFixed(2)}x</label>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={hudScale}
              onChange={(e) => setConfig({ ...config, hudScale: Number(e.target.value) })}
              className="accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Manage Goal Items */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-300">Карточки целей ({goals.length}/6)</span>
              <button
                onClick={addGoal}
                disabled={goals.length >= 6}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
              {goals.map((goal, idx) => (
                <div key={goal.id} className="flex items-center justify-between bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <select
                      value={goal.color}
                      onChange={(e) => updateGoal(idx, 'color', e.target.value)}
                      className="bg-slate-800 text-xs text-white border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="purple">Фиолетовый</option>
                      <option value="red">Красный</option>
                      <option value="cyan">Голубой</option>
                      <option value="green">Зеленый</option>
                      <option value="gold">Золотой</option>
                    </select>

                    <input
                      type="number"
                      value={goal.count}
                      onChange={(e) => updateGoal(idx, 'count', Number(e.target.value))}
                      className="w-16 bg-slate-800 text-xs text-white border border-slate-700 rounded px-1.5 py-0.5 text-center focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => removeGoal(goal.id)}
                    disabled={goals.length <= 1}
                    className="text-slate-400 hover:text-red-400 disabled:opacity-30 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
