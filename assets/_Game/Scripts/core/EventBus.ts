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
    // Type cleared (все предметы данного типа собраны)
    TYPE_BLUE_CLEARED      = 'type_blue_cleared',
    TYPE_RED_CLEARED       = 'type_red_cleared',
    TYPE_GREEN_CLEARED     = 'type_green_cleared',
    TYPE_TEAL_CLEARED = 'type_teal_cleared',
    // Doors / Gates
    DOOR_OPENED         = 'door_opened',
    GATE_TOUCHED        = 'gate_touched',
    // Timer
    TIMER_TICK          = 'timer_tick',
    TIMER_EXPIRED       = 'timer_expired',
    // Input
    FIRST_TOUCH         = 'first_touch',
    TOUCH_START         = 'touch_start',
    TOUCH_END           = 'touch_end',
    // Camera intro A→B finished
    CAMERA_INTRO_COMPLETE = 'camera_intro_complete',
    // Praise / Perfect message (каждые N собранных)
    PERFECT_MESSAGE     = 'perfect_message',
}

/** Данные событий */
export interface EventPayloadMap {
    [GameEvent.STATE_CHANGED]:     { state: GameState };
    [GameEvent.GAME_START]:        null;
    [GameEvent.GAME_END]:          { score: number };
    [GameEvent.ITEM_COLLECTED]:    { score: number; totalScore: number; type: CollectableType };
    [GameEvent.SCORE_CHANGED]:     { score: number };
    [GameEvent.HOLE_SIZE_CHANGED]: { scale: number };
    [GameEvent.REMAINING_CHANGED]: { counts: Record<CollectableType, number> };
    [GameEvent.TYPE_BLUE_CLEARED]:      null;
    [GameEvent.TYPE_RED_CLEARED]:       null;
    [GameEvent.TYPE_GREEN_CLEARED]:     null;
    [GameEvent.TYPE_TEAL_CLEARED]: null;
    [GameEvent.DOOR_OPENED]:       { type: CollectableType };
    [GameEvent.GATE_TOUCHED]:      null;
    [GameEvent.TIMER_TICK]:        { timeLeft: number };
    [GameEvent.TIMER_EXPIRED]:     null;
    [GameEvent.FIRST_TOUCH]:            null;
    [GameEvent.TOUCH_START]:            null;
    [GameEvent.TOUCH_END]:              null;
    [GameEvent.CAMERA_INTRO_COMPLETE]:  null;
    [GameEvent.PERFECT_MESSAGE]:        { collectedCount: number };
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
    /**
     * Стек scratch-буферов: вложенный emit (ITEM_COLLECTED → HOLE_SIZE_CHANGED)
     * не должен перетирать копию слушателей внешнего emit.
     */
    private readonly _emitStack: ListenerEntry[][] = [[]];
    private _emitDepth: number = 0;

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
        if (!arr || arr.length === 0) return;

        const depth = this._emitDepth;
        let scratch = this._emitStack[depth];
        if (!scratch) {
            scratch = [];
            this._emitStack[depth] = scratch;
        }

        const len = arr.length;
        scratch.length = len;
        for (let i = 0; i < len; i++) {
            scratch[i] = arr[i];
        }

        this._emitDepth = depth + 1;
        try {
            for (let i = 0; i < len; i++) {
                const entry = scratch[i];
                if (!entry) continue;
                entry.fn.call(entry.ctx, payload);
            }
        } finally {
            this._emitDepth = depth;
            // Сбросить ссылки, чтобы GC мог собрать отписанных (длина буфера сохраняется)
            for (let i = 0; i < len; i++) {
                scratch[i] = undefined!;
            }
            scratch.length = 0;
        }
    }
}

/** Синглтон шины событий */
export let EventBus: IEventBus = new EventBusImpl();
