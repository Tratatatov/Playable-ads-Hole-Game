/**
 * TutorialState — ждём первый ввод, показываем tutorial UI.
 */
import { IGamePhase } from './IGamePhase';
import { TutorialPresenter } from '../../ui/TutorialPresenter';

export class TutorialState implements IGamePhase {
    constructor(private readonly _tutorial: TutorialPresenter | null) {}

    enter(): void {
        this._tutorial?.show();
    }

    exit(): void {
        this._tutorial?.hide();
    }
}
