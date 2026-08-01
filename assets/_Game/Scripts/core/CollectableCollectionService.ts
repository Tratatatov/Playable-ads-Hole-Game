/**
 * CollectableCollectionService — включает/выключает физику коллекций по цвету.
 * Ссылки на CollectableCounterTool берутся из LevelConfig.
 * При старте: все inactive, кроме initialActiveCollection.
 * При DOOR_OPENED: активирует следующую коллекцию (Blue→Red→Green→Teal).
 */

import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { CollectableCounterTool } from '../tools/CollectableCounterTool';

export interface ICollectableCollectionService {
    init(): void;
    destroy(): void;
    activate(tool: CollectableCounterTool | null): void;
    deactivate(tool: CollectableCounterTool | null): void;
    activateByType(type: CollectableType): void;
    deactivateByType(type: CollectableType): void;
    deactivateAll(): void;
    getTool(type: CollectableType): CollectableCounterTool | null;
}

const NEXT_TYPE: Partial<Record<CollectableType, CollectableType>> = {
    [CollectableType.Blue]: CollectableType.Red,
    [CollectableType.Red]: CollectableType.Green,
    [CollectableType.Green]: CollectableType.Teal,
};

class CollectableCollectionServiceImpl implements ICollectableCollectionService {
    private _byType: Partial<Record<CollectableType, CollectableCounterTool | null>> = {};
    private _subscribed: boolean = false;

    init(): void {
        if (!LEVEL_CONFIG) {
            console.warn('[CollectableCollectionService] LEVEL_CONFIG не задан');
            return;
        }

        this._byType = {
            [CollectableType.Blue]: LEVEL_CONFIG.collectionBlue,
            [CollectableType.Red]: LEVEL_CONFIG.collectionRed,
            [CollectableType.Green]: LEVEL_CONFIG.collectionGreen,
            [CollectableType.Teal]: LEVEL_CONFIG.collectionTeal,
        };

        // Все выключаем, затем включаем стартовую коллекцию
        this.deactivateAll();

        const initial = LEVEL_CONFIG.initialActiveCollection;
        if (initial) {
            this.activate(initial);
            console.log(
                `[CollectableCollectionService] Старт: активна коллекция "${initial.node.name}"`
            );
        } else {
            console.warn(
                '[CollectableCollectionService] initialActiveCollection не назначен — все коллекции inactive'
            );
        }

        if (!this._subscribed) {
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            this._subscribed = true;
        }
    }

    destroy(): void {
        if (this._subscribed) {
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            this._subscribed = false;
        }
        this._byType = {};
    }

    activate(tool: CollectableCounterTool | null): void {
        if (!tool || !tool.isValid) return;
        tool.setPhysicsActive(true);
    }

    deactivate(tool: CollectableCounterTool | null): void {
        if (!tool || !tool.isValid) return;
        tool.setPhysicsActive(false);
    }

    activateByType(type: CollectableType): void {
        this.activate(this.getTool(type));
    }

    deactivateByType(type: CollectableType): void {
        this.deactivate(this.getTool(type));
    }

    deactivateAll(): void {
        const types = [
            CollectableType.Blue,
            CollectableType.Red,
            CollectableType.Green,
            CollectableType.Teal,
        ];
        for (let i = 0; i < types.length; i++) {
            this.deactivate(this._byType[types[i]] ?? null);
        }
    }

    getTool(type: CollectableType): CollectableCounterTool | null {
        return this._byType[type] ?? null;
    }

    /** После открытия двери активируем следующую цветовую коллекцию */
    private _onDoorOpened = (payload: { type: CollectableType }): void => {
        const next = NEXT_TYPE[payload.type];
        if (next === undefined) return;

        const tool = this.getTool(next);
        if (!tool) {
            console.warn(
                `[CollectableCollectionService] Дверь ${CollectableType[payload.type]} открыта, ` +
                `но коллекция ${CollectableType[next]} не назначена в LevelConfig`
            );
            return;
        }

        this.activate(tool);
        console.log(
            `[CollectableCollectionService] Активирована коллекция ${CollectableType[next]} ` +
            `("${tool.node.name}") после двери ${CollectableType[payload.type]}`
        );
    };
}

export let CollectableCollectionService: ICollectableCollectionService =
    new CollectableCollectionServiceImpl();
