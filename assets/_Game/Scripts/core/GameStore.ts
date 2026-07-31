/**
 * GameStore — единственное хранилище игрового состояния.
 * Только этот класс мутирует score, holeScale, timeLeft.
 * Запрещены глобальные флаги вне этого класса (RULES §1.2).
 */

import { EventBus, GameEvent } from './EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { CollectableType } from '../gameplay/Collectable';

export interface IGameStore {
    readonly score: number;
    readonly holeScale: number;
    readonly timeLeft: number;
    readonly remainingCounts: Record<CollectableType, number>;
    reset(): void;
    addScore(delta: number): void;
    collectItem(type: CollectableType, scoreValue: number): void;
    setInitialCollectables(counts: Record<CollectableType, number>): void;
    setTimeLeft(t: number): void;
}

class GameStoreImpl implements IGameStore {
    private _score:      number = 0;
    private _holeScale:  number = 1;
    private _timeLeft:   number = 0;
    private _remainingCounts: Record<CollectableType, number> = {
        [CollectableType.Blue]: 0,
        [CollectableType.Red]: 0,
        [CollectableType.Green]: 0,
        [CollectableType.Turquoise]: 0,
    };

    get score():     number { return this._score; }
    get holeScale(): number { return this._holeScale; }
    get timeLeft():  number { return this._timeLeft; }
    get remainingCounts(): Record<CollectableType, number> { return this._remainingCounts; }

    reset(): void {
        this._score     = 0;
        this._holeScale = 1;
        this._timeLeft  = LEVEL_CONFIG.totalTime;
        this._remainingCounts = {
            [CollectableType.Blue]: 0,
            [CollectableType.Red]: 0,
            [CollectableType.Green]: 0,
            [CollectableType.Turquoise]: 0,
        };
    }

    setInitialCollectables(counts: Record<CollectableType, number>): void {
        this._remainingCounts = { ...counts };
        EventBus.emit(GameEvent.REMAINING_CHANGED, { counts: this._remainingCounts });
    }

    collectItem(type: CollectableType, scoreValue: number): void {
        if (this._remainingCounts[type] > 0) {
            this._remainingCounts[type]--;
        }
        EventBus.emit(GameEvent.REMAINING_CHANGED, { counts: this._remainingCounts });
        this.addScore(scoreValue);
    }

    addScore(delta: number): void {
        this._score += delta;
        this._holeScale += LEVEL_CONFIG.holeGrowthPerItem;
        
        EventBus.emit(GameEvent.SCORE_CHANGED, { score: this._score });
        EventBus.emit(GameEvent.HOLE_SIZE_CHANGED, { scale: this._holeScale });
        this._checkSizeThreshold();
    }

    setTimeLeft(t: number): void {
        this._timeLeft = t;
        EventBus.emit(GameEvent.TIMER_TICK, { timeLeft: t });
    }

    /** Проверяем пороги роста дыры по таблице HoleSizeThreshold */
    private _checkSizeThreshold(): void {
        const thresholds = LEVEL_CONFIG.holeSizeThresholds;
        let newScale = 1;
        for (let i = 0; i < thresholds.length; i++) {
            if (this._score >= thresholds[i].scoreThreshold) {
                newScale = 1 + thresholds[i].sizeIncrease;
            }
        }
        if (newScale !== this._holeScale) {
            this._holeScale = newScale;
            EventBus.emit(GameEvent.HOLE_SIZE_CHANGED, { scale: this._holeScale });
        }
    }
}

export let GameStore: IGameStore = new GameStoreImpl();
