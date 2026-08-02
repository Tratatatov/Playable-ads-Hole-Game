/**
 * GameStateMachine — конечный автомат состояний игры.
 * Допустимые переходы: Boot → CameraIntro → Tutorial → Gameplay → EndGame.
 * При переходе вызывает exit() текущей фазы и enter() следующей.
 */
import { EventBus, GameEvent } from './EventBus';
import { GameState } from './GameState';
import { IGamePhase } from './states/IGamePhase';

export { GameState };

/** Допустимые переходы состояний */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    [GameState.Boot]:        [GameState.CameraIntro],
    [GameState.CameraIntro]: [GameState.Tutorial],
    [GameState.Tutorial]:    [GameState.Gameplay],
    [GameState.Gameplay]:    [GameState.EndGame],
    [GameState.EndGame]:      [],
};

export interface IGameStateMachine {
    readonly current: GameState;
    is(state: GameState): boolean;
    register(state: GameState, phase: IGamePhase): void;
    transition(next: GameState): boolean;
}

class GameStateMachineImpl implements IGameStateMachine {
    private _current: GameState = GameState.Boot;
    private readonly _phases: Partial<Record<GameState, IGamePhase>> = {};

    get current(): GameState { return this._current; }

    is(state: GameState): boolean { return this._current === state; }

    register(state: GameState, phase: IGamePhase): void {
        this._phases[state] = phase;
    }

    /**
     * Переход в новое состояние.
     * exit() → смена current → enter() → STATE_CHANGED.
     */
    transition(next: GameState): boolean {
        const allowed = ALLOWED_TRANSITIONS[this._current] ?? [];
        if (allowed.indexOf(next) === -1) {
            console.warn(`[FSM] Invalid transition: ${this._current} → ${next}`);
            return false;
        }

        this._phases[this._current]?.exit();
        this._current = next;
        this._phases[next]?.enter();
        EventBus.emit(GameEvent.STATE_CHANGED, { state: next });
        return true;
    }
}

/** Синглтон FSM */
export let GameStateMachine: IGameStateMachine = new GameStateMachineImpl();
