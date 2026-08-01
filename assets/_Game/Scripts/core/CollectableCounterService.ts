/**
 * CollectableCounterService — обратный отсчёт коллектаблов по 4 типам.
 * Стартовые цели берутся из LevelConfig (синхронизируются через CollectableCounterTool).
 * Состояние хранится в GameStore; UI обновляется через REMAINING_CHANGED → RemainingCollectablesPresenter.
 */

import { GameStore } from './GameStore';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { CollectableType } from '../gameplay/Collectable';

export interface ICollectableCounterService {
    readonly remainingCounts: Record<CollectableType, number>;
    readonly isAllCollected: boolean;
    /** Инициализация целевыми количествами из LevelConfig */
    init(): void;
    /** Сколько осталось собрать по типу */
    getRemaining(type: CollectableType): number;
}

class CollectableCounterServiceImpl implements ICollectableCounterService {
    get remainingCounts(): Record<CollectableType, number> {
        return GameStore.remainingCounts;
    }

    get isAllCollected(): boolean {
        const c = GameStore.remainingCounts;
        return (
            c[CollectableType.Blue] <= 0 &&
            c[CollectableType.Red] <= 0 &&
            c[CollectableType.Green] <= 0 &&
            c[CollectableType.Teal] <= 0
        );
    }

    init(): void {
        const targets = LEVEL_CONFIG.getCollectableTargets();
        GameStore.setInitialCollectables(targets);
        console.log(
            `[CollectableCounterService] Цели: Blue=${targets[CollectableType.Blue]}` +
            ` Red=${targets[CollectableType.Red]}` +
            ` Green=${targets[CollectableType.Green]}` +
            ` Teal=${targets[CollectableType.Teal]}`
        );
    }

    getRemaining(type: CollectableType): number {
        return GameStore.remainingCounts[type];
    }
}

export let CollectableCounterService: ICollectableCounterService = new CollectableCounterServiceImpl();
