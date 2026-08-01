/**
 * BatchingConfig — параметры батчевой активации физики коллектаблов.
 * Назначается в Inspector на GameBootstrap; глобальная ссылка — BATCHING_CONFIG.
 */

import { _decorator, Component, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BatchingConfig')
export class BatchingConfig extends Component {
    @property({
        type: CCInteger,
        tooltip: 'Сколько Collectable (RB+Collider) активировать за один батч. Больше = быстрее, но риск просадки FPS.',
        min: 1,
    })
    public batchSize: number = 10;

    @property({
        type: CCInteger,
        tooltip: 'Интервал между батчами в кадрах. 1 = каждый кадр, 2 = через кадр, 3 = раз в 3 кадра и т.д.',
        min: 1,
    })
    public intervalFrames: number = 2;
}

export let BATCHING_CONFIG: BatchingConfig = null!;

export function setBatchingConfig(cfg: BatchingConfig): void {
    BATCHING_CONFIG = cfg;
}
