/**
 * Collectable — компонент собираемого предмета на сцене.
 * Аналог Unity Collectable.cs.
 * При поглощении дырой: скрывается и возвращается в пул (NO destroy!).
 * RULES §2.2: Запрещено destroy() во время геймплея.
 * RULES §2.1: нет аллокаций в collect / tween onUpdate.
 */

import { _decorator, Component, Node, Vec3, ccenum, tween, Tween } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStore } from '../core/GameStore';
import { LEVEL_CONFIG } from './LevelConfig';

const { ccclass, property } = _decorator;

export enum CollectableType {
    Blue = 0,
    Red,
    Green,
    Teal
}
ccenum(CollectableType);

/** Переиспользуемый payload ITEM_COLLECTED (слушатели не должны сохранять ссылку). */
const ITEM_COLLECTED_PAYLOAD: { score: number; totalScore: number; type: CollectableType } = {
    score: 0,
    totalScore: 0,
    type: CollectableType.Blue,
};

@ccclass('Collectable')
export class Collectable extends Component {
    /** Очки за сбор этого предмета (из LevelConfig) */
    public scoreValue: number = 5;

    @property({ type: CollectableType })
    public type: CollectableType = CollectableType.Blue;

    @property({ tooltip: 'Задавать случайный угол поворота по 3 осям при спавне/инициализации' })
    public SetRandomAngle: boolean = false;

    private _collected: boolean = false;
    private _orientationApplied: boolean = false;

    /** Preallocated scratch — несколько Collectable анимируются параллельно */
    private readonly _startPos: Vec3 = new Vec3();
    private readonly _startScale: Vec3 = new Vec3();
    private readonly _tempPos: Vec3 = new Vec3();
    private readonly _tempScale: Vec3 = new Vec3();
    private readonly _peakPos: Vec3 = new Vec3();
    private readonly _holePos: Vec3 = new Vec3();
    private readonly _anim: { progress: number } = { progress: 0 };
    private _holeNode: Node | null = null;

    /** Уже собран — OptimizationService не должен снова включать */
    public get isCollected(): boolean {
        return this._collected;
    }

    onEnable(): void {
        // Не сбрасываем _collected: OptimizationService / soft-cull не должны «воскрешать» собранное.
        if (!this._orientationApplied) {
            this.applyRandomAngle();
            this._orientationApplied = true;
        }
    }

    onDisable(): void {
        Tween.stopAllByTarget(this._anim);
        this._holeNode = null;
    }

    /** Задать случайный угол поворота по 3 осям, если включен SetRandomAngle */
    public applyRandomAngle(): void {
        const isRandom = this.SetRandomAngle;
        if (isRandom) {
            const rx = Math.random() * 360;
            const ry = Math.random() * 360;
            const rz = Math.random() * 360;
            this.node.setRotationFromEuler(rx, ry, rz);
        } else {
            this.node.setRotationFromEuler(0, 0, 0);
        }
    }

    /** Вызывается HoleController при коллизии */
    collect(holeNode?: Node): void {
        if (this._collected) return;
        this._collected = true;

        GameStore.collectItem(this.type, this.scoreValue);

        ITEM_COLLECTED_PAYLOAD.score = this.scoreValue;
        ITEM_COLLECTED_PAYLOAD.totalScore = GameStore.score;
        ITEM_COLLECTED_PAYLOAD.type = this.type;
        EventBus.emit(GameEvent.ITEM_COLLECTED, ITEM_COLLECTED_PAYLOAD);

        this._holeNode = holeNode ?? null;
        this.node.getWorldPosition(this._startPos);
        this.node.getWorldScale(this._startScale);
        this._anim.progress = 0;

        Tween.stopAllByTarget(this._anim);

        tween(this._anim)
            .to(LEVEL_CONFIG.jumpAnimTime, { progress: 1 }, {
                easing: 'quadOut',
                onUpdate: () => {
                    this._updateJump(this._anim.progress);
                },
            })
            .call(() => {
                this._anim.progress = 0;
                this.node.getWorldPosition(this._peakPos);
            })
            .to(LEVEL_CONFIG.fallAnimTime, { progress: 1 }, {
                easing: 'quadIn',
                onUpdate: () => {
                    this._updateFall(this._anim.progress);
                },
            })
            .call(() => {
                this._holeNode = null;
                this.node.active = false;
            })
            .start();
    }

    private _readHolePos(): void {
        if (this._holeNode && this._holeNode.isValid) {
            this._holeNode.getWorldPosition(this._holePos);
        } else {
            this._holePos.set(this._startPos);
        }
    }

    private _updateJump(r: number): void {
        this._readHolePos();
        const sp = this._startPos;
        const hp = this._holePos;
        const midX = sp.x + (hp.x - sp.x) * 0.5;
        const midZ = sp.z + (hp.z - sp.z) * 0.5;

        this._tempPos.x = sp.x + (midX - sp.x) * r;
        this._tempPos.y = sp.y + LEVEL_CONFIG.jumpAnimHeight * r;
        this._tempPos.z = sp.z + (midZ - sp.z) * r;
        this.node.setWorldPosition(this._tempPos);
    }

    private _updateFall(r: number): void {
        this._readHolePos();
        const peak = this._peakPos;
        const hp = this._holePos;
        const targetY = this._startPos.y + LEVEL_CONFIG.fallAnimDepth;

        this._tempPos.x = peak.x + (hp.x - peak.x) * r;
        this._tempPos.y = peak.y + (targetY - peak.y) * r;
        this._tempPos.z = peak.z + (hp.z - peak.z) * r;
        this.node.setWorldPosition(this._tempPos);

        const s = 1 + (LEVEL_CONFIG.fallAnimScale - 1) * r;
        const ss = this._startScale;
        this._tempScale.set(ss.x * s, ss.y * s, ss.z * s);
        this.node.setWorldScale(this._tempScale);
    }
}
