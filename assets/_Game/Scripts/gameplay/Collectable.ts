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
    collect(holeNode?: Node): void {
        if (this._collected) return;
        this._collected = true;
        // Добавляем очки в GameStore (он сам эмитит SCORE_CHANGED)
        GameStore.addScore(this.scoreValue);
        EventBus.emit(GameEvent.ITEM_COLLECTED, {
            score:      this.scoreValue,
            totalScore: GameStore.score,
        });

        const startPos = this.node.worldPosition.clone();
        const startScale = this.node.worldScale.clone();

        const animObj = { progress: 0 };
        const tempPos = new Vec3();
        const tempScale = new Vec3();
        let peakPos = new Vec3();

        // Твин с динамическим отслеживанием (homing) текущей позиции дыры
        tween(animObj)
            // 1. Подпрыгивание (навстречу текущему положению дыры)
            .to(LEVEL_CONFIG.jumpAnimTime, { progress: 1 }, { 
                easing: 'quadOut',
                onUpdate: (target: any) => {
                    const r = target.progress;
                    const hPos = holeNode ? holeNode.worldPosition : startPos;
                    const midX = startPos.x + (hPos.x - startPos.x) * 0.5;
                    const midZ = startPos.z + (hPos.z - startPos.z) * 0.5;
                    
                    tempPos.x = startPos.x + (midX - startPos.x) * r;
                    tempPos.y = startPos.y + (LEVEL_CONFIG.jumpAnimHeight) * r;
                    tempPos.z = startPos.z + (midZ - startPos.z) * r;
                    
                    this.node.setWorldPosition(tempPos);
                }
            })
            .call(() => { 
                animObj.progress = 0; 
                peakPos.set(this.node.worldPosition);
            })
            // 2. Падение (точно в центр движущейся дыры)
            .to(LEVEL_CONFIG.fallAnimTime, { progress: 1 }, { 
                easing: 'quadIn',
                onUpdate: (target: any) => {
                    const r = target.progress;
                    const hPos = holeNode ? holeNode.worldPosition : startPos;
                    
                    // Целевая высота (fallAnimDepth) применяется относительно стартовой Y
                    const targetY = startPos.y + LEVEL_CONFIG.fallAnimDepth;

                    tempPos.x = peakPos.x + (hPos.x - peakPos.x) * r;
                    tempPos.y = peakPos.y + (targetY - peakPos.y) * r;
                    tempPos.z = peakPos.z + (hPos.z - peakPos.z) * r;

                    this.node.setWorldPosition(tempPos);

                    const s = 1 + (LEVEL_CONFIG.fallAnimScale - 1) * r;
                    tempScale.set(startScale.x * s, startScale.y * s, startScale.z * s);
                    this.node.setWorldScale(tempScale);
                }
            })
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
