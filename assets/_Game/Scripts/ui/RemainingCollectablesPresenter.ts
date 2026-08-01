import { EventBus, GameEvent } from '../core/EventBus';
import { GameStore } from '../core/GameStore';
import { CollectableType } from '../gameplay/Collectable';
import { RemainingCollectablesView } from './RemainingCollectablesView';

export class RemainingCollectablesPresenter {
    private _view: RemainingCollectablesView;

    constructor(view: RemainingCollectablesView) {
        this._view = view;
    }

    public init(): void {
        EventBus.on(GameEvent.REMAINING_CHANGED, this._onRemainingChanged, this);
        // Initial update
        this._view.updateCounts(GameStore.remainingCounts);
    }

    public destroy(): void {
        EventBus.off(GameEvent.REMAINING_CHANGED, this._onRemainingChanged, this);
    }

    private _onRemainingChanged(payload: { counts: Record<CollectableType, number> }): void {
        this._view.updateCounts(payload.counts);
    }
}
