/**
 * HoleGrowthService — рост дыры по порогам из LevelConfig.holeSizeThresholds.
 * Слушает ITEM_COLLECTED → пересчитывает scale → GameStore.setHoleScale → HOLE_SIZE_CHANGED.
 * HoleController плавно догоняет целевой масштаб через Lerp.
 */

import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

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
        this._recalculate(GameStore.score);
    };

    private _recalculate(totalScore: number): void {
        if (!LEVEL_CONFIG) return;
        GameStore.setHoleScale(this._scaleFromThresholds(totalScore, LEVEL_CONFIG.holeSizeThresholds));
    }

    /** Берём порог с максимальным scoreThreshold среди достигнутых */
    private _scaleFromThresholds(
        totalScore: number,
        thresholds: ReadonlyArray<{ scoreThreshold: number; sizeIncrease: number }>
    ): number {
        let bestScore = -1;
        let sizeIncrease = 0;
        let matched = false;

        for (let i = 0; i < thresholds.length; i++) {
            const t = thresholds[i];
            if (totalScore >= t.scoreThreshold && t.scoreThreshold >= bestScore) {
                bestScore = t.scoreThreshold;
                sizeIncrease = t.sizeIncrease;
                matched = true;
            }
        }

        return matched ? 1 + sizeIncrease : 1;
    }
}

export let HoleGrowthService: IHoleGrowthService = new HoleGrowthServiceImpl();
