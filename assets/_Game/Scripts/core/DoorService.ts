/**
 * DoorService — открывает двери при полном сборе типа коллектаблов.
 * Подписывается на TYPE_*_CLEARED; ссылки на двери — из LevelConfig.
 * При открытии дверь полностью отключается (node.active = false).
 */

import { Node } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IDoorService {
    init(): void;
    destroy(): void;
}

class DoorServiceImpl implements IDoorService {
    private _doors: Partial<Record<CollectableType, Node | null>> = {};
    private _opened: Partial<Record<CollectableType, boolean>> = {};
    private _subscribed: boolean = false;

    init(): void {
        if (!LEVEL_CONFIG) {
            console.warn('[DoorService] LEVEL_CONFIG не задан');
            return;
        }

        this._doors = {
            [CollectableType.Blue]:      LEVEL_CONFIG.doorBlue,
            [CollectableType.Red]:       LEVEL_CONFIG.doorRed,
            [CollectableType.Green]:     LEVEL_CONFIG.doorGreen,
            [CollectableType.Teal]: LEVEL_CONFIG.doorTeal,
        };
        this._opened = {};

        if (!this._subscribed) {
            EventBus.on(GameEvent.TYPE_BLUE_CLEARED,      this._onBlueCleared,      this);
            EventBus.on(GameEvent.TYPE_RED_CLEARED,       this._onRedCleared,       this);
            EventBus.on(GameEvent.TYPE_GREEN_CLEARED,     this._onGreenCleared,     this);
            EventBus.on(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
            this._subscribed = true;
        }

        console.log('[DoorService] Инициализирован, подписка на TYPE_*_CLEARED');
    }

    destroy(): void {
        if (!this._subscribed) return;
        EventBus.off(GameEvent.TYPE_BLUE_CLEARED,      this._onBlueCleared,      this);
        EventBus.off(GameEvent.TYPE_RED_CLEARED,       this._onRedCleared,       this);
        EventBus.off(GameEvent.TYPE_GREEN_CLEARED,     this._onGreenCleared,     this);
        EventBus.off(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
        this._subscribed = false;
        this._doors = {};
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

    /** Отключает дверь целиком и шлёт DOOR_OPENED */
    private _openDoor(type: CollectableType): void {
        if (this._opened[type]) return;
        this._opened[type] = true;

        const door = this._doors[type];
        const typeName = CollectableType[type];

        if (!door || !door.isValid) {
            console.warn(`[DoorService] Тип ${typeName} очищен, но дверь не назначена в LevelConfig`);
        } else {
            door.active = false;
            console.log(`[DoorService] Дверь открыта (disabled) — тип ${typeName}, node="${door.name}"`);
        }

        EventBus.emit(GameEvent.DOOR_OPENED, { type });
    }
}

export let DoorService: IDoorService = new DoorServiceImpl();
