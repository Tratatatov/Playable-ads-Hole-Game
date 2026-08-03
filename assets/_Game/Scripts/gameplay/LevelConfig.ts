/**
 * LevelConfig — класс конфигурации уровня (наследник Component).
 * Позволяет настраивать все игровые параметры из Inspector.
 * RULES §5.2: Запрещено хардкодить игровые параметры внутри компонентов.
 */

import { _decorator, Component, CCInteger, CCFloat, Node, ParticleSystem } from 'cc';
import { CollectableType } from './Collectable';
import { CollectableContainer } from './CollectableContainer';
const { ccclass, property } = _decorator;

@ccclass('HoleSizeThreshold')
export class HoleSizeThreshold {
    @property({ type: CCInteger, tooltip: 'Сколько Collectable нужно собрать (штук) для этого размера' })
    requiredCount: number = 10;

    @property({ type: CCFloat, tooltip: 'Целевой размер дыры от начального (1 = старт, 1.25 = +25%, 1.5 = +50%)' })
    size: number = 1.25;

    @property({ type: CCFloat, tooltip: 'Целевой holeMinSpeed при этом пороге (абсолютное значение, не % от текущего)' })
    minSpeed: number = 3;

    @property({ type: CCFloat, tooltip: 'Целевой holeMaxSpeed при этом пороге (абсолютное значение, не % от текущего)' })
    maxSpeed: number = 18;

    @property({
        type: CCFloat,
        tooltip: 'Целевой pitch holeGrowClip при этом пороге (1 = нормальный, абсолютное значение)',
        range: [0.1, 3, 0.05],
        slide: true,
    })
    growPitch: number = 1;
}

@ccclass('LevelConfig')
export class LevelConfig extends Component {
    // ── Дыра ──────────────────────────────────────────────────────────
    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость дыры при минимальном свайпе (на границе deadzone). Плавно растёт к max вместе с % свайпа.' })
    holeMinSpeed: number = 3;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Максимальная физическая скорость дыры (hard clamp |v|). Достигается при свайпе ≥ maxSwipePct; быстрее разогнаться нельзя.' })
    holeMaxSpeed: number = 18;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Длительность tween роста дыры (сек). Для нескольких колебаний лучше 0.8–1.5' })
    holeScaleTweenDuration: number = 1.0;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Сила overshoot пружины (≥1). 1.0 ≈ без вылета, 1.4–1.8 — заметный «вырос сильнее → сел» на мобиле' })
    holeScaleElasticAmplitude: number = 1.55;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Период колебаний пружины. Меньше — чаще дребезг, больше — дольше держит overshoot (0.35–0.5)' })
    holeScaleElasticPeriod: number = 0.42;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость затухания пружины (классика Penner = 10). 4–6 — плавнее и дольше видны колебания на телефоне' })
    holeScaleElasticDecay: number = 5.5;

    @property({ group: { name: 'Hole Settings', id: '1' }, tooltip: 'Скорость сглаживания скорости дыры (выше = резче смена направления, ниже = плавнее)' })
    velocityLerpSpeed: number = 18;

    @property({ type: [HoleSizeThreshold], group: { name: 'Hole Settings', id: '1' }, tooltip: 'Пороги роста: collectedCount ≥ requiredCount → size + абсолютные minSpeed/maxSpeed + growPitch. Пример: 150 → size 1.25, speed 4..12, pitch 1.1' })
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
    @property({ group: { name: 'Controls', id: '4' }, tooltip: '[Touch] Смещение пальца (доля экрана) для максимальной скорости. 0.2 = 20% короткой стороны.' })
    inputMaxSwipePct: number = 0.2;

    @property({ group: { name: 'Controls', id: '4' }, tooltip: '[Touch] Смещение пальца (доля экрана) для минимальной скорости. Ниже — стоп. Между min и max — lerp скорости.' })
    inputMinSwipePct: number = 0.02;

    @property({ group: { name: 'Controls', id: '4' }, tooltip: '[Mouse] Смещение курсора для максимальной скорости. Больше значение = менее чувствительно (нужен больший ход мыши).' })
    mouseMaxSwipePct: number = 0.45;

    @property({ group: { name: 'Controls', id: '4' }, tooltip: '[Mouse] Deadzone курсора. Ниже — стоп.' })
    mouseMinSwipePct: number = 0.04;

    // ── UI Settings ────────────────────────────────────────────────────
    @property({ group: { name: 'UI Settings', id: '5' } })
    timerWarningThreshold: number = 10;

    @property({ group: { name: 'UI Settings', id: '5' } })
    scorePunchScale: number = 1.3;

    @property({ group: { name: 'UI Settings', id: '5' } })
    scorePunchTime: number = 0.1;

    @property({ group: { name: 'UI Settings', id: '5' } })
    endCardPopScale: number = 0.7;

    // ── Коллекции (физика по цветам) ───────────────────────────────────
    @property({ type: CollectableContainer, group: { name: 'Collections', id: '6' }, tooltip: 'CollectableContainer для Blue' })
    collectionBlue: CollectableContainer = null!;

    @property({ type: CollectableContainer, group: { name: 'Collections', id: '6' }, tooltip: 'CollectableContainer для Red' })
    collectionRed: CollectableContainer = null!;

    @property({ type: CollectableContainer, group: { name: 'Collections', id: '6' }, tooltip: 'CollectableContainer для Green' })
    collectionGreen: CollectableContainer = null!;

    @property({ type: CollectableContainer, group: { name: 'Collections', id: '6' }, tooltip: 'CollectableContainer для Teal' })
    collectionTeal: CollectableContainer = null!;

    @property({
        type: [CollectableContainer],
        group: { name: 'Collections', id: '6' },
        tooltip: 'Порядок активации коллекций. Первый — старт. После полного сбора включается следующий в списке. Пример: Blue → Red → Teal → Green.',
    })
    collectionProgression: CollectableContainer[] = [];

    @property({
        group: { name: 'Collections', id: '6' },
        tooltip: 'Процент RigidBody (0..100), у которых вызывается wakeUp при активации контейнера. 33 ≈ треть.',
        range: [0, 100],
        slide: true,
    })
    wakeUpPercent: number = 33;

    /** Контейнер по типу цвета */
    public getCollection(type: CollectableType): CollectableContainer | null {
        switch (type) {
            case CollectableType.Blue: return this.collectionBlue;
            case CollectableType.Red: return this.collectionRed;
            case CollectableType.Green: return this.collectionGreen;
            case CollectableType.Teal: return this.collectionTeal;
            default: return null;
        }
    }

    /** Стартовая коллекция — первый элемент progression */
    public getInitialCollection(): CollectableContainer | null {
        const order = this.collectionProgression;
        if (!order || order.length === 0) return null;
        const first = order[0];
        return first && first.isValid ? first : null;
    }

    /** Следующая коллекция после очистки типа (по progression) */
    public getActivateAfter(type: CollectableType): CollectableContainer | null {
        const order = this.collectionProgression;
        if (!order || order.length < 2) return null;

        const current = this.getCollection(type);
        if (!current) return null;

        for (let i = 0; i < order.length - 1; i++) {
            const entry = order[i];
            if (entry && entry.isValid && entry === current) {
                const next = order[i + 1];
                return next && next.isValid ? next : null;
            }
        }
        return null;
    }

    // ── Двери (открываются при полном сборе типа) ──────────────────────
    @property({ type: Node, group: { name: 'Doors', id: '7' }, tooltip: 'Дверь для Blue (TYPE_BLUE_CLEARED)' })
    doorBlue: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '7' }, tooltip: 'Дверь для Red (TYPE_RED_CLEARED)' })
    doorRed: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '7' }, tooltip: 'Дверь для Green (TYPE_GREEN_CLEARED)' })
    doorGreen: Node = null!;

    @property({ type: Node, group: { name: 'Doors', id: '7' }, tooltip: 'Дверь для Teal (TYPE_TEAL_CLEARED)' })
    doorTeal: Node = null!;

    @property({
        type: CCFloat,
        group: { name: 'Doors', id: '7' },
        tooltip: 'Длительность подскока ворот вверх (сек)',
        min: 0.01,
    })
    gateOpenJumpTime: number = 0.15;

    @property({
        type: CCFloat,
        group: { name: 'Doors', id: '7' },
        tooltip: 'Высота подскока ворот (local Y)',
        min: 0.01,
    })
    gateOpenJumpHeight: number = 1;

    @property({
        type: CCFloat,
        group: { name: 'Doors', id: '7' },
        tooltip: 'Длительность ускоренного падения ворот вниз (сек)',
        min: 0.01,
    })
    gateOpenFallTime: number = 0.35;

    @property({
        type: CCFloat,
        group: { name: 'Doors', id: '7' },
        tooltip: 'На сколько вниз падает View ворот от старта (local Y)',
        min: 0.01,
    })
    gateOpenSlideDistance: number = 6;

    // ── Particles (VFX на сцене) ────────────────────────────────────────
    @property({ type: ParticleSystem, group: { name: 'Particles', id: '8' }, tooltip: 'Confetti ParticleSystem (one-shot через ParticleService.playConfetti)' })
    particleConfetti: ParticleSystem = null!;

    @property({
        type: [ParticleSystem],
        group: { name: 'Particles', id: '8' },
        tooltip: 'Коллекция ParticleSystem при росте дыры (HOLE_SIZE_CHANGED вверх) — играют все',
    })
    particleSparkles: ParticleSystem[] = [];
}

// Глобальная ссылка для доступа из скриптов без привязки
export let LEVEL_CONFIG: LevelConfig = null!;

export function setLevelConfig(cfg: LevelConfig): void {
    LEVEL_CONFIG = cfg;
}
