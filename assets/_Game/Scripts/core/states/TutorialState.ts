/**
 * TutorialState — ждём первый ввод, показываем tutorial UI.
 * Fade / окно 5с / тач→скрыть→показать — TutorialPresenter (живёт и в Gameplay).
 */
import { IGamePhase } from './IGamePhase';
import { InputService } from '../InputService';
import { TutorialPresenter } from '../../ui/TutorialPresenter';

export class TutorialState implements IGamePhase {
    constructor(private readonly _tutorial: TutorialPresenter | null) {}

    enter(): void {
        // Ввод включается только после пролёта камеры
        InputService.enable();
        this._tutorial?.show();
    }

    exit(): void {
        // Не скрываем hint здесь — Presenter держит окно ещё hintActiveSeconds
        // (тач → fade out, отпускание → fade in), затем сам гасит насовсем.
    }
}
