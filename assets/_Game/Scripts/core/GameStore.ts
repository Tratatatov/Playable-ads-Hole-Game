/**
 * GameStore — единственное хранилище игрового состояния.
 * Только этот класс мутирует score, holeScale, timeLeft.
 * Запрещены глобальные флаги вне этого класса (RULES §1.2).
 */

import { EventBus, GameEvent } from './EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IGameStore {
    readonly score: number;
    readonly holeScale: number;
    readonly timeLeft: number;
    reset(): void;
    addScore(delta: number): void;
    setTimeLeft(t: number): void;
}

class GameStoreImpl implements IGameStore {
    private _score:      number = 0;
    private _holeScale:  number = 1;
    private _timeLeft:   number = 0;

    get score():     number { return this._score; }
    get holeScale(): number { return this._holeScale; }
    get timeLeft():  number { return this._timeLeft; }

    reset(): void {
        this._score     = 0;
        this._holeScale = 1;
        this._timeLeft  = LEVEL_CONFIG.totalTime;
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
