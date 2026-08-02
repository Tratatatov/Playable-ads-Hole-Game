/**
 * InputService — глобальный сервис для обработки пользовательского ввода.
 *
 * Паттерн (hole.io-подобные игры, один палец):
 *   - Якорь = точка касания.
 *   - Смещение пальца от якоря задаёт направление и силу (в % экрана).
 *   - Пока палец удерживается со смещением — дыра едет; отпустил — стоп.
 *
 * Мышь и тач разделены: HoleMovement берёт разные пороги из LevelConfig.
 */

import { Vec2, input, Input, EventTouch, EventMouse } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStateMachine, GameState } from './GameStateMachine';

export interface IInputService {
    /** Смещение от точки касания в пикселях экрана (UI coords). */
    readonly touchOffset: Readonly<Vec2>;
    readonly isTouching: boolean;
    /** true, если текущий жест от мыши (не от тача). */
    readonly isMouseInput: boolean;
    enable(): void;
    disable(): void;
}

class InputServiceImpl implements IInputService {
    private _touchOffset: Vec2 = new Vec2();
    private _touchStart: Vec2 = new Vec2();
    private _isTouching: boolean = false;
    private _isMouseInput: boolean = false;
    private _enabled: boolean = false;

    get touchOffset(): Readonly<Vec2> { return this._touchOffset; }
    get isTouching(): boolean { return this._isTouching; }
    get isMouseInput(): boolean { return this._isMouseInput; }

    enable(): void {
        if (this._enabled) return;
        this._enabled = true;
        input.on(Input.EventType.TOUCH_START,  this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE,   this._onTouchMove,  this);
        input.on(Input.EventType.TOUCH_END,    this._onTouchEnd,   this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd,   this);

        input.on(Input.EventType.MOUSE_DOWN, this._onMouseStart, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove,  this);
        input.on(Input.EventType.MOUSE_UP,   this._onMouseEnd,   this);
    }

    disable(): void {
        if (!this._enabled) return;
        this._enabled = false;
        input.off(Input.EventType.TOUCH_START,  this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE,   this._onTouchMove,  this);
        input.off(Input.EventType.TOUCH_END,    this._onTouchEnd,   this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd,   this);

        input.off(Input.EventType.MOUSE_DOWN, this._onMouseStart, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove,  this);
        input.off(Input.EventType.MOUSE_UP,   this._onMouseEnd,   this);

        this._isTouching = false;
        this._isMouseInput = false;
        this._touchOffset.set(0, 0);
    }

    private _begin(e: EventTouch | EventMouse, isMouse: boolean): void {
        this._isTouching = true;
        this._isMouseInput = isMouse;
        this._touchOffset.set(0, 0);
        this._touchStart.set(e.getLocation());

        EventBus.emit(GameEvent.TOUCH_START, null);

        if (GameStateMachine.is(GameState.Tutorial)) {
            EventBus.emit(GameEvent.FIRST_TOUCH, null);
        }
    }

    private _move(e: EventTouch | EventMouse): void {
        if (!this._isTouching) return;
        const loc = e.getLocation();
        this._touchOffset.x = loc.x - this._touchStart.x;
        this._touchOffset.y = loc.y - this._touchStart.y;
    }

    private _end(): void {
        if (!this._isTouching) return;
        this._isTouching = false;
        this._isMouseInput = false;
        this._touchOffset.set(0, 0);
        EventBus.emit(GameEvent.TOUCH_END, null);
    }

    private _onTouchStart = (e: EventTouch): void => { this._begin(e, false); };
    private _onTouchMove  = (e: EventTouch): void => { this._move(e); };
    private _onTouchEnd   = (): void => { this._end(); };

    private _onMouseStart = (e: EventMouse): void => { this._begin(e, true); };
    private _onMouseMove  = (e: EventMouse): void => {
        if (!this._isMouseInput) return; // не перебивать активный тач
        this._move(e);
    };
    private _onMouseEnd   = (): void => {
        if (!this._isMouseInput) return;
        this._end();
    };
}

export let InputService: IInputService = new InputServiceImpl();
