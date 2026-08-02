/**
 * CollectablesCollectorTool — editor-only: находит все Collectable и пишет их node в OptimizationConfig.
 * Runtime уничтожается. Другие классы НЕ импортируют этот Tool.
 */

import { _decorator, Component, Node, director } from 'cc';
import { EDITOR } from 'cc/env';
import { Collectable } from '../gameplay/Collectable';
import { OptimizationConfig } from '../gameplay/OptimizationConfig';

const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('CollectablesCollectorTool')
@executeInEditMode
@menu('Tools/Collectables Collector')
export class CollectablesCollectorTool extends Component {
    @property({
        type: OptimizationConfig,
        tooltip: 'Куда записать список. Если пусто — OptimizationConfig на этом же узле.',
    })
    public optimizationConfig: OptimizationConfig = null!;

    @property({
        tooltip: 'Нажмите: найти все Collectable в сцене → OptimizationConfig.collectables (Node)',
    })
    public get fetchButton(): boolean {
        return false;
    }
    public set fetchButton(v: boolean) {
        if (v && EDITOR) {
            this.fetchCollectables();
        }
    }

    onLoad(): void {
        if (!EDITOR) {
            this.destroy();
            return;
        }
    }

    private _resolveConfig(): OptimizationConfig | null {
        if (this.optimizationConfig && this.optimizationConfig.isValid) {
            return this.optimizationConfig;
        }
        const local = this.getComponent(OptimizationConfig);
        if (local) {
            this.optimizationConfig = local;
            return local;
        }
        console.warn(
            '[CollectablesCollectorTool] Не найден OptimizationConfig ' +
            '(свойство optimizationConfig или на этом узле)'
        );
        return null;
    }

    public fetchCollectables(): void {
        const cfg = this._resolveConfig();
        if (!cfg) return;

        const scene = director.getScene();
        if (!scene) {
            console.warn('[CollectablesCollectorTool] Нет активной сцены');
            return;
        }

        const found = scene.getComponentsInChildren(Collectable);
        const list: Node[] = [];
        for (let i = 0; i < found.length; i++) {
            const c = found[i];
            if (c && c.isValid && c.node && c.node.isValid) {
                list.push(c.node);
            }
        }

        cfg.collectables = list;

        console.log(
            `[CollectablesCollectorTool] Записано Node=${list.length} (из Collectable) → ` +
            `OptimizationConfig на "${cfg.node.name}"`
        );
    }
}
