/**
 * CollectablePool — объектный пул для коллектаблов.
 * RULES §5.1: Объекты создаются из Prefab, а не процедурно.
 * RULES §2.2: instantiate() только в prewarm (BootState), не в геймплее.
 *
 * Prefab должен содержать:
 *   - Collectable компонент
 *   - SphereCollider (isTrigger = true)
 *   - RigidBody (Kinematic)
 *   - MeshRenderer с любым material (цвет назначается из Collectable.typeIndex)
 */

import { _decorator, Component, Node, Vec3, Prefab, instantiate, Texture2D } from 'cc';
import { Collectable, CollectableType } from './Collectable';
import { LEVEL_CONFIG } from './LevelConfig';

const { ccclass, property } = _decorator;

@ccclass('CollectablePool')
export class CollectablePool extends Component {
    /** Prefab коллектабла (RULES §5.1 — обязательно из Prefab, не процедурно) */
    @property(Prefab)
    collectablePrefab: Prefab = null!;

    private readonly _pool:   Collectable[] = [];
    private readonly _active: Set<Collectable> = new Set();
    private _textures: Texture2D[] = [];

    /** Задать текстуры для разных типов коллектаблов */
    setTextures(textures: Texture2D[]): void {
        this._textures = textures;
    }

    /**
     * Prewarm — создать все объекты заранее в BootState.
     * RULES §2.2: единственное место, где разрешён instantiate().
     */
    prewarm(): void {
        if (!this.collectablePrefab) {
            console.error('[CollectablePool] collectablePrefab не назначен! Проверь Inspector.');
            return;
        }
        const count = LEVEL_CONFIG.collectableCount + LEVEL_CONFIG.poolWarmupExtra;
        for (let i = 0; i < count; i++) {
            const node = instantiate(this.collectablePrefab);
            node.parent = this.node;
            node.active = false;
            const comp = node.getComponent(Collectable);
            if (!comp) {
                console.error('[CollectablePool] Prefab не содержит компонент Collectable!');
                node.destroy();
                continue;
            }
            this._pool.push(comp);
        }
    }

    /**
     * Взять объект из пула и разместить на позиции.
     * RULES §2.2: нет instantiate() — только показываем уже созданный объект.
     */
    acquire(position: Vec3, type: CollectableType): Collectable | null {
        const comp = this._pool.pop();
        if (!comp) {
            console.warn('[CollectablePool] Пул пуст! Увеличь poolWarmupExtra в LevelConfig.');
            return null;
        }
        comp.type  = type;
        comp.scoreValue = LEVEL_CONFIG.collectableScore;
        comp.node.setWorldPosition(position);
        comp.node.setScale(1, 1, 1);
        
        // Назначаем текстуру в зависимости от типа
        if (this._textures.length > 0) {
            comp.setTexture(this._textures[type % this._textures.length]);
        }
        comp.node.active = true;
        comp.onCollected = (c: Collectable) => this.release(c);
        this._active.add(comp);
        return comp;
    }

    /**
     * Вернуть объект в пул (скрыть, не destroy).
     * RULES §2.2: запрещено destroy() во время геймплея.
     */
    release(comp: Collectable): void {
        if (!this._active.has(comp)) return;
        this._active.delete(comp);
        comp.node.active = false;
        comp.onCollected = null;
        this._pool.push(comp);
    }

    /** Вернуть все активные объекты в пул (при рестарте / переходе в EndCard) */
    releaseAll(): void {
        // Итерируем копию, т.к. release модифицирует _active
        Array.from(this._active).forEach(comp => this.release(comp));
    }

    get activeItems(): ReadonlySet<Collectable> { return this._active; }
}
