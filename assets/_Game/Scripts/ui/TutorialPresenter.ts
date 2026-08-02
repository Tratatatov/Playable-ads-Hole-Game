import { tween, Tween } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { TutorialView } from './TutorialView';

/**
 * TutorialPresenter — показ/скрытие туториала (∞ + палец).
 *
 * Первые hintActiveSeconds (по умолчанию 5):
 *   - тач → fade out
 *   - отпускание → fade in
 * После окна — окончательный fade out.
 * Окно продолжает работать и после перехода Tutorial → Gameplay.
 */
export class TutorialPresenter {
    private _view: TutorialView;
    private _windowActive: boolean = false;
    private _hintVisible: boolean = false;
    private _delayTween: Tween<{ t: number }> | null = null;
    private readonly _delayProxy: { t: number } = { t: 0 };

    constructor(view: TutorialView) {
        this._view = view;
    }

    public init(): void {
        this._view.hideImmediate();
    }

    public destroy(): void {
        this._unsubscribeTouch();
        this._stopDelay();
        this._windowActive = false;
        this._view.stopAnimations();
    }

    public show(): void {
        this._stopDelay();
        this._unsubscribeTouch();
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);

        this._windowActive = true;
        this._hintVisible = true;
        this._view.show();
        this._subscribeTouch();
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);

        const seconds = Math.max(0.01, this._view.hintActiveSeconds);
        this._delayProxy.t = 0;
        this._delayTween = tween(this._delayProxy)
            .to(seconds, { t: 1 })
            .call(() => {
                this._delayTween = null;
                this._endHintWindow();
            })
            .start();
    }

    /** Принудительно закрыть (EndGame и т.п.). Не вызывать при Tutorial → Gameplay. */
    public hide(): void {
        this._endHintWindow();
    }

    private _onGameEnd = (): void => {
        this._endHintWindow();
    };

    private _subscribeTouch(): void {
        EventBus.on(GameEvent.TOUCH_START, this._onTouchStart, this);
        EventBus.on(GameEvent.TOUCH_END, this._onTouchEnd, this);
    }

    private _unsubscribeTouch(): void {
        EventBus.off(GameEvent.TOUCH_START, this._onTouchStart, this);
        EventBus.off(GameEvent.TOUCH_END, this._onTouchEnd, this);
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
    }

    private _onTouchStart = (): void => {
        if (!this._windowActive || !this._hintVisible) return;
        this._hintVisible = false;
        this._view.fadeOutOnTouch();
    };

    private _onTouchEnd = (): void => {
        if (!this._windowActive || this._hintVisible) return;
        this._hintVisible = true;
        this._view.fadeInOnRelease();
    };

    private _endHintWindow(): void {
        if (!this._windowActive && !this._hintVisible) {
            this._unsubscribeTouch();
            this._stopDelay();
            return;
        }
        this._windowActive = false;
        this._hintVisible = false;
        this._unsubscribeTouch();
        this._stopDelay();
        this._view.hidePermanent();
    }

    private _stopDelay(): void {
        if (this._delayTween) {
            this._delayTween.stop();
            this._delayTween = null;
        }
    }
}
