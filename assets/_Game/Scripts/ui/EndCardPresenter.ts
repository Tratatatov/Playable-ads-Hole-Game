import { EventBus, GameEvent } from '../core/EventBus';
import { AdNetworkManager } from '../core/AdNetworkManager';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { EndCardView } from './EndCardView';

export class EndCardPresenter {
    private _view: EndCardView;

    constructor(view: EndCardView) {
        this._view = view;
    }

    public init(): void {
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);
        this._view.initCtaButton(this._onCtaClick, this);
    }

    public destroy(): void {
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
        this._view.destroyCtaButton(this._onCtaClick, this);
    }

    private _onGameEnd = (payload: { score: number }): void => {
        GameStateMachine.transition(GameState.EndCard);
        this._view.show(payload.score);
    };

    /** CTA — единственный правильный способ редиректа (RULES §1.3 + §3.3) */
    private _onCtaClick = (): void => {
        AdNetworkManager.handleClickout();
    };
}
