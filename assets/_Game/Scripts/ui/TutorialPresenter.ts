import { TutorialView } from './TutorialView';

/**
 * TutorialPresenter — показ/скрытие туториала.
 * Управляется TutorialState через show()/hide().
 */
export class TutorialPresenter {
    private _view: TutorialView;

    constructor(view: TutorialView) {
        this._view = view;
    }

    public init(): void {
        // Скрыт до входа в TutorialState
        this._view.hideImmediate();
    }

    public destroy(): void {
        this._view.stopAnimations();
    }

    public show(): void {
        this._view.show();
    }

    public hide(): void {
        this._view.hide();
    }
}
