/**
 * EventBus — единая шина событий (Pub/Sub).
 * Все коммуникации между системами ОБЯЗАНЫ проходить через EventBus.
 * Прямые зависимости между компонентами запрещены (RULES §1.1).
 */
import { GameState } from './GameState';
import { CollectableType } from '../gameplay/Collectable';

/** Перечень всех игровых событий */
export const enum GameEvent {
    // FSM
    STATE_CHANGED       = 'state_changed',
    // Gameplay
    GAME_START          = 'game_start',
    GAME_END            = 'game_end',
    ITEM_COLLECTED      = 'item_collected',
    // Progression
    SCORE_CHANGED       = 'score_changed',
    HOLE_SIZE_CHANGED   = 'hole_size_changed',
    REMAINING_CHANGED   = 'remaining_changed',
    // Timer
    TIMER_TICK          = 'timer_tick',
    TIMER_EXPIRED       = 'timer_expired',
    // Input
    FIRST_TOUCH         = 'first_touch',
}

/** Данные событий */
export interface EventPayloadMap {
    [GameEvent.STATE_CHANGED]:     { state: GameState };
    [GameEvent.GAME_START]:        null;
    [GameEvent.GAME_END]:          { score: number };
    [GameEvent.ITEM_COLLECTED]:    { score: number; totalScore: number };
    [GameEvent.SCORE_CHANGED]:     { score: number };
    [GameEvent.HOLE_SIZE_CHANGED]: { scale: number };
    [GameEvent.REMAINING_CHANGED]: { counts: Record<CollectableType, number> };
    [GameEvent.TIMER_TICK]:        { timeLeft: number };
    [GameEvent.TIMER_EXPIRED]:     null;
    [GameEvent.FIRST_TOUCH]:       null;
}

type Listener<E extends GameEvent> = (payload: EventPayloadMap[E]) => void;

/** Запись подписчика с контекстом для корректного off() */
interface ListenerEntry {
    fn:  Function;
    ctx: unknown;
}

export interface IEventBus {
    on<E extends GameEvent>(event: E, listener: Listener<E>, ctx?: unknown): void;
    off<E extends GameEvent>(event: E, listener: Listener<E>, ctx?: unknown): void;
    emit<E extends GameEvent>(event: E, payload: EventPayloadMap[E]): void;
}

class EventBusImpl implements IEventBus {
    private readonly _listeners: Map<string, ListenerEntry[]> = new Map();

    on<E extends GameEvent>(event: E, listener: Listener<E>, ctx?: unknown): void {
        let arr = this._listeners.get(event);
        if (!arr) { arr = []; this._listeners.set(event, arr); }
        arr.push({ fn: listener, ctx });
    }

    off<E extends GameEvent>(event: E, listener: Listener<E>, ctx?: unknown): void {
        const arr = this._listeners.get(event);
        if (!arr) return;
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].fn === listener && arr[i].ctx === ctx) {
                arr.splice(i, 1);
            }
        }
    }

    emit<E extends GameEvent>(event: E, payload: EventPayloadMap[E]): void {
        const arr = this._listeners.get(event);
        if (!arr) return;
        // Итерируем копию, если подписчик отписывается в обработчике
        const copy = arr.slice();
        for (let i = 0; i < copy.length; i++) {
            copy[i].fn.call(copy[i].ctx, payload);
        }
    }
}

/** Синглтон шины событий */
export let EventBus: IEventBus = new EventBusImpl();
