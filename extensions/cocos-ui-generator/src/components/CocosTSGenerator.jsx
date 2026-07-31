import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

export const CocosTSGenerator = ({ config }) => {
  const [copied, setCopied] = useState(false);

  const tsCode = `import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Prefab, instantiate, Layout, Vec3, tween } from 'cocos';
const { ccclass, property } = _decorator;

export interface IGoalItem {
    id: string;
    icon: SpriteFrame;
    targetCount: number;
}

@ccclass('HeaderHUDController')
export class HeaderHUDController extends Component {

    @property(Label)
    public timerLabel: Label = null!;

    @property(Label)
    public badgeLabel: Label = null!;

    @property(Node)
    public goalsContainer: Node = null!;

    @property(Prefab)
    public goalCardPrefab: Prefab = null!;

    private _currentTime: number = 74; // 1:14 (74 секунды)
    private _isTimerRunning: boolean = true;
    private _goalNodesMap: Map<string, { node: Node; label: Label; currentCount: number }> = new Map();

    start() {
        this.updateBadgeText("${config.badgeText}");
        this.startTimer();
    }

    /**
     * Обновить текст верхнего бейджа (напр. Time / Время)
     */
    public updateBadgeText(text: string) {
        if (this.badgeLabel) {
            this.badgeLabel.string = text;
        }
    }

    /**
     * Динамически инициализировать карточки целей уровня
     */
    public setupGoals(goalsData: IGoalItem[]) {
        if (!this.goalsContainer || !this.goalCardPrefab) return;

        // Очистить существующие узлы
        this.goalsContainer.removeAllChildren();
        this._goalNodesMap.clear();

        goalsData.forEach((goal) => {
            const cardNode = instantiate(this.goalCardPrefab);
            cardNode.parent = this.goalsContainer;

            // Находим вложенные компоненты внутри префаба карточки
            const countLabel = cardNode.getChildByPath('CountLabel')?.getComponent(Label);
            const iconSprite = cardNode.getChildByPath('IconSlot/ItemIcon')?.getComponent(Sprite);

            if (countLabel) countLabel.string = goal.targetCount.toString();
            if (iconSprite && goal.icon) iconSprite.spriteFrame = goal.icon;

            // Сохраняем ссылку для быстрого обновления
            if (countLabel) {
                this._goalNodesMap.set(goal.id, {
                    node: cardNode,
                    label: countLabel,
                    currentCount: goal.targetCount
                });
            }
        });

        // Пересчитать горизонтальную верстку Layout
        const layout = this.goalsContainer.getComponent(Layout);
        if (layout) layout.updateLayout();
    }

    /**
     * Уменьшить количество оставшихся предметов с микро-анимацией (Pulse)
     */
    public decrementGoal(goalId: string, amount: number = 1) {
        const item = this._goalNodesMap.get(goalId);
        if (!item) return;

        item.currentCount = Math.max(0, item.currentCount - amount);
        item.label.string = item.currentCount.toString();

        // Поп-анимация при сборе предмета
        tween(item.node)
            .to(0.1, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.1, { scale: new Vec3(1.0, 1.0, 1) })
            .start();
    }

    /**
     * Запустить таймер обратного отсчета
     */
    public startTimer() {
        this.schedule(() => {
            if (!this._isTimerRunning) return;
            this._currentTime--;
            
            if (this._currentTime <= 0) {
                this._currentTime = 0;
                this.unscheduleAllCallbacks();
                this.onTimeExpired();
            }

            const minutes = Math.floor(this._currentTime / 60);
            const seconds = this._currentTime % 60;
            const formatted = \`\${minutes}:\${seconds < 10 ? '0' : ''}\${seconds}\`;
            
            if (this.timerLabel) {
                this.timerLabel.string = formatted;
            }
        }, 1.0);
    }

    private onTimeExpired() {
        console.log('⏰ Время вышло! Конец уровня');
    }
}
`;

  const copyCode = () => {
    navigator.clipboard.writeText(tsCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-sky-400 flex items-center gap-2">
          <Code2 className="w-5 h-5" /> TypeScript Скрипт для Cocos Creator 3.8
        </h3>
        <button
          onClick={copyCode}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shadow-lg"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопировано!' : 'Скопировать HeaderHUDController.ts'}
        </button>
      </div>

      <pre className="bg-slate-950 p-4 rounded-xl text-xs text-sky-200 font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
        <code>{tsCode}</code>
      </pre>
    </div>
  );
};
