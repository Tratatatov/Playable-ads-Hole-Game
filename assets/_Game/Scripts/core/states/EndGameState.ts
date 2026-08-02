/**
 * EndGameState — отключаем управление, показываем EndGame UI.
 */
import { EventBus, GameEvent } from '../EventBus';
import { GameStore } from '../GameStore';
import { InputService } from '../InputService';
import { IGamePhase } from './IGamePhase';
import { EndCardPresenter } from '../../ui/EndCardPresenter';
import { UIMessagesService } from '../../ui/UIMessagesService';

export class EndGameState implements IGamePhase {
    constructor(private readonly _endCard: EndCardPresenter | null) {}

    enter(): void {
        InputService.disable();
        EventBus.emit(GameEvent.GAME_END, { score: GameStore.score });
        this._endCard?.show();
        UIMessagesService.showGameEndSprite();
    }

    exit(): void {
        // Терминальное состояние — выход не используется
    }
}
