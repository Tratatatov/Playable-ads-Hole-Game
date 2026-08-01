/**
 * TimerService — сервис обратного отсчёта.
 * Тикает раз в секунду через GameStore / EventBus (TIMER_TICK).
 * По истечении эмитит TIMER_EXPIRED.
 */

import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface ITimerService {
    readonly timeLeft: number;
    readonly isRunning: boolean;
    /** Инициализация стартовым временем (сек). По умолчанию — LevelConfig.totalTime. */
    init(totalSeconds?: number): void;
    start(): void;
    stop(): void;
    update(dt: number): void;
}

class TimerServiceImpl implements ITimerService {
    private _running: boolean = false;
    private _totalSeconds: number = 0;
    private _timeAccum: number = 0;
    private _lastEmitted: number = -1;

    get timeLeft(): number {
        return Math.max(0, this._totalSeconds - Math.floor(this._timeAccum));
    }

    get isRunning(): boolean {
        return this._running;
    }

    init(totalSeconds?: number): void {
        this._totalSeconds = totalSeconds ?? LEVEL_CONFIG.totalTime;
        this._timeAccum = 0;
        this._running = false;
        this._lastEmitted = -1;
        this._emitIfChanged(this._totalSeconds);
    }

    start(): void {
        this._timeAccum = 0;
        this._lastEmitted = -1;
        this._running = true;
        this._emitIfChanged(this._totalSeconds);
    }

    stop(): void {
        this._running = false;
    }

    update(dt: number): void {
        if (!this._running) return;

        this._timeAccum += dt;
        const left = this.timeLeft;
        this._emitIfChanged(left);

        if (left <= 0) {
            this._running = false;
            EventBus.emit(GameEvent.TIMER_EXPIRED, null);
        }
    }

    private _emitIfChanged(seconds: number): void {
        if (seconds === this._lastEmitted) return;
        this._lastEmitted = seconds;
        GameStore.setTimeLeft(seconds);
    }
}

export let TimerService: ITimerService = new TimerServiceImpl();
