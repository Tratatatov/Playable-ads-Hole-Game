/**
 * Collectable — компонент собираемого предмета на сцене.
 * Аналог Unity Collectable.cs.
 * При поглощении дырой: скрывается и возвращается в пул (NO destroy!).
 * RULES §2.2: Запрещено destroy() во время геймплея.
 */

import { _decorator, Component, Node, Vec3, MeshRenderer, Texture2D, ccenum, tween } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStore } from '../core/GameStore';
import { GameState } from '../core/GameStateMachine';
import { LEVEL_CONFIG } from './LevelConfig';

const { ccclass, property } = _decorator;

export enum CollectableType {
    Blue = 0,
    Red,
    Green,
    Turquoise
}
ccenum(CollectableType);

@ccclass('Collectable')
export class Collectable extends Component {
    /** Очки за сбор этого предмета (из LevelConfig) */
    public scoreValue: number = 5;
    /** Индекс типа для текстуры */
    @property({ type: ccenum(CollectableType) })
    public type: CollectableType = CollectableType.Blue;

    @property(MeshRenderer)
    public meshRenderer: MeshRenderer = null!;

    /** Колбэк в пул — проставляется CollectablePool */
    public onCollected: ((item: Collectable) => void) | null = null;

    private _collected: boolean = false;

    onEnable(): void {
        this._collected = false;
    }

    /** Вызывается HoleController при коллизии */
    collect(): void {
        if (this._collected) return;
        this._collected = true;
        // Добавляем очки в GameStore (он сам эмитит SCORE_CHANGED)
        GameStore.addScore(this.scoreValue);
        EventBus.emit(GameEvent.ITEM_COLLECTED, {
            score:      this.scoreValue,
            totalScore: GameStore.score,
        });
        // Твин падения
        const pos = this.node.position;
        tween(this.node)
            .to(LEVEL_CONFIG.fallAnimTime, {
                position: new Vec3(pos.x, LEVEL_CONFIG.fallAnimDepth, pos.z),
                scale: new Vec3(LEVEL_CONFIG.fallAnimScale, LEVEL_CONFIG.fallAnimScale, LEVEL_CONFIG.fallAnimScale)
            }, { easing: 'quadIn' })
            .call(() => {
                // Вернуть в пул (не destroy!)
                this.onCollected?.(this);
            })
            .start();
    }

    /** Назначить текстуру на материал */
    setTexture(tex: Texture2D | null): void {
        if (!tex || !this.meshRenderer || !this.meshRenderer.sharedMaterial) return;
        
        // Клонируем материал чтобы не менять shared material у пула
        const mat = this.meshRenderer.material;
        if (mat) mat.setProperty('mainTexture', tex);
    }
}
