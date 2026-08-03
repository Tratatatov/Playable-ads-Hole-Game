/**
 * HoleGrowthService — рост дыры по порогам из LevelConfig.holeSizeThresholds.
 * Слушает ITEM_COLLECTED → пересчитывает scale → GameStore.setHoleScale → HOLE_SIZE_CHANGED
 * и запускает пружинный tween на growthViewNode (не на весь HoleController).
 * Параллельно: body-коллайдер (XZ) + целевые holeMin/MaxSpeed + growPitch из порога.
 *
 * Plain TS class (не Component). RULES §2.1: нет аллокаций в update().
 */

import {
    Node, Vec3, Collider, BoxCollider, SphereCollider, CylinderCollider, CapsuleCollider,
} from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { TweenService } from './TweenService';
import { LEVEL_CONFIG, HoleSizeThreshold } from '../gameplay/LevelConfig';

export interface IHoleGrowthService {
    init(viewNode: Node, bodyCollider?: Collider | null): void;
    destroy(): void;
    /** Debug: принудительно вырастить дыру до следующего порога (tween + HOLE_SIZE_CHANGED). */
    forceNextGrowth(): boolean;
}

class HoleGrowthServiceImpl implements IHoleGrowthService {
    private _subscribed: boolean = false;
    private _viewNode: Node | null = null;
    private readonly _initialScale: Vec3 = new Vec3(1, 1, 1);
    private readonly _targetScale: Vec3 = new Vec3(1, 1, 1);

    /** Коллайдер на корне HoleController — размеры кэшируются при init. */
    private _bodyCollider: Collider | null = null;
    private _initialRadius: number = 0;
    private readonly _initialSize: Vec3 = new Vec3(1, 1, 1);
    private readonly _scratchSize: Vec3 = new Vec3(1, 1, 1);

    /** Стартовые скорости из LevelConfig (до порогов). */
    private _baseMinSpeed: number = 3;
    private _baseMaxSpeed: number = 18;

    init(viewNode: Node, bodyCollider: Collider | null = null): void {
        this._viewNode = viewNode;
        this._initialScale.set(viewNode.scale);
        this._targetScale.set(viewNode.scale);
        this._cacheBodyCollider(bodyCollider);
        this._cacheBaseSpeeds();

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            this._subscribed = true;
        }

        GameStore.setHoleScale(1);
        this._applyThresholdParams(null);
        this._applyColliderScale(1);
        console.log(
            `[HoleGrowthService] Инициализирован (view=${viewNode.name}` +
            `${this._bodyCollider ? `, bodyCollider=${this._bodyCollider.node.name}` : ''}` +
            `, speed=${this._baseMinSpeed}..${this._baseMaxSpeed})`
        );
    }

    destroy(): void {
        TweenService.stopHoleScaleSpring();
        this._applyThresholdParams(null);
        this._viewNode = null;
        this._bodyCollider = null;
        this._initialRadius = 0;

        if (!this._subscribed) return;
        EventBus.off(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
        this._subscribed = false;
    }

    forceNextGrowth(): boolean {
        if (!LEVEL_CONFIG) return false;

        const prevScale = GameStore.holeScale;
        const thresholds = LEVEL_CONFIG.holeSizeThresholds;
        let next: HoleSizeThreshold | null = null;

        for (let i = 0; i < thresholds.length; i++) {
            const t = thresholds[i];
            if (t.size <= prevScale) continue;
            if (!next || t.requiredCount < next.requiredCount) {
                next = t;
            }
        }

        if (!next) {
            console.log('[HoleGrowthService] forceNextGrowth: уже максимальный порог');
            return false;
        }

        // Pitch/speed до setHoleScale — AudioService читает их в HOLE_SIZE_CHANGED
        this._applyThresholdParams(next);
        GameStore.setHoleScale(next.size);
        console.log(
            `%c[HoleGrowth] DEBUG force ↑ ${prevScale} → ${next.size}` +
            ` speed=${next.minSpeed}..${next.maxSpeed} pitch=${next.growPitch}` +
            ` (threshold requiredCount=${next.requiredCount})`,
            'color: #4FC3F7;'
        );
        this._tweenToScale(next.size);
        return true;
    }

    private _onItemCollected = (): void => {
        this._recalculate(GameStore.collectedCount);
    };

    private _recalculate(collectedCount: number): void {
        if (!LEVEL_CONFIG) return;

        const prevScale = GameStore.holeScale;
        const result = this._scaleFromThresholds(collectedCount, LEVEL_CONFIG.holeSizeThresholds);
        if (result.scale === prevScale) return;

        this._applyThresholdParams(result.threshold);
        GameStore.setHoleScale(result.scale);

        if (result.scale > prevScale) {
            const thr = result.threshold;
            const thrLabel = thr
                ? `threshold requiredCount=${thr.requiredCount}, size=${thr.size}, ` +
                  `speed=${thr.minSpeed}..${thr.maxSpeed}, pitch=${thr.growPitch}`
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

    private _cacheBaseSpeeds(): void {
        if (!LEVEL_CONFIG) {
            this._baseMinSpeed = 3;
            this._baseMaxSpeed = 18;
            return;
        }
        this._baseMinSpeed = LEVEL_CONFIG.holeMinSpeed;
        this._baseMaxSpeed = Math.max(this._baseMinSpeed, LEVEL_CONFIG.holeMaxSpeed);
    }

    /** Целевые speed + growPitch порога; null → стартовые. До setHoleScale. */
    private _applyThresholdParams(threshold: HoleSizeThreshold | null): void {
        if (!threshold) {
            GameStore.setHoleSpeeds(this._baseMinSpeed, this._baseMaxSpeed);
            GameStore.setHoleGrowPitch(1);
            return;
        }
        GameStore.setHoleSpeeds(threshold.minSpeed, threshold.maxSpeed);
        GameStore.setHoleGrowPitch(threshold.growPitch);
    }

    private _tweenToScale(scaleMul: number): void {
        this._applyColliderScale(scaleMul);

        if (!this._viewNode || !LEVEL_CONFIG) {
            this._applyScaleImmediate(scaleMul);
            return;
        }

        this._targetScale.set(
            this._initialScale.x * scaleMul,
            this._initialScale.y,
            this._initialScale.z * scaleMul
        );

        TweenService.holeScaleSpring(this._viewNode, this._targetScale, {
            duration: LEVEL_CONFIG.holeScaleTweenDuration,
            amplitude: LEVEL_CONFIG.holeScaleElasticAmplitude,
            period: LEVEL_CONFIG.holeScaleElasticPeriod,
            decay: LEVEL_CONFIG.holeScaleElasticDecay,
        });
    }

    private _applyScaleImmediate(scaleMul: number): void {
        TweenService.stopHoleScaleSpring();
        this._applyColliderScale(scaleMul);
        if (!this._viewNode) return;

        this._targetScale.set(
            this._initialScale.x * scaleMul,
            this._initialScale.y,
            this._initialScale.z * scaleMul
        );
        this._viewNode.setScale(this._targetScale);
    }

    private _cacheBodyCollider(col: Collider | null): void {
        this._bodyCollider = null;
        this._initialRadius = 0;
        if (!col || !col.isValid) return;

        this._bodyCollider = col;
        if (col instanceof SphereCollider) {
            this._initialRadius = col.radius;
        } else if (col instanceof CylinderCollider) {
            this._initialRadius = col.radius;
        } else if (col instanceof CapsuleCollider) {
            this._initialRadius = col.radius;
        } else if (col instanceof BoxCollider) {
            this._initialSize.set(col.size);
        }
    }

    /** XZ как у визуала; Y (height) не трогаем. */
    private _applyColliderScale(scaleMul: number): void {
        const col = this._bodyCollider;
        if (!col || !col.isValid) return;

        if (col instanceof SphereCollider) {
            col.radius = this._initialRadius * scaleMul;
        } else if (col instanceof CylinderCollider) {
            col.radius = this._initialRadius * scaleMul;
        } else if (col instanceof CapsuleCollider) {
            col.radius = this._initialRadius * scaleMul;
        } else if (col instanceof BoxCollider) {
            this._scratchSize.set(
                this._initialSize.x * scaleMul,
                this._initialSize.y,
                this._initialSize.z * scaleMul
            );
            col.size = this._scratchSize;
        }
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
