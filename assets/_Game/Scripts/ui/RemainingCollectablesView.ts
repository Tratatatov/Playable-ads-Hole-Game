import { Label } from 'cc';
import { CollectableType } from '../gameplay/Collectable';

export class RemainingCollectablesView {
    private _blueLabel: Label | null = null;
    private _redLabel: Label | null = null;
    private _greenLabel: Label | null = null;
    private _tealLabel: Label | null = null;

    constructor(blueLabel: Label, redLabel: Label, greenLabel: Label, tealLabel: Label) {
        this._blueLabel = blueLabel;
        this._redLabel = redLabel;
        this._greenLabel = greenLabel;
        this._tealLabel = tealLabel;
    }

    public updateCounts(counts: Record<CollectableType, number>): void {
        if (this._blueLabel) this._blueLabel.string = `${counts[CollectableType.Blue]}`;
        if (this._redLabel) this._redLabel.string = `${counts[CollectableType.Red]}`;
        if (this._greenLabel) this._greenLabel.string = `${counts[CollectableType.Green]}`;
        if (this._tealLabel) this._tealLabel.string = `${counts[CollectableType.Teal]}`;
    }
}
