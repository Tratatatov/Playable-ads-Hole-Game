/**
 * DoorService — открывает двери при полном сборе типа коллектаблов.
 * Подписывается на TYPE_*_CLEARED; ссылки на двери — из LevelConfig.
 * При открытии: сразу отключает коллайдер, шлёт DOOR_OPENED →
 * jump→fall съезд View; View скрывается по окончании tween.
 */

import { Node } from 'cc';
import { EventBus, GameEvent, EventPayloadMap } from './EventBus';
import { TweenService } from './TweenService';
import { CollectableType } from '../gameplay/Collectable';
import { Gates } from '../gameplay/Gates';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IDoorService {
    init(): void;
    destroy(): void;
}

class DoorServiceImpl implements IDoorService {
    private _doors: Partial<Record<CollectableType, Node | null>> = {};
    private _gates: Partial<Record<CollectableType, Gates | null>> = {};
    private _opened: Partial<Record<CollectableType, boolean>> = {};
    private _subscribed: boolean = false;

    init(): void {
        if (!LEVEL_CONFIG) {
            console.warn('[DoorService] LEVEL_CONFIG не задан');
            return;
        }

        this._doors = {
            [CollectableType.Blue]: LEVEL_CONFIG.doorBlue,
            [CollectableType.Red]: LEVEL_CONFIG.doorRed,
            [CollectableType.Green]: LEVEL_CONFIG.doorGreen,
            [CollectableType.Teal]: LEVEL_CONFIG.doorTeal,
        };
        this._gates = {
            [CollectableType.Blue]: this._resolveGates(this._doors[CollectableType.Blue]),
            [CollectableType.Red]: this._resolveGates(this._doors[CollectableType.Red]),
            [CollectableType.Green]: this._resolveGates(this._doors[CollectableType.Green]),
            [CollectableType.Teal]: this._resolveGates(this._doors[CollectableType.Teal]),
        };
        this._opened = {};

        if (!this._subscribed) {
            EventBus.on(GameEvent.TYPE_BLUE_CLEARED, this._onBlueCleared, this);
            EventBus.on(GameEvent.TYPE_RED_CLEARED, this._onRedCleared, this);
            EventBus.on(GameEvent.TYPE_GREEN_CLEARED, this._onGreenCleared, this);
            EventBus.on(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            this._subscribed = true;
        }

        console.log('[DoorService] Инициализирован, подписка на TYPE_*_CLEARED / DOOR_OPENED');
    }

    destroy(): void {
        if (!this._subscribed) return;
        EventBus.off(GameEvent.TYPE_BLUE_CLEARED, this._onBlueCleared, this);
        EventBus.off(GameEvent.TYPE_RED_CLEARED, this._onRedCleared, this);
        EventBus.off(GameEvent.TYPE_GREEN_CLEARED, this._onGreenCleared, this);
        EventBus.off(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
        EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
        TweenService.stopGateSlideDownElastic();
        this._subscribed = false;
        this._doors = {};
        this._gates = {};
        this._opened = {};
    }

    private _onBlueCleared = (): void => {
        this._openDoor(CollectableType.Blue);
    };

    private _onRedCleared = (): void => {
        this._openDoor(CollectableType.Red);
    };

    private _onGreenCleared = (): void => {
        this._openDoor(CollectableType.Green);
    };

    private _onTealCleared = (): void => {
        this._openDoor(CollectableType.Teal);
    };

    /** Сразу отключает коллайдер ворот и шлёт DOOR_OPENED */
    private _openDoor(type: CollectableType): void {
        if (this._opened[type]) return;
        this._opened[type] = true;

        const door = this._doors[type];
        const gates = this._gates[type];
        const typeName = CollectableType[type];

        if (!door || !door.isValid) {
            console.warn(`[DoorService] Тип ${typeName} очищен, но дверь не назначена в LevelConfig`);
        } else if (gates && gates.isValid) {
            // Коллайдер на ноде Gates — сразу; View анимируется и скрывается по onComplete
            gates.node.active = false;
            console.log(`[DoorService] Дверь открыта — тип ${typeName}, node="${door.name}"`);
        } else {
            console.warn(`[DoorService] На двери "${door.name}" нет компонента Gates`);
            door.active = false;
        }

        EventBus.emit(GameEvent.DOOR_OPENED, { type });
    }

    /** DOOR_OPENED → jump↑ / fall↓ View; по окончании View.active = false */
    private _onDoorOpened = (payload: EventPayloadMap[GameEvent.DOOR_OPENED]): void => {
        if (!LEVEL_CONFIG) return;

        const gates = this._gates[payload.type];
        const view = gates?.view;
        if (!view || !view.isValid) {
            console.warn('[DoorService] DOOR_OPENED: Gates.view не назначен');
            return;
        }

        TweenService.gateSlideDownElastic(view, {
            jumpDuration: LEVEL_CONFIG.gateOpenJumpTime,
            jumpHeight: LEVEL_CONFIG.gateOpenJumpHeight,
            fallDuration: LEVEL_CONFIG.gateOpenFallTime,
            fallDistance: LEVEL_CONFIG.gateOpenSlideDistance,
            onComplete: () => {
                if (view.isValid) {
                    view.active = false;
                }
            },
        });
    };

    private _resolveGates(door: Node | null | undefined): Gates | null {
        if (!door || !door.isValid) return null;
        return door.getComponent(Gates) || door.getComponentInChildren(Gates);
    }
}

export let DoorService: IDoorService = new DoorServiceImpl();
