/**
 * GameplayState — активный геймплей + обратный отсчёт.
 */
import { EventBus, GameEvent } from '../EventBus';
import { TimerService } from '../TimerService';
import { IGamePhase } from './IGamePhase';

export class GameplayState implements IGamePhase {
    enter(): void {
        EventBus.emit(GameEvent.GAME_START, null);
        TimerService.start();
    }

    exit(): void {
        TimerService.stop();
    }
}
