import { EventBus, GameEvent } from '../core/EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { HUDView } from './HUDView';

export class HUDPresenter {
    private _view: HUDView;

    constructor(view: HUDView) {
        this._view = view;
    }

    public init(): void {
        EventBus.on(GameEvent.SCORE_CHANGED,  this._onScoreChanged,  this);
        EventBus.on(GameEvent.TIMER_TICK,     this._onTimerTick,     this);
        
        // Initial setup without animation if possible, but for simplicity we reuse updateScore.
        // Usually, the score is 0 and timer is totalTime at init.
        // To avoid punch animation at start, we could add a flag, but keeping it simple.
        this._view.updateTimer(LEVEL_CONFIG.totalTime);
    }

    public destroy(): void {
        EventBus.off(GameEvent.SCORE_CHANGED,  this._onScoreChanged,  this);
        EventBus.off(GameEvent.TIMER_TICK,     this._onTimerTick,     this);
    }

    private _onScoreChanged(payload: { score: number }): void {
        this._view.updateScore(payload.score);
    }

    private _onTimerTick(payload: { timeLeft: number }): void {
        this._view.updateTimer(payload.timeLeft);
    }
}
