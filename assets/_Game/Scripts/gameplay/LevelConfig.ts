/**
 * LevelConfig — класс конфигурации уровня (наследник Component).
 * Позволяет настраивать все игровые параметры из Inspector.
 * RULES §5.2: Запрещено хардкодить игровые параметры внутри компонентов.
 */

import { _decorator, Component, CCInteger, CCFloat, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HoleSizeThreshold')
export class HoleSizeThreshold {
    @property({ type: CCInteger, tooltip: 'При каком счёте срабатывает' })
    scoreThreshold: number = 10;

    @property({ type: CCFloat, tooltip: 'Дополнительный масштаб (additive к базе 1.0)' })
    sizeIncrease: number = 0.25;
}

@ccclass('LevelConfig')
export class LevelConfig extends Component {
    // ── Дыра ──────────────────────────────────────────────────────────
    @property({ group: { name: 'Hole Settings', id: '1' } })
    holeDefaultSpeed: number = 6;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Коэффициент прироста скорости за каждый +1 scale' })
    speedScaleMult: number = 0.4;

    @property({ group: { name: 'Hole Settings', id: '1' } })
    holeMinSpeed: number = 3;

    @property({ group: { name: 'Hole Settings', id: '1' } })
    holeMaxSpeed: number = 18;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Прирост масштаба дыры за каждый собранный предмет' })
    holeGrowthPerItem: number = 0.05;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость Lerp-сглаживания масштаба дыры' })
    holeScaleLerpSpeed: number = 10;

    @property({ group: { name: 'Hole Settings', id: '1' } })
    holeSizeTweenTime: number = 0.35;

    @property({ type: [HoleSizeThreshold], group: { name: 'Hole Settings', id: '1' } })
    holeSizeThresholds: HoleSizeThreshold[] = [];

    // ── Уровень ────────────────────────────────────────────────────────
    @property({ group: { name: 'Level Settings', id: '2' }, tooltip: 'Длительность уровня (сек)' })
    totalTime: number = 60;

    // ── Коллектаблы ────────────────────────────────────────────────────
    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Кол-во предметов на сцене одновременно' })
    collectableCount: number = 25;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Очки за каждый предмет' })
    collectableScore: number = 5;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Половина стороны арены (world units)' })
    arenaHalfSize: number = 9;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Min Y позиции спавна' })
    collectableMinY: number = 0.15;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Max Y позиции спавна' })
    collectableMaxY: number = 0.15;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Доп. объектов в пуле сверх collectableCount' })
    poolWarmupExtra: number = 5;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Время анимации подпрыгивания перед падением' })
    jumpAnimTime: number = 0.15;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Высота подпрыгивания' })
    jumpAnimHeight: number = 1.0;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Время анимации падения в дыру' })
    fallAnimTime: number = 0.2;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Целевой Y при падении' })
    fallAnimDepth: number = -1.5;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Целевой масштаб при падении' })
    fallAnimScale: number = 0.2;

    // ── Controls ───────────────────────────────────────────────────────
    @property({ group: { name: 'Controls', id: '4' }, tooltip: 'Чувствительность свайпа' })
    inputSensitivity: number = 100;

    // ── UI Settings ────────────────────────────────────────────────────
    @property({ group: { name: 'UI Settings', id: '5' } })
    timerWarningThreshold: number = 10;

    @property({ group: { name: 'UI Settings', id: '5' } })
    scorePunchScale: number = 1.3;

    @property({ group: { name: 'UI Settings', id: '5' } })
    scorePunchTime: number = 0.1;

    @property({ group: { name: 'UI Settings', id: '5' } })
    tutorialFingerRange: number = 30;

    @property({ group: { name: 'UI Settings', id: '5' } })
    tutorialAnimTime: number = 0.7;

    @property({ group: { name: 'UI Settings', id: '5' } })
    endCardPopScale: number = 0.7;

    @property({ group: { name: 'UI Settings', id: '5' } })
    endCardAnimTime: number = 0.35;

    // ── Камера ─────────────────────────────────────────────────────────
    @property({ group: { name: 'Camera Settings', id: '6' } })
    cameraLerpSpeed: number = 5;
}

// Глобальная ссылка для доступа из скриптов без привязки
export let LEVEL_CONFIG: LevelConfig = null!;

export function setLevelConfig(cfg: LevelConfig): void {
    LEVEL_CONFIG = cfg;
}
