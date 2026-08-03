/**
 * CameraConfig — параметры следования, shake, dolly и перемещения камеры.
 * Назначается в Inspector на GameBootstrap.
 */

import { _decorator, Component, CCFloat, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraConfig')
export class CameraConfig extends Component {
    // ── Follow ─────────────────────────────────────────────────────────
    @property({
        group: { name: 'Follow', id: '1' },
        tooltip: 'Следовать за дырой при старте (выкл. если есть пролёт A→B)',
    })
    followEnabledOnStart: boolean = true;

    @property({
        group: { name: 'Follow', id: '1' },
        tooltip:
            'Жёсткий lock на Hole (world-space). Убирает лаг/дёрганье от мягкого follow. ' +
            'Выкл. → smooth damp с followLerpSpeed.',
    })
    followHardLock: boolean = true;

    @property({
        type: CCFloat,
        group: { name: 'Follow', id: '1' },
        tooltip: 'Скорость smooth damp, если followHardLock выкл. (выше = резче). Формула: 1-e^(-k*dt)',
        min: 0,
    })
    followLerpSpeed: number = 8;

    // ── Shake ──────────────────────────────────────────────────────────
    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Амплитуда тряски (мировые единицы) — общий shake()',
        min: 0,
    })
    shakeIntensity: number = 0.2;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Длительность тряски (сек) — общий shake()',
        min: 0.01,
    })
    shakeDuration: number = 0.35;

    @property({
        group: { name: 'Shake', id: '2' },
        tooltip: 'Easing затухания тряски (например sineOut, quadOut)',
    })
    shakeEasing: string = 'sineOut';

    @property({
        group: { name: 'Shake', id: '2' },
        tooltip: 'Лёгкий shake при росте дыры (HOLE_SIZE_CHANGED вверх)',
    })
    shakeOnHoleGrow: boolean = true;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Амплитуда shake при росте дыры',
        min: 0,
    })
    holeGrowShakeIntensity: number = 0.1;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Длительность shake при росте дыры (сек)',
        min: 0.01,
    })
    holeGrowShakeDuration: number = 0.28;

    @property({
        group: { name: 'Shake', id: '2' },
        tooltip: 'Shake при открытии двери (DOOR_OPENED) — сильнее роста дыры',
    })
    shakeOnDoorOpen: boolean = true;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Амплитуда shake при открытии двери',
        min: 0,
    })
    doorOpenShakeIntensity: number = 0.18;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Длительность shake при открытии двери (сек)',
        min: 0.01,
    })
    doorOpenShakeDuration: number = 0.35;

    @property({
        group: { name: 'Shake', id: '2' },
        tooltip: 'Слабый shake при PerfectMessage',
    })
    shakeOnPerfectMessage: boolean = true;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Амплитуда shake при PerfectMessage (самый слабый)',
        min: 0,
    })
    perfectShakeIntensity: number = 0.05;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Длительность shake при PerfectMessage (сек)',
        min: 0.01,
    })
    perfectShakeDuration: number = 0.2;

    // ── Отдаление при росте дыры (HOLE_SIZE_CHANGED вверх) ─────────────
    @property({
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Отдавать камеру при каждом росте дыры (HOLE_SIZE_CHANGED вверх)',
        formerlySerializedAs: 'dollyOnDoorOpen',
    })
    dollyOnHoleGrow: boolean = true;

    @property({
        type: CCFloat,
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Смещение по локальной оси Z (+ = назад вдоль взгляда)',
        displayName: 'Z',
        formerlySerializedAs: 'dollyDistance',
    })
    dollyOffsetZ: number = 2;

    @property({
        type: CCFloat,
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Прирост orthoHeight (орто-камера). 0 = без изменения',
        displayName: 'Ortho Zoom',
        min: 0,
    })
    dollyZoom: number = 0;

    @property({
        type: CCFloat,
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Прирост FOV в градусах (перспективная камера). 0 = без изменения',
        displayName: 'FOV',
    })
    dollyFov: number = 0;

    @property({
        type: CCFloat,
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Длительность твина (сек)',
        min: 0.01,
    })
    dollyDuration: number = 0.5;

    @property({
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Easing (например quadOut, sineInOut)',
    })
    dollyEasing: string = 'quadOut';

    // ── Move A → B (CameraIntro) ───────────────────────────────────────
    @property({
        group: { name: 'Intro Fly', id: '4' },
        tooltip: 'Проигрывать пролёт камеры A→B при старте (CameraIntroState)',
    })
    introEnabled: boolean = true;

    @property({
        type: Node,
        group: { name: 'Intro Fly', id: '4' },
        tooltip: 'Точка A — стартовая позиция камеры (world)',
    })
    introPointA: Node | null = null;

    @property({
        type: Node,
        group: { name: 'Intro Fly', id: '4' },
        tooltip: 'Точка B — конечная позиция камеры перед Tutorial (world)',
    })
    introPointB: Node | null = null;

    @property({
        type: CCFloat,
        group: { name: 'Intro Fly', id: '4' },
        tooltip: 'Длительность перемещения A→B (сек)',
        min: 0.01,
    })
    moveDuration: number = 1;

    @property({
        group: { name: 'Intro Fly', id: '4' },
        tooltip: 'Easing перемещения с ускорением (quadIn, cubicIn, quadInOut…)',
    })
    moveEasing: string = 'quadIn';
}
