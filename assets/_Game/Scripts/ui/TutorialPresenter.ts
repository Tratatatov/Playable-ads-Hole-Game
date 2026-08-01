import { EventBus, GameEvent } from '../core/EventBus';
import { TutorialView } from './TutorialView';

export class TutorialPresenter {
    private _view: TutorialView;

    constructor(view: TutorialView) {
        this._view = view;
    }

    public init(): void {
        EventBus.on(GameEvent.GAME_START, this._onGameStart, this);
        this._view.show();
    }

    public destroy(): void {
        EventBus.off(GameEvent.GAME_START, this._onGameStart, this);
        this._view.stopAnimations();
    }

    private _onGameStart = (): void => {
        this._view.hide();
    };
}
