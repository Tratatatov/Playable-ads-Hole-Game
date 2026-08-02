import { Label, Color } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

// Scratch colors (no new in handlers — RULES §2.1)
const COLOR_WHITE = new Color(255, 255, 255, 255);
const COLOR_RED   = new Color(255, 80,  80,  255);

/**
 * TimerView — отображение обратного таймера в формате "M:SS" (например "1:30").
 */
export class TimerView {
    private _label: Label | null = null;

    constructor(timerLabel: Label) {
        this._label = timerLabel;
    }

    public updateTime(timeLeft: number): void {
        if (!this._label) return;

        const t  = Math.max(0, Math.ceil(timeLeft));
        const m  = Math.floor(t / 60);
        const s  = t % 60;
        // Формат "1:30" без padStart (ES2015 совместимость)
        const ss = s < 10 ? '0' + s : '' + s;
        this._label.string = m + ':' + ss;
        this._label.color = t <= LEVEL_CONFIG.timerWarningThreshold ? COLOR_RED : COLOR_WHITE;
    }
}
