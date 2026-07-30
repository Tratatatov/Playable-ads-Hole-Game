/**
 * HUD — игровой интерфейс: счёт и таймер.
 * Слушает EventBus, не знает о HoleController и коллектаблах напрямую.
 * RULES §1.1: Никаких прямых зависимостей между UI и физическими компонентами.
 */

import { _decorator, Component, Label, Node, tween, Vec3, Color } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

const { ccclass, property } = _decorator;

// Scratch colors (no new in handlers — RULES §2.1)
const COLOR_WHITE = new Color(255, 255, 255, 255);
const COLOR_RED   = new Color(255, 80,  80,  255);

@ccclass('HUD')
export class HUD extends Component {
    @property(Label)
    scoreLabel: Label = null!;

    @property(Label)
    timerLabel: Label = null!;

    /** Scratch для punch-анимации счёта */
    private readonly _scorePunchScale: Vec3 = new Vec3(1.3, 1.3, 1.3);
    private readonly _scoreNormScale:  Vec3 = new Vec3(1.0, 1.0, 1.0);

    init(): void {
        EventBus.on(GameEvent.SCORE_CHANGED,  this._onScoreChanged,  this);
        EventBus.on(GameEvent.TIMER_TICK,     this._onTimerTick,     this);
        this._updateScore(0);
        this._updateTimer(LEVEL_CONFIG.totalTime);
    }

    onDestroy(): void {
        EventBus.off(GameEvent.SCORE_CHANGED,  this._onScoreChanged,  this);
        EventBus.off(GameEvent.TIMER_TICK,     this._onTimerTick,     this);
    }

    private _onScoreChanged(payload: { score: number }): void {
        this._updateScore(payload.score);
        // Punch-анимация (scratch Vec3, не new)
        if (this.scoreLabel) {
            this._scorePunchScale.set(LEVEL_CONFIG.scorePunchScale, LEVEL_CONFIG.scorePunchScale, LEVEL_CONFIG.scorePunchScale);
            tween(this.scoreLabel.node)
                .to(LEVEL_CONFIG.scorePunchTime, { scale: this._scorePunchScale })
                .to(LEVEL_CONFIG.scorePunchTime, { scale: this._scoreNormScale  })
                .start();
        }
    }

    private _onTimerTick(payload: { timeLeft: number }): void {
        this._updateTimer(payload.timeLeft);
    }

    private _updateScore(score: number): void {
        if (this.scoreLabel) this.scoreLabel.string = '' + Math.floor(score);
    }

    private _updateTimer(timeLeft: number): void {
        if (!this.timerLabel) return;
        const t  = Math.max(0, Math.ceil(timeLeft));
        const m  = Math.floor(t / 60);
        const s  = t % 60;
        // Форматирование без padStart (ES2015 совместимость)
        const ss = s < 10 ? '0' + s : '' + s;
        this.timerLabel.string = m + ':' + ss;
        // Красный таймер при < timerWarningThreshold (scratch colors — no new Color)
        this.timerLabel.color = t <= LEVEL_CONFIG.timerWarningThreshold ? COLOR_RED : COLOR_WHITE;
    }
}
