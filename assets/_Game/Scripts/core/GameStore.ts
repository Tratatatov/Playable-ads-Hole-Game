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
    setHoleScale(scale: number): void;
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
        [CollectableType.Teal]: 0,
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
            [CollectableType.Teal]: 0,
        };
    }

    setInitialCollectables(counts: Record<CollectableType, number>): void {
        this._remainingCounts = { ...counts };
        EventBus.emit(GameEvent.REMAINING_CHANGED, { counts: this._remainingCounts });
    }

    collectItem(type: CollectableType, scoreValue: number): void {
        const prev = this._remainingCounts[type];
        if (prev > 0) {
            this._remainingCounts[type] = prev - 1;
        }
        EventBus.emit(GameEvent.REMAINING_CHANGED, { counts: this._remainingCounts });

        if (this._remainingCounts[type] <= 0 && prev > 0) {
            this._emitTypeCleared(type);
        }

        this.addScore(scoreValue);
    }

    private _emitTypeCleared(type: CollectableType): void {
        switch (type) {
            case CollectableType.Blue:
                EventBus.emit(GameEvent.TYPE_BLUE_CLEARED, null);
                break;
            case CollectableType.Red:
                EventBus.emit(GameEvent.TYPE_RED_CLEARED, null);
                break;
            case CollectableType.Green:
                EventBus.emit(GameEvent.TYPE_GREEN_CLEARED, null);
                break;
            case CollectableType.Teal:
                EventBus.emit(GameEvent.TYPE_TEAL_CLEARED, null);
                break;
        }
    }

    addScore(delta: number): void {
        this._score += delta;
        EventBus.emit(GameEvent.SCORE_CHANGED, { score: this._score });
    }

    /** Масштаб дыры. Рост управляется HoleGrowthService → HOLE_SIZE_CHANGED. */
    setHoleScale(scale: number): void {
        if (this._holeScale === scale) return;
        this._holeScale = scale;
        EventBus.emit(GameEvent.HOLE_SIZE_CHANGED, { scale: this._holeScale });
    }

    setTimeLeft(t: number): void {
        this._timeLeft = t;
        EventBus.emit(GameEvent.TIMER_TICK, { timeLeft: t });
    }
}

export let GameStore: IGameStore = new GameStoreImpl();
