import { AdNetworkManager } from '../core/AdNetworkManager';
import { EndCardView } from './EndCardView';

/**
 * EndCardPresenter — EndGame UI.
 * Управляется EndGameState через show().
 */
export class EndCardPresenter {
    private _view: EndCardView;

    constructor(view: EndCardView) {
        this._view = view;
    }

    public init(): void {
        this._view.initCtaButton(this._onCtaClick, this);
    }

    public destroy(): void {
        this._view.destroyCtaButton(this._onCtaClick, this);
    }

    public show(): void {
        this._view.show();
    }

    /** CTA — единственный правильный способ редиректа (RULES §1.3 + §3.3) */
    private _onCtaClick = (): void => {
        AdNetworkManager.handleClickout();
    };
}
