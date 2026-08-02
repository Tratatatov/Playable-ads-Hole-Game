/**
 * TutorialState — ждём первый ввод, показываем tutorial UI.
 */
import { IGamePhase } from './IGamePhase';
import { TutorialPresenter } from '../../ui/TutorialPresenter';
import { UIMessagesService } from '../../ui/UIMessagesService';

export class TutorialState implements IGamePhase {
    constructor(private readonly _tutorial: TutorialPresenter | null) {}

    enter(): void {
        this._tutorial?.show();
        UIMessagesService.showTutorial();
        UIMessagesService.showTutorialFinger();
    }

    exit(): void {
        this._tutorial?.hide();
        UIMessagesService.hideTutorial();
        UIMessagesService.hideTutorialFinger();
    }
}
