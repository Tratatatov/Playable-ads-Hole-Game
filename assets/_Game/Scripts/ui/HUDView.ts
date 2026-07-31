import { Label, tween, Vec3, Color } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

// Scratch colors (no new in handlers — RULES §2.1)
const COLOR_WHITE = new Color(255, 255, 255, 255);
const COLOR_RED   = new Color(255, 80,  80,  255);

export class HUDView {
    private _scoreLabel: Label | null = null;
    private _timerLabel: Label | null = null;

    /** Scratch для punch-анимации счёта */
    private readonly _scorePunchScale: Vec3 = new Vec3(1.3, 1.3, 1.3);
    private readonly _scoreNormScale:  Vec3 = new Vec3(1.0, 1.0, 1.0);

    constructor(scoreLabel: Label, timerLabel: Label) {
        this._scoreLabel = scoreLabel;
        this._timerLabel = timerLabel;
    }

    public updateScore(score: number): void {
        if (this._scoreLabel) {
            this._scoreLabel.string = '' + Math.floor(score);
            
            // Punch-анимация (scratch Vec3, не new)
            this._scorePunchScale.set(LEVEL_CONFIG.scorePunchScale, LEVEL_CONFIG.scorePunchScale, LEVEL_CONFIG.scorePunchScale);
            tween(this._scoreLabel.node)
                .to(LEVEL_CONFIG.scorePunchTime, { scale: this._scorePunchScale })
                .to(LEVEL_CONFIG.scorePunchTime, { scale: this._scoreNormScale  })
                .start();
        }
    }

    public updateTimer(timeLeft: number): void {
        if (!this._timerLabel) return;
        const t  = Math.max(0, Math.ceil(timeLeft));
        const m  = Math.floor(t / 60);
        const s  = t % 60;
        // Форматирование без padStart (ES2015 совместимость)
        const ss = s < 10 ? '0' + s : '' + s;
        this._timerLabel.string = m + ':' + ss;
        // Красный таймер при < timerWarningThreshold (scratch colors — no new Color)
        this._timerLabel.color = t <= LEVEL_CONFIG.timerWarningThreshold ? COLOR_RED : COLOR_WHITE;
    }
}
