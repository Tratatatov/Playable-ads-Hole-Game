/**
 * HoleGrowthService — рост дыры по порогам из LevelConfig.holeSizeThresholds.
 * Слушает ITEM_COLLECTED → пересчитывает scale → GameStore.setHoleScale → HOLE_SIZE_CHANGED
 * и запускает пружинный tween через TweenService (конфиг дыры — аргументом).
 *
 * Plain TS class (не Component). RULES §2.1: нет аллокаций в update().
 */

import { Node, Vec3 } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { TweenService } from './TweenService';
import { LEVEL_CONFIG, HoleSizeThreshold } from '../gameplay/LevelConfig';

export interface IHoleGrowthService {
    init(holeNode: Node): void;
    destroy(): void;
}

class HoleGrowthServiceImpl implements IHoleGrowthService {
    private _subscribed: boolean = false;
    private _holeNode: Node | null = null;
    private readonly _initialScale: Vec3 = new Vec3(1, 1, 1);
    private readonly _targetScale: Vec3 = new Vec3(1, 1, 1);

    init(holeNode: Node): void {
        this._holeNode = holeNode;
        this._initialScale.set(holeNode.scale);
        this._targetScale.set(holeNode.scale);

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            this._subscribed = true;
        }

        GameStore.setHoleScale(1);
        console.log('[HoleGrowthService] Инициализирован, подписка на ITEM_COLLECTED');
    }

    destroy(): void {
        TweenService.stopHoleScaleSpring();
        this._holeNode = null;

        if (!this._subscribed) return;
        EventBus.off(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
        this._subscribed = false;
    }

    private _onItemCollected = (): void => {
        this._recalculate(GameStore.collectedCount);
    };

    private _recalculate(collectedCount: number): void {
        if (!LEVEL_CONFIG) return;

        const prevScale = GameStore.holeScale;
        const result = this._scaleFromThresholds(collectedCount, LEVEL_CONFIG.holeSizeThresholds);
        if (result.scale === prevScale) return;

        GameStore.setHoleScale(result.scale);

        if (result.scale > prevScale) {
            const thr = result.threshold;
            const thrLabel = thr
                ? `threshold requiredCount=${thr.requiredCount}, size=${thr.size}`
                : 'no threshold';
            console.log(
                `%c[HoleGrowth] size ↑ collected=${collectedCount} → ${prevScale} → ${result.scale}` +
                ` (${thrLabel})`,
                'color: #4FC3F7;'
            );
            this._tweenToScale(result.scale);
        } else {
            this._applyScaleImmediate(result.scale);
        }
    }

    private _tweenToScale(scaleMul: number): void {
        if (!this._holeNode || !LEVEL_CONFIG) {
            this._applyScaleImmediate(scaleMul);
            return;
        }

        this._targetScale.set(
            this._initialScale.x * scaleMul,
            this._initialScale.y,
            this._initialScale.z * scaleMul
        );

        TweenService.holeScaleSpring(this._holeNode, this._targetScale, {
            duration: LEVEL_CONFIG.holeScaleTweenDuration,
            amplitude: LEVEL_CONFIG.holeScaleElasticAmplitude,
            period: LEVEL_CONFIG.holeScaleElasticPeriod,
        });
    }

    private _applyScaleImmediate(scaleMul: number): void {
        TweenService.stopHoleScaleSpring();
        if (!this._holeNode) return;

        this._targetScale.set(
            this._initialScale.x * scaleMul,
            this._initialScale.y,
            this._initialScale.z * scaleMul
        );
        this._holeNode.setScale(this._targetScale);
    }

    /** Берём порог с максимальным requiredCount среди достигнутых; size — абсолютный от старта */
    private _scaleFromThresholds(
        collectedCount: number,
        thresholds: ReadonlyArray<HoleSizeThreshold>
    ): { scale: number; threshold: HoleSizeThreshold | null } {
        let bestCount = -1;
        let best: HoleSizeThreshold | null = null;

        for (let i = 0; i < thresholds.length; i++) {
            const t = thresholds[i];
            if (collectedCount >= t.requiredCount && t.requiredCount >= bestCount) {
                bestCount = t.requiredCount;
                best = t;
            }
        }

        return best ? { scale: best.size, threshold: best } : { scale: 1, threshold: null };
    }
}

export let HoleGrowthService: IHoleGrowthService = new HoleGrowthServiceImpl();
