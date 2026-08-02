import { EventBus, GameEvent } from '../core/EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { TimerView } from './TimerView';

/**
 * TimerPresenter — подписка на TIMER_TICK и обновление TimerView.
 */
export class TimerPresenter {
    private _view: TimerView;

    constructor(view: TimerView) {
        this._view = view;
    }

    public init(): void {
        EventBus.on(GameEvent.TIMER_TICK, this._onTimerTick, this);
        this._view.updateTime(LEVEL_CONFIG.totalTime);
    }

    public destroy(): void {
        EventBus.off(GameEvent.TIMER_TICK, this._onTimerTick, this);
    }

    private _onTimerTick(payload: { timeLeft: number }): void {
        this._view.updateTime(payload.timeLeft);
    }
}
