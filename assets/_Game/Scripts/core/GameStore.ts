/**
 * GameStore — единственное хранилище игрового состояния.
 * Только этот класс мутирует score, holeScale, timeLeft, collectedCount.
 * Запрещены глобальные флаги вне этого класса (RULES §1.2).
 */

import { EventBus, GameEvent } from './EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { CollectableType } from '../gameplay/Collectable';

export interface IGameStore {
    readonly score: number;
    readonly holeScale: number;
    readonly timeLeft: number;
    readonly collectedCount: number;
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
    private _collectedCount: number = 0;
    private _remainingCounts: Record<CollectableType, number> = {
        [CollectableType.Blue]: 0,
        [CollectableType.Red]: 0,
        [CollectableType.Green]: 0,
        [CollectableType.Teal]: 0,
    };

    /** Переиспользуемые payload'ы — слушатели не должны сохранять ссылку между кадрами */
    private readonly _remainingPayload: { counts: Record<CollectableType, number> } = {
        counts: this._remainingCounts,
    };
    private readonly _scorePayload: { score: number } = { score: 0 };
    private readonly _holeScalePayload: { scale: number } = { scale: 1 };
    private readonly _timerPayload: { timeLeft: number } = { timeLeft: 0 };

    get score():     number { return this._score; }
    get holeScale(): number { return this._holeScale; }
    get timeLeft():  number { return this._timeLeft; }
    get collectedCount(): number { return this._collectedCount; }
    get remainingCounts(): Record<CollectableType, number> { return this._remainingCounts; }

    reset(): void {
        this._score     = 0;
        this._holeScale = 1;
        this._timeLeft  = LEVEL_CONFIG.totalTime;
        this._collectedCount = 0;
        this._remainingCounts[CollectableType.Blue] = 0;
        this._remainingCounts[CollectableType.Red] = 0;
        this._remainingCounts[CollectableType.Green] = 0;
        this._remainingCounts[CollectableType.Teal] = 0;
        this._remainingPayload.counts = this._remainingCounts;
    }

    setInitialCollectables(counts: Record<CollectableType, number>): void {
        this._remainingCounts[CollectableType.Blue] = counts[CollectableType.Blue] ?? 0;
        this._remainingCounts[CollectableType.Red] = counts[CollectableType.Red] ?? 0;
        this._remainingCounts[CollectableType.Green] = counts[CollectableType.Green] ?? 0;
        this._remainingCounts[CollectableType.Teal] = counts[CollectableType.Teal] ?? 0;
        this._remainingPayload.counts = this._remainingCounts;
        EventBus.emit(GameEvent.REMAINING_CHANGED, this._remainingPayload);
    }

    collectItem(type: CollectableType, scoreValue: number): void {
        this._collectedCount++;

        const prev = this._remainingCounts[type];
        if (prev > 0) {
            this._remainingCounts[type] = prev - 1;
        }
        EventBus.emit(GameEvent.REMAINING_CHANGED, this._remainingPayload);

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
        this._scorePayload.score = this._score;
        EventBus.emit(GameEvent.SCORE_CHANGED, this._scorePayload);
    }

    /** Масштаб дыры. Рост управляется HoleGrowthService → HOLE_SIZE_CHANGED. */
    setHoleScale(scale: number): void {
        if (this._holeScale === scale) return;
        this._holeScale = scale;
        this._holeScalePayload.scale = this._holeScale;
        EventBus.emit(GameEvent.HOLE_SIZE_CHANGED, this._holeScalePayload);
    }

    setTimeLeft(t: number): void {
        this._timeLeft = t;
        this._timerPayload.timeLeft = t;
        EventBus.emit(GameEvent.TIMER_TICK, this._timerPayload);
    }
}

export let GameStore: IGameStore = new GameStoreImpl();
