/**
 * OptimizationService — дистанционный soft-cull Collectable.
 * Куллит только MeshRenderer (физика — у CollectableContainer, без гонки).
 * На CameraIntro: resetAll (все видны, suspend); после пролёта — applyNow.
 * RULES §2.1: нет аллокаций в update / evaluate.
 */

import { Node, Vec3, MeshRenderer } from 'cc';
import { Collectable } from '../gameplay/Collectable';
import { OptimizationConfig } from '../gameplay/OptimizationConfig';

/** Runtime-запись (не сериализуется) */
interface CullItem {
    collectable: Collectable;
    x: number;
    z: number;
    culled: boolean;
    renderers: MeshRenderer[];
}

export interface IOptimizationService {
    /** origin — нода, от которой считается дистанция (обычно mainCamera). */
    init(config: OptimizationConfig | null, origin: Node | null): void;
    /** Только обновить ссылки на конфиг/origin (без evaluate / без сброса suspend). */
    bind(config: OptimizationConfig | null, origin: Node | null): boolean;
    update(_dt: number): void;
    /** Разово применить конфиг (distance culling). Снимает manual suspend. */
    applyNow(): { on: number; off: number; total: number };
    /** Включить все несобранные; suspend до applyNow (для CameraIntro). */
    resetAll(): { on: number; total: number };
    /**
     * Сразу показать меши всех Collectable под root (зона новой коллекции).
     * Не снимает suspend; не трогает физику.
     */
    uncullUnder(root: Node | null): number;
    /** Текущая точка отсчёта XZ (камера) — для сортировки батча активации. */
    copyOriginXZ(out: { x: number; z: number }): boolean;
    destroy(): void;
}

class OptimizationServiceImpl implements IOptimizationService {
    private _config: OptimizationConfig | null = null;
    private _origin: Node | null = null;
    private _framesUntilCheck: number = 0;
    private _actR2: number = 0;
    private _deactR2: number = 0;
    /** После resetAll — не куллить, пока не вызовут applyNow */
    private _suspended: boolean = false;
    private readonly _items: CullItem[] = [];
    private readonly _originPos: Vec3 = new Vec3();
    private readonly _counts: { on: number; off: number; total: number } = { on: 0, off: 0, total: 0 };
    private _scanIndex: number = 0;

    init(config: OptimizationConfig | null, origin: Node | null): void {
        this._config = config && config.isValid ? config : null;
        this._origin = origin && origin.isValid ? origin : null;
        this._framesUntilCheck = 0;
        this._scanIndex = 0;
        this._rebuildItems();

        if (!this._config) {
            console.warn('[OptimizationService] OptimizationConfig не задан — culling выкл.');
            return;
        }
        if (!this._origin) {
            console.warn('[OptimizationService] origin (mainCamera) не задан — culling выкл.');
            return;
        }

        this._rebuildRadii();

        // CameraIntro: все меши видны, culling стартует после applyNow
        if (this._config.cullingEnabled) {
            this.resetAll();
        }

        console.log(
            `[OptimizationService] init: enabled=${this._config.cullingEnabled}, ` +
            `items=${this._items.length}, suspended=${this._suspended}, ` +
            `act=${this._config.activationDistance}, ` +
            `deactPad=${this._config.deactivationPadding}, ` +
            `interval=${this._config.updateIntervalFrames}f, ` +
            `maxToggles=${this._config.maxTogglesPerPass}`
        );
    }

    bind(config: OptimizationConfig | null, origin: Node | null): boolean {
        this._config = config && config.isValid ? config : null;
        this._origin = origin && origin.isValid ? origin : null;
        this._rebuildItems();
        return !!(this._config && this._origin);
    }

    update(_dt: number): void {
        if (this._suspended) return;
        if (!this._config || !this._config.cullingEnabled || !this._origin) return;
        if (!this._config.isValid || !this._origin.isValid) return;

        this._framesUntilCheck--;
        if (this._framesUntilCheck > 0) return;

        const interval = this._config.updateIntervalFrames;
        this._framesUntilCheck = interval > 0 ? interval : 1;
        this._evaluateAll(false);
    }

    applyNow(): { on: number; off: number; total: number } {
        if (!this._config || !this._config.isValid) {
            console.warn('[OptimizationService] applyNow: нет OptimizationConfig');
            return { on: 0, off: 0, total: 0 };
        }
        if (!this._origin || !this._origin.isValid) {
            console.warn('[OptimizationService] applyNow: нет origin (mainCamera)');
            return { on: 0, off: 0, total: 0 };
        }

        this._suspended = false;
        this._framesUntilCheck = 0;
        this._rebuildRadii();
        const counts = this._evaluateAll(true);

        console.log(
            `[OptimizationService] applyNow: on=${counts.on} off=${counts.off} ` +
            `total=${counts.total} act=${this._config.activationDistance} ` +
            `deactPad=${this._config.deactivationPadding}`
        );
        return counts;
    }

    resetAll(): { on: number; total: number } {
        if (!this._config || !this._config.isValid) {
            console.warn('[OptimizationService] resetAll: нет OptimizationConfig');
            return { on: 0, total: 0 };
        }

        this._suspended = true;
        this._framesUntilCheck = 0;

        const items = this._items;
        let on = 0;
        let total = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = item.collectable;
            if (!c || !c.isValid) continue;
            if (c.isCollected) continue;
            total++;
            this._setCulled(item, false);
            on++;
        }

        console.log(
            `[OptimizationService] resetAll: on=${on}/${total} (suspended — update не куллит до applyNow)`
        );
        return { on, total };
    }

    uncullUnder(root: Node | null): number {
        if (!root || !root.isValid) return 0;

        const items = this._items;
        let n = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = item.collectable;
            if (!c || !c.isValid || c.isCollected) continue;
            if (!this._isUnder(c.node, root)) continue;
            this._setCulled(item, false);
            n++;
        }

        if (n > 0) {
            console.log(`[OptimizationService] uncullUnder "${root.name}": ${n}`);
        }
        return n;
    }

    copyOriginXZ(out: { x: number; z: number }): boolean {
        if (!this._origin || !this._origin.isValid) return false;
        this._origin.getWorldPosition(this._originPos);
        out.x = this._originPos.x;
        out.z = this._originPos.z;
        return true;
    }

    destroy(): void {
        this._config = null;
        this._origin = null;
        this._framesUntilCheck = 0;
        this._suspended = false;
        this._scanIndex = 0;
        this._items.length = 0;
    }

    private _isUnder(node: Node, root: Node): boolean {
        let cur: Node | null = node;
        while (cur) {
            if (cur === root) return true;
            cur = cur.parent;
        }
        return false;
    }

    private _rebuildItems(): void {
        this._items.length = 0;
        const nodes = this._config?.collectables;
        if (!nodes) return;

        const tmpPos = this._originPos;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node || !node.isValid) continue;
            const c = node.getComponent(Collectable);
            if (!c || !c.isValid) continue;

            const renderers = node.getComponentsInChildren(MeshRenderer);
            node.getWorldPosition(tmpPos);
            this._items.push({
                collectable: c,
                x: tmpPos.x,
                z: tmpPos.z,
                culled: false,
                renderers,
            });
        }
    }

    private _rebuildRadii(): void {
        const cfg = this._config!;
        const act = Math.max(0.1, cfg.activationDistance);
        const deact = act + Math.max(0, cfg.deactivationPadding);
        this._actR2 = act * act;
        this._deactR2 = deact * deact;
    }

    /**
     * @param unlimited true = applyNow/init: без лимита toggles за проход
     */
    private _evaluateAll(unlimited: boolean): { on: number; off: number; total: number } {
        const items = this._items;
        const origin = this._origin!;
        origin.getWorldPosition(this._originPos);
        const ox = this._originPos.x;
        const oz = this._originPos.z;
        const actR2 = this._actR2;
        const deactR2 = this._deactR2;
        const n = items.length;
        const maxToggles = unlimited
            ? n
            : Math.max(1, this._config!.maxTogglesPerPass | 0);

        let on = 0;
        let off = 0;
        let total = 0;
        let toggles = 0;
        const start = n > 0 ? this._scanIndex % n : 0;

        for (let k = 0; k < n; k++) {
            const i = (start + k) % n;
            const item = items[i];
            const c = item.collectable;
            if (!c || !c.isValid) continue;
            if (c.isCollected) continue;

            total++;
            const dx = item.x - ox;
            const dz = item.z - oz;
            const d2 = dx * dx + dz * dz;

            if (!item.culled) {
                if (d2 > deactR2) {
                    if (toggles < maxToggles) {
                        this._setCulled(item, true);
                        toggles++;
                        off++;
                    } else {
                        on++;
                    }
                } else {
                    on++;
                }
            } else if (d2 < actR2) {
                if (toggles < maxToggles) {
                    this._setCulled(item, false);
                    toggles++;
                    on++;
                } else {
                    off++;
                }
            } else {
                off++;
            }
        }

        if (n > 0) {
            this._scanIndex = (start + Math.max(1, toggles)) % n;
        }

        this._counts.on = on;
        this._counts.off = off;
        this._counts.total = total;
        return this._counts;
    }

    private _setCulled(item: CullItem, culled: boolean): void {
        if (item.culled === culled) return;
        item.culled = culled;

        const renderers = item.renderers;
        for (let i = 0; i < renderers.length; i++) {
            const mr = renderers[i];
            if (mr && mr.isValid) {
                mr.enabled = !culled;
            }
        }
    }
}

export let OptimizationService: IOptimizationService = new OptimizationServiceImpl();
