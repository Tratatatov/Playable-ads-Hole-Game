import React from 'react';
import { Layers, Box, Cpu, Sparkles } from 'lucide-react';

export const CocosHierarchyView = () => {
  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-5">
      <h3 className="text-lg font-bold text-sky-400 flex items-center gap-2">
        <Layers className="w-5 h-5" /> Структура узлов в Hierarchy Cocos Creator 3.8
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visual Node Tree */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
          <div className="text-slate-400 mb-2 font-sans text-xs flex items-center gap-1">
            <Box className="w-4 h-4 text-amber-400" /> Иерархия сцены (Hierarchy Window):
          </div>

          <div className="flex flex-col gap-1 pl-2 border-l border-slate-700">
            <div className="text-sky-300 font-bold">📂 Canvas (Layer: UI_2D)</div>
            
            <div className="pl-4 flex flex-col gap-1 border-l border-slate-800">
              <div className="text-purple-300">📷 Camera (UI Camera, Orthographic)</div>
              
              <div className="text-emerald-400 font-bold mt-1">
                🔹 HeaderHUD <span className="text-slate-500 text-[10px]">[UITransform, Widget, HeaderHUDController]</span>
              </div>
              
              <div className="pl-4 flex flex-col gap-1 border-l border-slate-800">
                <div className="text-indigo-300 font-bold">
                  🔹 LayoutContainer <span className="text-slate-500 text-[10px]">[Layout: Horizontal]</span>
                </div>

                {/* Timer Subtree */}
                <div className="pl-4 flex flex-col gap-1 border-l border-slate-800">
                  <div className="text-amber-300 font-bold">
                    🔹 TimeBlock <span className="text-slate-500 text-[10px]">[Sprite: Sliced]</span>
                  </div>
                  <div className="pl-4 border-l border-slate-800 text-amber-200">
                    🔸 TimeBadge <span className="text-slate-500 text-[10px]">[Sprite, Label "TIME"]</span>
                  </div>
                  <div className="pl-4 border-l border-slate-800 text-indigo-200">
                    🔸 TimerContent <span className="text-slate-500 text-[10px]">[Layout: Horizontal, Hourglass + Label]</span>
                  </div>

                  {/* Goals Subtree */}
                  <div className="text-cyan-300 font-bold mt-2">
                    🔹 GoalsContainer <span className="text-slate-500 text-[10px]">[Layout: Horizontal]</span>
                  </div>
                  <div className="pl-4 border-l border-slate-800 text-cyan-200">
                    🔸 GoalCard_Prefab <span className="text-slate-500 text-[10px]">[Sprite: Card Background]</span>
                  </div>
                  <div className="pl-8 border-l border-slate-800 text-slate-300">
                    ▫️ IconSlot <span className="text-slate-500 text-[10px]">[Sprite: Inner Slot Frame]</span>
                  </div>
                  <div className="pl-12 border-l border-slate-800 text-slate-400">
                    ▪️ ItemIcon <span className="text-slate-500 text-[10px]">[Sprite: Macaron Icon]</span>
                  </div>
                  <div className="pl-8 border-l border-slate-800 text-slate-300">
                    ▫️ CountLabel <span className="text-slate-500 text-[10px]">[Label + LabelOutline]</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Component Setup Cheat Sheet */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <h4 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Настройка Widget (Главный узел HeaderHUD)
            </h4>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li><strong>Top:</strong> 30 px (привязка к верхнему краю экрана).</li>
              <li><strong>Horizontal Center:</strong> 0 px (позиционирование по центру).</li>
              <li><strong>Align Mode:</strong> ALWAYS (адаптивность для всех мобильных устройств).</li>
            </ul>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <h4 className="text-sm font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Настройка Layout (LayoutContainer & GoalsContainer)
            </h4>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li><strong>Type:</strong> HORIZONTAL (элементы встают в ряд автоматически).</li>
              <li><strong>Resize Mode:</strong> CONTAINER (родитель расширяется под количество элементов).</li>
              <li><strong>Spacing X:</strong> 10–15 px.</li>
            </ul>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <h4 className="text-sm font-bold text-emerald-300 mb-1">
              🎨 9-Slice Настройка Sprite (Фон карточек)
            </h4>
            <p className="text-xs text-slate-300">
              Чтобы уголки синей карточки не деформировались при изменении размера, установите у <strong>Sprite Type = SLICED</strong>. В <em>Sprite Editor</em> задайте зеленые рамки (Border: Left 16, Right 16, Top 16, Bottom 16).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
