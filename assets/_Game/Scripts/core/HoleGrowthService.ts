/**
 * HoleGrowthService — рост дыры по порогам из LevelConfig.holeSizeThresholds.
 * Слушает ITEM_COLLECTED → пересчитывает scale по collectedCount → GameStore.setHoleScale → HOLE_SIZE_CHANGED.
 * HoleController плавно догоняет целевой масштаб через Lerp.
 */

import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { LEVEL_CONFIG, HoleSizeThreshold } from '../gameplay/LevelConfig';

export interface IHoleGrowthService {
    init(): void;
    destroy(): void;
}

class HoleGrowthServiceImpl implements IHoleGrowthService {
    private _subscribed: boolean = false;

    init(): void {
        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            this._subscribed = true;
        }

        GameStore.setHoleScale(1);
        console.log('[HoleGrowthService] Инициализирован, подписка на ITEM_COLLECTED');
    }

    destroy(): void {
        if (!this._subscribed) return;
        EventBus.off(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
        this._subscribed = false;
    }

    private _onItemCollected = (_payload: { score: number; totalScore: number }): void => {
        this._recalculate(GameStore.collectedCount);
    };

    private _recalculate(collectedCount: number): void {
        if (!LEVEL_CONFIG) return;

        const prevScale = GameStore.holeScale;
        const result = this._scaleFromThresholds(collectedCount, LEVEL_CONFIG.holeSizeThresholds);
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
