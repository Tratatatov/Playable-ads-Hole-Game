/**
 * LevelConfig — класс конфигурации уровня (наследник Component).
 * Позволяет настраивать все игровые параметры из Inspector.
 * RULES §5.2: Запрещено хардкодить игровые параметры внутри компонентов.
 */

import { _decorator, Component, CCInteger, CCFloat, Node } from 'cc';
import { CollectableType } from './Collectable';
import { CollectableCounterTool } from '../tools/CollectableCounterTool';
const { ccclass, property } = _decorator;

@ccclass('HoleSizeThreshold')
export class HoleSizeThreshold {
    @property({ type: CCInteger, tooltip: 'Сколько очков нужно набрать для этого уровня размера дыры' })
    scoreThreshold: number = 10;

    @property({ type: CCFloat, tooltip: 'Целевой масштаб = 1.0 + sizeIncrease (напр. 0.25 → scale 1.25). HoleController догоняет через Lerp.' })
    sizeIncrease: number = 0.25;
}

@ccclass('LevelConfig')
export class LevelConfig extends Component {
    // ── Дыра ──────────────────────────────────────────────────────────
    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость дыры при минимальном свайпе (на границе deadzone). Плавно растёт к max вместе с % свайпа.' })
    holeMinSpeed: number = 3;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Максимальная скорость дыры. Достигается при свайпе = inputMaxSwipePct.' })
    holeMaxSpeed: number = 18;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость Lerp-сглаживания масштаба дыры (выше = быстрее догоняет целевой scale)' })
    holeScaleLerpSpeed: number = 10;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость сглаживания скорости дыры (выше = резче смена направления, ниже = плавнее)' })
    velocityLerpSpeed: number = 18;

    @property({ type: [HoleSizeThreshold], group: { name: 'Hole Settings', id: '1' }, tooltip: 'Пороги роста дыры скачками: при score ≥ scoreThreshold масштаб → 1 + sizeIncrease' })
    holeSizeThresholds: HoleSizeThreshold[] = [];

    // ── Уровень ────────────────────────────────────────────────────────
    @property({ group: { name: 'Level Settings', id: '2' }, tooltip: 'Начальное время обратного таймера (секунды). На UI отображается как M:SS, например 90 → "1:30"' })
    totalTime: number = 60;

    // ── Коллектаблы ────────────────────────────────────────────────────
    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Сколько Blue нужно собрать (обратный отсчёт)' })
    collectableTargetBlue: number = 0;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Сколько Red нужно собрать (обратный отсчёт)' })
    collectableTargetRed: number = 0;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Сколько Green нужно собрать (обратный отсчёт)' })
    collectableTargetGreen: number = 0;

    @property({ group: { name: 'Collectables', id: '3' }, tooltip: 'Сколько Teal нужно собрать (обратный отсчёт)' })
    collectableTargetTeal: number = 0;

    /** Целевые количества по типам для CollectableCounterService */
    public getCollectableTargets(): Record<CollectableType, number> {
        return {
            [CollectableType.Blue]: this.collectableTargetBlue,
            [CollectableType.Red]: this.collectableTargetRed,
            [CollectableType.Green]: this.collectableTargetGreen,
            [CollectableType.Teal]: this.collectableTargetTeal,
        };
    }

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

    // ── Controls (доли короткой стороны экрана, 0..1) ─────────────────
    @property({ group: { name: 'Controls', id: '4' }, tooltip: 'Смещение пальца (доля экрана) для максимальной скорости. 0.2 = 20% короткой стороны.' })
    inputMaxSwipePct: number = 0.2;

    @property({ group: { name: 'Controls', id: '4' }, tooltip: 'Смещение пальца (доля экрана) для минимальной скорости. Ниже — стоп. Между min и max — lerp скорости.' })
    inputMinSwipePct: number = 0.02;

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

    // ── Камера ─────────────────────────────────────────────────────────
    @property({ group: { name: 'Camera Settings', id: '6' } })
    cameraLerpSpeed: number = 5;

    // ── Коллекции (физика по цветам) ───────────────────────────────────
    @property({ type: CollectableCounterTool, group: { name: 'Collections', id: '7' }, tooltip: 'CollectableCounterTool для Blue' })
    collectionBlue: CollectableCounterTool = null!;

    @property({ type: CollectableCounterTool, group: { name: 'Collections', id: '7' }, tooltip: 'CollectableCounterTool для Red' })
    collectionRed: CollectableCounterTool = null!;

    @property({ type: CollectableCounterTool, group: { name: 'Collections', id: '7' }, tooltip: 'CollectableCounterTool для Green' })
    collectionGreen: CollectableCounterTool = null!;

    @property({ type: CollectableCounterTool, group: { name: 'Collections', id: '7' }, tooltip: 'CollectableCounterTool для Teal' })
    collectionTeal: CollectableCounterTool = null!;

    @property({
        type: CollectableCounterTool,
        group: { name: 'Collections', id: '7' },
        tooltip: 'Коллекция, которая активна на старте (физика ON). Остальные стартуют inactive.',
    })
    initialActiveCollection: CollectableCounterTool = null!;

    // ── Двери (открываются при полном сборе типа) ──────────────────────
    @property({ type: Node, group: { name: 'Doors', id: '8' }, tooltip: 'Дверь для Blue (TYPE_BLUE_CLEARED)' })
    doorBlue: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '8' }, tooltip: 'Дверь для Red (TYPE_RED_CLEARED)' })
    doorRed: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '8' }, tooltip: 'Дверь для Green (TYPE_GREEN_CLEARED)' })
    doorGreen: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '8' }, tooltip: 'Дверь для Teal (TYPE_TEAL_CLEARED)' })
    doorTeal: Node = null!;
}

// Глобальная ссылка для доступа из скриптов без привязки
export let LEVEL_CONFIG: LevelConfig = null!;

export function setLevelConfig(cfg: LevelConfig): void {
    LEVEL_CONFIG = cfg;
}
