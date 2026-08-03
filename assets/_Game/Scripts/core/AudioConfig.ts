/**
 * AudioConfig — клипы и громкости SFX (назначаются в Inspector).
 */

import { _decorator, Component, AudioClip, CCFloat, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioConfig')
export class AudioConfig extends Component {
    // ── Клипы ──────────────────────────────────────────────────────────
    @property({ type: AudioClip, group: { name: 'SFX Clips', id: '1' }, tooltip: 'Звук сбора коллектабла (ITEM_COLLECTED)' })
    collectClip: AudioClip = null!;

    @property({ type: AudioClip, group: { name: 'SFX Clips', id: '1' }, tooltip: 'Звук увеличения дыры (HOLE_SIZE_CHANGED вверх)' })
    holeGrowClip: AudioClip = null!;

    @property({ type: AudioClip, group: { name: 'SFX Clips', id: '1' }, tooltip: 'Звук открытия ворот (DOOR_OPENED)' })
    doorOpenClip: AudioClip = null!;

    @property({ type: AudioClip, group: { name: 'SFX Clips', id: '1' }, tooltip: 'Звук Perfect / Nice / Great (PERFECT_MESSAGE)' })
    perfectMessageClip: AudioClip = null!;

    // ── Громкости ──────────────────────────────────────────────────────
    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    collectVolume: number = 0.55;

    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    holeGrowVolume: number = 1;

    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    doorOpenVolume: number = 1;

    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    perfectMessageVolume: number = 1;

    // ── Pitch (сбор) ───────────────────────────────────────────────────
    @property({ type: CCFloat, group: { name: 'Collect Pitch', id: '3' }, tooltip: 'Мин. pitch при сборе (и база streak-режима)', range: [0.1, 3, 0.05], slide: true })
    collectPitchMin: number = 0.95;

    @property({ type: CCFloat, group: { name: 'Collect Pitch', id: '3' }, tooltip: 'Макс. pitch при сборе (и потолок streak-режима). Для streak нужен запас: Max − Min ≫ Step', range: [0.1, 3, 0.05], slide: true })
    collectPitchMax: number = 1.8;

    @property({
        group: { name: 'Collect Pitch', id: '3' },
        tooltip:
            'Streak: каждый ITEM_COLLECTED поднимает pitch на step (от текущей базы). ' +
            'При росте дыры streak сбрасывается, но база ↑ на Grow Boost. Выкл. → random Min..Max.',
    })
    collectPitchStreakEnabled: boolean = false;

    @property({
        type: CCFloat,
        group: { name: 'Collect Pitch', id: '3' },
        tooltip: 'Шаг pitch за сбор внутри streak. Пример: Base=1, Step=0.05',
        range: [0, 0.5, 0.005],
        slide: true,
    })
    collectPitchStreakStep: number = 0.05;

    @property({
        type: CCFloat,
        group: { name: 'Collect Pitch', id: '3' },
        tooltip:
            'Насколько поднять стартовый (базовый) pitch сбора при каждом росте дыры. ' +
            'Streak сбрасывается, база остаётся выше. 0 = только сброс streak.',
        range: [0, 1, 0.01],
        slide: true,
    })
    collectPitchGrowBoost: number = 0.08;

    // ── Pitch (ворота) ─────────────────────────────────────────────────
    @property({
        type: CCFloat,
        group: { name: 'Door Pitch', id: '6' },
        tooltip: 'Pitch первого открытия ворот (DOOR_OPENED)',
        range: [0.1, 3, 0.05],
        slide: true,
    })
    doorOpenPitchMin: number = 1;

    @property({
        type: CCFloat,
        group: { name: 'Door Pitch', id: '6' },
        tooltip: 'Потолок pitch при открытии ворот',
        range: [0.1, 3, 0.05],
        slide: true,
    })
    doorOpenPitchMax: number = 1.6;

    @property({
        type: CCFloat,
        group: { name: 'Door Pitch', id: '6' },
        tooltip: 'На сколько ↑ pitch за каждые следующие ворота. 0 = всегда Min',
        range: [0, 1, 0.01],
        slide: true,
    })
    doorOpenPitchStep: number = 0.12;

    // ── Pitch (Perfect Message) ────────────────────────────────────────
    @property({
        type: CCFloat,
        group: { name: 'Perfect Pitch', id: '5' },
        tooltip: 'Мин. pitch PerfectMessage (PERFECT_MESSAGE)',
        range: [0.1, 3, 0.05],
        slide: true,
    })
    perfectMessagePitchMin: number = 0.95;

    @property({
        type: CCFloat,
        group: { name: 'Perfect Pitch', id: '5' },
        tooltip: 'Макс. pitch PerfectMessage (PERFECT_MESSAGE)',
        range: [0.1, 3, 0.05],
        slide: true,
    })
    perfectMessagePitchMax: number = 1.08;

    // ── Collect pool / anti-mud ─────────────────────────────────────────
    @property({
        type: CCInteger,
        group: { name: 'Collect Pool', id: '4' },
        tooltip: 'Сколько параллельных collect-голосов. Больше = меньше обрывов, но тяжелее.',
        min: 2,
        max: 16,
    })
    collectPoolSize: number = 8;

    @property({
        type: CCFloat,
        group: { name: 'Collect Pool', id: '4' },
        tooltip: 'Мин. интервал между collect SFX (сек). Режет «кашу» при вакууме.',
        range: [0, 0.2, 0.005],
        slide: true,
    })
    collectMinInterval: number = 0.04;

    @property({
        type: CCFloat,
        group: { name: 'Collect Pool', id: '4' },
        tooltip:
            'Ослабление громкости при нескольких активных голосах: ' +
            'vol /= 1 + k*(active-1). 0 = без attenuation.',
        range: [0, 1, 0.05],
        slide: true,
    })
    collectStackAttenuation: number = 0.35;
}
