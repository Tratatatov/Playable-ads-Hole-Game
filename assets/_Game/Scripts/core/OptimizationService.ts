/**
 * OptimizationService — включает/выключает Collectable по дистанции до игрока (дыры).
 * Список нод и радиусы — из OptimizationConfig. Collectable резолвится при init (без GC в update).
 */

import { Node } from 'cc';
import { Collectable } from '../gameplay/Collectable';
import { OptimizationConfig } from '../gameplay/OptimizationConfig';

export interface IOptimizationService {
    init(config: OptimizationConfig | null, player: Node | null): void;
    /** Только обновить ссылки на конфиг/игрока (без evaluate / без сброса suspend). */
    bind(config: OptimizationConfig | null, player: Node | null): boolean;
    update(_dt: number): void;
    /** Разово применить конфиг (distance culling). Снимает manual suspend. */
    applyNow(): { on: number; off: number; total: number };
    /** Включить все несобранные из списка; ставит suspend (update не куллит, пока не applyNow). */
    resetAll(): { on: number; total: number };
    destroy(): void;
}

class OptimizationServiceImpl implements IOptimizationService {
    private _config: OptimizationConfig | null = null;
    private _player: Node | null = null;
    private _framesUntilCheck: number = 0;
    private _actR2: number = 0;
    private _deactR2: number = 0;
    /** После resetAll — не куллить, пока не вызовут applyNow */
    private _suspended: boolean = false;
    /** Runtime-кэш Collectable с нод из конфига (не сериализуется) */
    private readonly _items: Collectable[] = [];

    init(config: OptimizationConfig | null, player: Node | null): void {
        this._config = config && config.isValid ? config : null;
        this._player = player && player.isValid ? player : null;
        this._framesUntilCheck = 0;
        this._suspended = false;
        this._rebuildItems();

        if (!this._config) {
            console.warn('[OptimizationService] OptimizationConfig не задан — culling выкл.');
            return;
        }
        if (!this._player) {
            console.warn('[OptimizationService] player (дыра) не задан — culling выкл.');
            return;
        }

        this._rebuildRadii();
        if (this._config.cullingEnabled) {
            this._evaluateAll();
        }

        console.log(
            `[OptimizationService] init: enabled=${this._config.cullingEnabled}, ` +
            `nodes=${this._config.collectables.length}, items=${this._items.length}, ` +
            `act=${this._config.activationDistance}, ` +
            `deactPad=${this._config.deactivationPadding}, ` +
            `interval=${this._config.updateIntervalFrames}f`
        );
    }

    bind(config: OptimizationConfig | null, player: Node | null): boolean {
        this._config = config && config.isValid ? config : null;
        this._player = player && player.isValid ? player : null;
        this._rebuildItems();
        return !!(this._config && this._player);
    }

    update(_dt: number): void {
        if (this._suspended) return;
        if (!this._config || !this._config.cullingEnabled || !this._player) return;
        if (!this._config.isValid || !this._player.isValid) return;

        this._framesUntilCheck--;
        if (this._framesUntilCheck > 0) return;

        const interval = this._config.updateIntervalFrames;
        this._framesUntilCheck = interval > 0 ? interval : 1;
        this._rebuildRadii();
        this._evaluateAll();
    }

    applyNow(): { on: number; off: number; total: number } {
        if (!this._config || !this._config.isValid) {
            console.warn('[OptimizationService] applyNow: нет OptimizationConfig');
            return { on: 0, off: 0, total: 0 };
        }
        if (!this._player || !this._player.isValid) {
            console.warn('[OptimizationService] applyNow: нет player');
            return { on: 0, off: 0, total: 0 };
        }

        this._suspended = false;
        this._framesUntilCheck = 0;
        this._rebuildRadii();
        const counts = this._evaluateAll();

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
            const c = items[i];
            if (!c || !c.isValid) continue;
            if (c.isCollected) continue;
            total++;
            if (!c.node.active) {
                c.node.active = true;
            }
            on++;
        }

        console.log(
            `[OptimizationService] resetAll: on=${on}/${total} (suspended — update не куллит до applyNow)`
        );
        return { on, total };
    }

    destroy(): void {
        this._config = null;
        this._player = null;
        this._framesUntilCheck = 0;
        this._suspended = false;
        this._items.length = 0;
    }

    private _rebuildItems(): void {
        this._items.length = 0;
        const nodes = this._config?.collectables;
        if (!nodes) return;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node || !node.isValid) continue;
            const c = node.getComponent(Collectable);
            if (c && c.isValid) {
                this._items.push(c);
            }
        }
    }

    private _rebuildRadii(): void {
        const cfg = this._config!;
        const act = Math.max(0.1, cfg.activationDistance);
        const deact = act + Math.max(0, cfg.deactivationPadding);
        this._actR2 = act * act;
        this._deactR2 = deact * deact;
    }

    private _evaluateAll(): { on: number; off: number; total: number } {
        const items = this._items;
        const player = this._player!;
        const px = player.worldPosition.x;
        const pz = player.worldPosition.z;
        const actR2 = this._actR2;
        const deactR2 = this._deactR2;

        let on = 0;
        let off = 0;
        let total = 0;

        for (let i = 0; i < items.length; i++) {
            const c = items[i];
            if (!c || !c.isValid) continue;
            if (c.isCollected) continue;

            total++;
            const node = c.node;
            const wp = node.worldPosition;
            const dx = wp.x - px;
            const dz = wp.z - pz;
            const d2 = dx * dx + dz * dz;

            if (node.active) {
                if (d2 > deactR2) {
                    node.active = false;
                    off++;
                } else {
                    on++;
                }
            } else if (d2 < actR2) {
                node.active = true;
                on++;
            } else {
                off++;
            }
        }

        return { on, off, total };
    }
}

export let OptimizationService: IOptimizationService = new OptimizationServiceImpl();
