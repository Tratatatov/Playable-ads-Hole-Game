/**
 * CameraConfig — параметры следования, shake, dolly и перемещения камеры.
 * Назначается в Inspector на GameBootstrap.
 */

import { _decorator, Component, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraConfig')
export class CameraConfig extends Component {
    // ── Follow ─────────────────────────────────────────────────────────
    @property({
        group: { name: 'Follow', id: '1' },
        tooltip: 'Следовать за дырой при старте',
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
        tooltip: 'Амплитуда тряски (мировые единицы)',
        min: 0,
    })
    shakeIntensity: number = 0.2;

    @property({
        type: CCFloat,
        group: { name: 'Shake', id: '2' },
        tooltip: 'Длительность тряски (сек)',
        min: 0.01,
    })
    shakeDuration: number = 0.35;

    @property({
        group: { name: 'Shake', id: '2' },
        tooltip: 'Easing затухания тряски (например sineOut, quadOut)',
    })
    shakeEasing: string = 'sineOut';

    // ── Отдаление при открытии ворот (DOOR_OPENED) ─────────────────────
    @property({
        group: { name: 'Отдаление', id: '3' },
        tooltip: 'Отдавать камеру при каждом DOOR_OPENED (полное очищение типа → ворота)',
    })
    dollyOnDoorOpen: boolean = true;

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

    // ── Move A → B ─────────────────────────────────────────────────────
    @property({
        type: CCFloat,
        group: { name: 'Move', id: '4' },
        tooltip: 'Длительность перемещения A→B (сек)',
        min: 0.01,
    })
    moveDuration: number = 1;

    @property({
        group: { name: 'Move', id: '4' },
        tooltip: 'Easing перемещения с ускорением (quadIn, cubicIn, quadInOut…)',
    })
    moveEasing: string = 'quadIn';
}
