import React, { useState } from 'react';
import { CocosHUDPreview } from './components/CocosHUDPreview';
import { CocosTSGenerator } from './components/CocosTSGenerator';
import { CocosHierarchyView } from './components/CocosHierarchyView';
import { AssetExporter } from './components/AssetExporter';
import { Gamepad2, Layers, Code, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('preview');

  const [hudConfig, setHudConfig] = useState({
    timerText: '1:14',
    badgeText: 'TIME',
    topPadding: 20,
    hudScale: 1.0,
    spacing: 12,
    goals: [
      { id: '1', color: 'purple', count: 149 },
      { id: '2', color: 'red', count: 250 },
      { id: '3', color: 'cyan', count: 300 },
      { id: '4', color: 'green', count: 400 },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      {/* App Header Bar */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Gamepad2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Cocos 3D Game UI Generator
              <span className="text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                Cocos Creator 3.8
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Генератор верстки, TypeScript скрипта и спрайтов верхнего HUD для 3D игры
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Live 3D Preview
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'script' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" /> TypeScript Скрипт
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'hierarchy' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> Иерархия Cocos
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'assets' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Иконки и Спрайты
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl flex flex-col gap-6">
        {activeTab === 'preview' && (
          <CocosHUDPreview config={hudConfig} setConfig={setHudConfig} />
        )}

        {activeTab === 'script' && (
          <CocosTSGenerator config={hudConfig} />
        )}

        {activeTab === 'hierarchy' && (
          <CocosHierarchyView />
        )}

        {activeTab === 'assets' && (
          <AssetExporter />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-xs text-slate-500 flex flex-col items-center gap-1 border-t border-slate-900 pt-4 w-full max-w-5xl">
        <p>Создано для Cocos Creator 3.8.8 • Совместимо с TypeScript и UI_2D / UI_3D слоями</p>
      </footer>
    </div>
  );
}
