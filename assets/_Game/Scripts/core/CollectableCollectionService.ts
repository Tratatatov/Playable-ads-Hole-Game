/**
 * CollectableCollectionService — включает/выключает физику коллекций.
 * Ссылки на CollectableContainer — из LevelConfig.collection*.
 * Старт / следующий цвет — из LevelConfig.collectionProgression.
 * Батчевая активация (Z ↓) — внутри CollectableContainer.
 */

import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { CollectableContainer } from '../gameplay/CollectableContainer';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { BATCHING_CONFIG } from '../gameplay/BatchingConfig';

export interface ICollectableCollectionService {
    init(): void;
    destroy(): void;
    activate(container: CollectableContainer | null): void;
    deactivate(container: CollectableContainer | null): void;
    activateByType(type: CollectableType): void;
    deactivateByType(type: CollectableType): void;
    deactivateAll(): void;
    getContainer(type: CollectableType): CollectableContainer | null;
}

class CollectableCollectionServiceImpl implements ICollectableCollectionService {
    private _byType: Partial<Record<CollectableType, CollectableContainer | null>> = {};
    private _allContainers: CollectableContainer[] = [];
    private _subscribed: boolean = false;

    init(): void {
        console.log('[CollectableCollectionService] === INIT START ===');

        if (!LEVEL_CONFIG) {
            console.warn('[CollectableCollectionService] LEVEL_CONFIG не задан — abort');
            return;
        }

        this._byType = {
            [CollectableType.Blue]: LEVEL_CONFIG.collectionBlue,
            [CollectableType.Red]: LEVEL_CONFIG.collectionRed,
            [CollectableType.Green]: LEVEL_CONFIG.collectionGreen,
            [CollectableType.Teal]: LEVEL_CONFIG.collectionTeal,
        };

        this._logRef('collectionBlue', LEVEL_CONFIG.collectionBlue);
        this._logRef('collectionRed', LEVEL_CONFIG.collectionRed);
        this._logRef('collectionGreen', LEVEL_CONFIG.collectionGreen);
        this._logRef('collectionTeal', LEVEL_CONFIG.collectionTeal);
        const progression = LEVEL_CONFIG.collectionProgression || [];
        console.log(
            `[CollectableCollectionService] progression (${progression.length}): [` +
            progression.map((c) => (c && c.isValid ? c.node.name : '?')).join(' → ') +
            ']'
        );

        this._allContainers = this._collectAllContainers();
        console.log(
            `[CollectableCollectionService] Уникальных контейнеров: ${this._allContainers.length}`
        );

        for (let i = 0; i < this._allContainers.length; i++) {
            const c = this._allContainers[i];
            this._prepareContainer(c);
            console.log(
                `[CollectableCollectionService] prepare "${c.node.name}": ` +
                `RB=${c.rigidBodies.length}, Col=${c.colliders.length}, ` +
                `parent=${c.parentNode ? c.parentNode.name : 'NULL'}`
            );
        }

        this.deactivateAll();

        const initial = LEVEL_CONFIG.getInitialCollection();
        if (initial) {
            this.activate(initial);
            console.log(
                `[CollectableCollectionService] Старт: активна коллекция "${initial.node.name}"`
            );
        } else {
            console.warn(
                '[CollectableCollectionService] collectionProgression пуст / контейнер не найден — все inactive'
            );
        }

        if (!this._subscribed) {
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            this._subscribed = true;
            console.log('[CollectableCollectionService] Подписка на DOOR_OPENED');
        }

        if (BATCHING_CONFIG) {
            console.log(
                `[CollectableCollectionService] BatchingConfig: ` +
                `batchSize=${BATCHING_CONFIG.batchSize}, intervalFrames=${BATCHING_CONFIG.intervalFrames}`
            );
        } else {
            console.warn(
                '[CollectableCollectionService] BatchingConfig не задан — defaults 10 / 2f'
            );
        }

        console.log('[CollectableCollectionService] === INIT DONE ===');
    }

    destroy(): void {
        if (this._subscribed) {
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            this._subscribed = false;
        }
        this._byType = {};
        this._allContainers = [];
        console.log('[CollectableCollectionService] destroy()');
    }

    activate(container: CollectableContainer | null): void {
        if (!container) {
            console.warn('[CollectableCollectionService] ACTIVATE: container=null — skip');
            return;
        }
        if (!container.isValid) {
            console.warn('[CollectableCollectionService] ACTIVATE: container invalid — skip');
            return;
        }
        const wakePct = LEVEL_CONFIG ? LEVEL_CONFIG.wakeUpPercent : 33;
        container.activate(wakePct);
    }

    deactivate(container: CollectableContainer | null): void {
        if (!container) {
            console.warn('[CollectableCollectionService] DEACTIVATE: container=null — skip');
            return;
        }
        if (!container.isValid) {
            console.warn('[CollectableCollectionService] DEACTIVATE: container invalid — skip');
            return;
        }
        container.deactivate();
    }

    activateByType(type: CollectableType): void {
        this.activate(this.getContainer(type));
    }

    deactivateByType(type: CollectableType): void {
        this.deactivate(this.getContainer(type));
    }

    deactivateAll(): void {
        console.log(
            `[CollectableCollectionService] deactivateAll (${this._allContainers.length} шт.)`
        );
        for (let i = 0; i < this._allContainers.length; i++) {
            this.deactivate(this._allContainers[i]);
        }
    }

    getContainer(type: CollectableType): CollectableContainer | null {
        return this._byType[type] ?? null;
    }

    private _collectAllContainers(): CollectableContainer[] {
        const result: CollectableContainer[] = [];
        const seen = new Set<CollectableContainer>();

        const push = (c: CollectableContainer | null | undefined): void => {
            if (!c || !c.isValid || seen.has(c)) return;
            seen.add(c);
            result.push(c);
        };

        push(LEVEL_CONFIG.collectionBlue);
        push(LEVEL_CONFIG.collectionRed);
        push(LEVEL_CONFIG.collectionGreen);
        push(LEVEL_CONFIG.collectionTeal);

        return result;
    }

    private _prepareContainer(container: CollectableContainer | null): void {
        if (!container || !container.isValid) return;

        container.ensurePhysicsCache();
        container.applyRigidBodyType(container.rigidBodyTypeOnPlay);
    }

    private _onDoorOpened = (payload: { type: CollectableType }): void => {
        const typeName = CollectableType[payload.type];
        console.log(
            `[CollectableCollectionService] <<< DOOR_OPENED type=${typeName} (${payload.type})`
        );

        if (!LEVEL_CONFIG) {
            console.warn('[CollectableCollectionService] DOOR_OPENED: LEVEL_CONFIG=null');
            return;
        }

        const container = LEVEL_CONFIG.getActivateAfter(payload.type);
        this._logRef(`next after ${typeName}`, container);

        if (!container || !container.isValid) {
            console.warn(
                `[CollectableCollectionService] После ${typeName} в progression нет следующего — ничего не активируем`
            );
            return;
        }

        this.activate(container);
        console.log(
            `[CollectableCollectionService] >>> next after ${typeName} → "${container.node.name}" started (batched)`
        );
    };

    private _logRef(label: string, c: CollectableContainer | null | undefined): void {
        if (!c) {
            console.log(`[CollectableCollectionService] ${label}: null`);
            return;
        }
        if (!c.isValid) {
            console.log(`[CollectableCollectionService] ${label}: INVALID`);
            return;
        }
        console.log(
            `[CollectableCollectionService] ${label}: "${c.node.name}" ` +
            `(uuid=${c.node.uuid}, RB=${c.rigidBodies?.length ?? 0}, Col=${c.colliders?.length ?? 0})`
        );
    }
}

export let CollectableCollectionService: ICollectableCollectionService =
    new CollectableCollectionServiceImpl();
