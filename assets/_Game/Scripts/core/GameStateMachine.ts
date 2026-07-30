/**
 * GameStateMachine — конечный автомат состояний игры.
 * Допустимые переходы: Boot → Tutorial → Gameplay → EndCard.
 * Запрещены глобальные флаги isStarted/isOver вне GameStore (RULES §1.2).
 */
import { EventBus, GameEvent } from './EventBus';
import { GameState } from './GameState';

export { GameState };

/** Допустимые переходы состояний */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    [GameState.Boot]:     [GameState.Tutorial],
    [GameState.Tutorial]: [GameState.Gameplay],
    [GameState.Gameplay]: [GameState.EndCard],
    [GameState.EndCard]:  [],
};

export interface IGameStateMachine {
    readonly current: GameState;
    is(state: GameState): boolean;
    transition(next: GameState): boolean;
}

class GameStateMachineImpl implements IGameStateMachine {
    private _current: GameState = GameState.Boot;

    get current(): GameState { return this._current; }

    is(state: GameState): boolean { return this._current === state; }

    /**
     * Переход в новое состояние.
     * Эмитит STATE_CHANGED в EventBus ПОСЛЕ смены.
     */
    transition(next: GameState): boolean {
        const allowed = ALLOWED_TRANSITIONS[this._current] ?? [];
        if (allowed.indexOf(next) === -1) {
            console.warn(`[FSM] Invalid transition: ${this._current} \u2192 ${next}`);
            return false;
        }
        this._current = next;
        EventBus.emit(GameEvent.STATE_CHANGED, { state: next });
        return true;
    }
}

/** Синглтон FSM */
export let GameStateMachine: IGameStateMachine = new GameStateMachineImpl();
