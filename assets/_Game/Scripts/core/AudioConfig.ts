/**
 * AudioConfig — клипы и громкости SFX (назначаются в Inspector).
 */

import { _decorator, Component, AudioClip, CCFloat } from 'cc';
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

    // ── Громкости ──────────────────────────────────────────────────────
    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    collectVolume: number = 1;

    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    holeGrowVolume: number = 1;

    @property({ type: CCFloat, group: { name: 'Volumes', id: '2' }, range: [0, 1, 0.05], slide: true })
    doorOpenVolume: number = 1;

    // ── Pitch (сбор) ───────────────────────────────────────────────────
    @property({ type: CCFloat, group: { name: 'Collect Pitch', id: '3' }, tooltip: 'Мин. pitch при сборе', range: [0.1, 3, 0.05], slide: true })
    collectPitchMin: number = 0.9;

    @property({ type: CCFloat, group: { name: 'Collect Pitch', id: '3' }, tooltip: 'Макс. pitch при сборе', range: [0.1, 3, 0.05], slide: true })
    collectPitchMax: number = 1.1;
}
