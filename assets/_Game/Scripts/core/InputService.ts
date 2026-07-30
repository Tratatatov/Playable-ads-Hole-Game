/**
 * InputService — глобальный сервис для обработки пользовательского ввода.
 * Инкапсулирует логику работы с Cocos input system.
 */

import { Vec2, input, Input, EventTouch, EventMouse } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStateMachine, GameState } from './GameStateMachine';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IInputService {
    readonly inputDelta: Readonly<Vec2>;
    readonly isTouching: boolean;
    consumeDelta(): Readonly<Vec2>;
    enable(): void;
    disable(): void;
}

class InputServiceImpl implements IInputService {
    private _inputDelta: Vec2 = new Vec2();
    private _touchStart: Vec2 = new Vec2();
    private _consumeScratch: Vec2 = new Vec2();
    private _isTouching: boolean = false;
    private _enabled: boolean = false;

    get inputDelta(): Readonly<Vec2> { return this._inputDelta; }
    get isTouching(): boolean { return this._isTouching; }

    /** Возвращает текущее отклонение виртуального джойстика */
    consumeDelta(): Readonly<Vec2> {
        // Мы НЕ сбрасываем _inputDelta в 0, так как это виртуальный джойстик.
        // Он должен сохранять отклонение, пока палец не отпущен (TOUCH_END).
        this._consumeScratch.set(this._inputDelta);
        return this._consumeScratch;
    }

    enable(): void {
        if (this._enabled) return;
        this._enabled = true;
        input.on(Input.EventType.TOUCH_START, this._onInputStart, this);
        input.on(Input.EventType.TOUCH_MOVE,  this._onInputMove,  this);
        input.on(Input.EventType.TOUCH_END,   this._onInputEnd,   this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onInputEnd,  this);

        // Для надежности на десктопе, если отключена эмуляция тачей
        input.on(Input.EventType.MOUSE_DOWN, this._onInputStart, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onInputMove,  this);
        input.on(Input.EventType.MOUSE_UP,   this._onInputEnd,   this);
    }

    disable(): void {
        if (!this._enabled) return;
        this._enabled = false;
        input.off(Input.EventType.TOUCH_START, this._onInputStart, this);
        input.off(Input.EventType.TOUCH_MOVE,  this._onInputMove,  this);
        input.off(Input.EventType.TOUCH_END,   this._onInputEnd,   this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onInputEnd, this);

        input.off(Input.EventType.MOUSE_DOWN, this._onInputStart, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onInputMove,  this);
        input.off(Input.EventType.MOUSE_UP,   this._onInputEnd,   this);

        this._isTouching = false;
        this._inputDelta.set(0, 0);
    }

    private _onInputStart = (e: EventTouch | EventMouse): void => {
        this._isTouching = true;
        this._inputDelta.set(0, 0);
        this._touchStart.set(e.getLocation());
        
        // Первый тач → переход Tutorial → Gameplay
        if (GameStateMachine.is(GameState.Tutorial)) {
            EventBus.emit(GameEvent.FIRST_TOUCH, null);
        }
    };

    private _onInputMove = (e: EventTouch | EventMouse): void => {
        if (!this._isTouching) return;
        
        const loc = e.getLocation();
        const sens = (LEVEL_CONFIG && LEVEL_CONFIG.inputSensitivity) ? LEVEL_CONFIG.inputSensitivity : 100;
        
        // Виртуальный джойстик: отклонение от начальной точки клика
        const dx = (loc.x - this._touchStart.x) / sens;
        const dy = (loc.y - this._touchStart.y) / sens;

        // Clamp [-1, 1]
        this._inputDelta.set(
            Math.max(-1, Math.min(1, dx)),
            Math.max(-1, Math.min(1, dy))
        );
    };

    private _onInputEnd = (): void => {
        this._isTouching = false;
        this._inputDelta.set(0, 0);
    };
}

export let InputService: IInputService = new InputServiceImpl();
