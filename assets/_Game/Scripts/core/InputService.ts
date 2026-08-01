/**
 * InputService — глобальный сервис для обработки пользовательского ввода.
 *
 * Паттерн (hole.io-подобные игры, один палец):
 *   - Якорь = точка касания.
 *   - Смещение пальца от якоря задаёт направление и силу (в % экрана).
 *   - Пока палец удерживается со смещением — дыра едет; отпустил — стоп.
 */

import { Vec2, input, Input, EventTouch, EventMouse } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStateMachine, GameState } from './GameStateMachine';

export interface IInputService {
    /** Смещение от точки касания в пикселях экрана (UI coords). */
    readonly touchOffset: Readonly<Vec2>;
    readonly isTouching: boolean;
    enable(): void;
    disable(): void;
}

class InputServiceImpl implements IInputService {
    private _touchOffset: Vec2 = new Vec2();
    private _touchStart: Vec2 = new Vec2();
    private _isTouching: boolean = false;
    private _enabled: boolean = false;

    get touchOffset(): Readonly<Vec2> { return this._touchOffset; }
    get isTouching(): boolean { return this._isTouching; }

    enable(): void {
        if (this._enabled) return;
        this._enabled = true;
        input.on(Input.EventType.TOUCH_START,  this._onInputStart, this);
        input.on(Input.EventType.TOUCH_MOVE,   this._onInputMove,  this);
        input.on(Input.EventType.TOUCH_END,    this._onInputEnd,   this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onInputEnd,   this);

        input.on(Input.EventType.MOUSE_DOWN, this._onInputStart, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onInputMove,  this);
        input.on(Input.EventType.MOUSE_UP,   this._onInputEnd,   this);
    }

    disable(): void {
        if (!this._enabled) return;
        this._enabled = false;
        input.off(Input.EventType.TOUCH_START,  this._onInputStart, this);
        input.off(Input.EventType.TOUCH_MOVE,   this._onInputMove,  this);
        input.off(Input.EventType.TOUCH_END,    this._onInputEnd,   this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onInputEnd,  this);

        input.off(Input.EventType.MOUSE_DOWN, this._onInputStart, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onInputMove,  this);
        input.off(Input.EventType.MOUSE_UP,   this._onInputEnd,   this);

        this._isTouching = false;
        this._touchOffset.set(0, 0);
    }

    private _onInputStart = (e: EventTouch | EventMouse): void => {
        this._isTouching = true;
        this._touchOffset.set(0, 0);
        this._touchStart.set(e.getLocation());

        if (GameStateMachine.is(GameState.Tutorial)) {
            EventBus.emit(GameEvent.FIRST_TOUCH, null);
        }
    };

    private _onInputMove = (e: EventTouch | EventMouse): void => {
        if (!this._isTouching) return;
        const loc = e.getLocation();
        this._touchOffset.x = loc.x - this._touchStart.x;
        this._touchOffset.y = loc.y - this._touchStart.y;
    };

    private _onInputEnd = (): void => {
        this._isTouching = false;
        this._touchOffset.set(0, 0);
    };
}

export let InputService: IInputService = new InputServiceImpl();
