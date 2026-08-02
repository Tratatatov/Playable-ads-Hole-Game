/**
 * TweenService — игровые твины.
 * Конфиги НЕ читает из LEVEL_CONFIG — всегда передаются аргументом (дыре / другим системам).
 * Сюда же дописывать новые твины.
 *
 * Plain TS class (не Component). RULES §2.1: нет аллокаций в update().
 */

import { Node, Vec3, tween, Tween } from 'cc';

/** Параметры пружинного роста scale дыры. */
export interface HoleScaleSpringTweenConfig {
    /** Длительность (сек). */
    duration: number;
    /** Сила overshoot (≥1). */
    amplitude: number;
    /** Период колебаний пружины. */
    period: number;
}

/** Параметры elastic punch scale для UI-карточек. */
export interface UiScaleElasticTweenConfig {
    /** Длительность пружины обратно к base (сек). */
    duration: number;
    /** Сила overshoot (≥1). */
    amplitude: number;
    /** Период колебаний пружины. */
    period: number;
    /** Множитель стартового scale относительно base (например 1.25). */
    punchScale: number;
}

/** Параметры elastic роста scale (0 → target). */
export interface UiScaleGrowElasticTweenConfig {
    /** Длительность роста (сек). */
    duration: number;
    /** Сила overshoot (≥1). */
    amplitude: number;
    /** Период колебаний пружины. */
    period: number;
}

/** Параметры jump→fall съезда ворот (как Collectable). */
export interface GateSlideDownElasticTweenConfig {
    /** Длительность подскока вверх (сек). */
    jumpDuration: number;
    /** Высота подскока (local Y, >0). */
    jumpHeight: number;
    /** Длительность падения вниз (сек). */
    fallDuration: number;
    /** На сколько вниз упасть от старта (local Y, >0). */
    fallDistance: number;
    /** Вызывается по завершении tween (и при stop с snap). */
    onComplete?: () => void;
}

export interface ITweenService {
    init(): void;
    destroy(): void;

    /**
     * Пружинный tween scale → targetScale (обычно X/Z выросли, Y без изменений).
     * Повторный вызов стопает предыдущий hole-scale tween.
     */
    holeScaleSpring(node: Node, targetScale: Readonly<Vec3>, config: HoleScaleSpringTweenConfig): void;

    /** Остановить активный hole-scale tween (если есть). */
    stopHoleScaleSpring(): void;

    /**
     * Elastic punch UI-ноды: scale → base * punchScale, затем пружина к base.
     * Повторный вызов стопает предыдущий UI elastic tween.
     */
    uiScaleElastic(node: Node, config: UiScaleElasticTweenConfig): void;

    /** Остановить активный UI elastic punch (если есть). */
    stopUiScaleElastic(): void;

    /** Идёт ли сейчас UI elastic punch. */
    isUiScaleElasticPlaying(): boolean;

    /**
     * Elastic рост UI-ноды: scale 0 → targetScale с пружиной.
     * Повторный вызов стопает предыдущий grow tween.
     */
    uiScaleGrowElastic(node: Node, targetScale: Readonly<Vec3>, config: UiScaleGrowElasticTweenConfig): void;

    /** Остановить активный UI grow elastic (если есть). */
    stopUiScaleGrowElastic(): void;

    /**
     * Съезд ворот: подскок вверх (quadOut) → ускоренное падение вниз (quadIn).
     * Повторный вызов стопает предыдущий gate-slide tween.
     */
    gateSlideDownElastic(node: Node, config: GateSlideDownElasticTweenConfig): void;

    /** Остановить активный gate-slide tween (если есть). */
    stopGateSlideDownElastic(): void;
}

class TweenServiceImpl implements ITweenService {
    private readonly _holeTargetScale: Vec3 = new Vec3(1, 1, 1);
    private _holeScaleTween: Tween<Node> | null = null;
    private _holeElasticAmp: number = 1.35;
    private _holeElasticPeriod: number = 0.4;

    private readonly _uiBaseScale: Vec3 = new Vec3(1, 1, 1);
    private readonly _uiPunchScale: Vec3 = new Vec3(1, 1, 1);
    private _uiScaleTween: Tween<Node> | null = null;
    private _uiNode: Node | null = null;
    private _uiElasticAmp: number = 1.35;
    private _uiElasticPeriod: number = 0.4;

    private readonly _uiGrowTargetScale: Vec3 = new Vec3(1, 1, 1);
    private _uiGrowTween: Tween<Node> | null = null;
    private _uiGrowNode: Node | null = null;
    private _uiGrowElasticAmp: number = 1.35;
    private _uiGrowElasticPeriod: number = 0.4;

    private readonly _gatePeakPos: Vec3 = new Vec3();
    private readonly _gateTargetPos: Vec3 = new Vec3();
    private _gateSlideTween: Tween<Node> | null = null;
    private _gateNode: Node | null = null;
    private _gateOnComplete: (() => void) | null = null;

    init(): void {
        console.log('[TweenService] Инициализирован');
    }

    destroy(): void {
        this.stopHoleScaleSpring();
        this.stopUiScaleElastic();
        this.stopUiScaleGrowElastic();
        this.stopGateSlideDownElastic();
    }

    holeScaleSpring(node: Node, targetScale: Readonly<Vec3>, config: HoleScaleSpringTweenConfig): void {
        if (!node || !node.isValid) return;

        this._holeTargetScale.set(targetScale.x, targetScale.y, targetScale.z);
        this.stopHoleScaleSpring();

        this._holeElasticAmp = Math.max(1, config.amplitude);
        this._holeElasticPeriod = Math.max(0.05, config.period);
        const duration = Math.max(0.01, config.duration);

        this._holeScaleTween = tween(node)
            .to(duration, { scale: this._holeTargetScale }, { easing: this._holeSpringOut })
            .call(() => { this._holeScaleTween = null; })
            .start();
    }

    stopHoleScaleSpring(): void {
        if (this._holeScaleTween) {
            this._holeScaleTween.stop();
            this._holeScaleTween = null;
        }
    }

    uiScaleElastic(node: Node, config: UiScaleElasticTweenConfig): void {
        if (!node || !node.isValid) return;

        this.stopUiScaleElastic();

        this._uiNode = node;
        this._uiBaseScale.set(node.scale);
        const punch = Math.max(0.01, config.punchScale);
        this._uiPunchScale.set(
            this._uiBaseScale.x * punch,
            this._uiBaseScale.y * punch,
            this._uiBaseScale.z * punch
        );
        node.setScale(this._uiPunchScale);

        this._uiElasticAmp = Math.max(1, config.amplitude);
        this._uiElasticPeriod = Math.max(0.05, config.period);
        const duration = Math.max(0.01, config.duration);

        this._uiScaleTween = tween(node)
            .to(duration, { scale: this._uiBaseScale }, { easing: this._uiSpringOut })
            .call(() => {
                this._uiScaleTween = null;
                this._uiNode = null;
            })
            .start();
    }

    stopUiScaleElastic(): void {
        if (this._uiScaleTween) {
            this._uiScaleTween.stop();
            this._uiScaleTween = null;
        }
        if (this._uiNode && this._uiNode.isValid) {
            this._uiNode.setScale(this._uiBaseScale);
        }
        this._uiNode = null;
    }

    isUiScaleElasticPlaying(): boolean {
        return this._uiScaleTween !== null;
    }

    uiScaleGrowElastic(node: Node, targetScale: Readonly<Vec3>, config: UiScaleGrowElasticTweenConfig): void {
        if (!node || !node.isValid) return;

        this.stopUiScaleGrowElastic();

        this._uiGrowNode = node;
        this._uiGrowTargetScale.set(targetScale.x, targetScale.y, targetScale.z);
        node.setScale(0, 0, 0);

        this._uiGrowElasticAmp = Math.max(1, config.amplitude);
        this._uiGrowElasticPeriod = Math.max(0.05, config.period);
        const duration = Math.max(0.01, config.duration);

        this._uiGrowTween = tween(node)
            .to(duration, { scale: this._uiGrowTargetScale }, { easing: this._uiGrowSpringOut })
            .call(() => {
                this._uiGrowTween = null;
                this._uiGrowNode = null;
            })
            .start();
    }

    stopUiScaleGrowElastic(): void {
        if (this._uiGrowTween) {
            this._uiGrowTween.stop();
            this._uiGrowTween = null;
        }
        if (this._uiGrowNode && this._uiGrowNode.isValid) {
            this._uiGrowNode.setScale(this._uiGrowTargetScale);
        }
        this._uiGrowNode = null;
    }

    gateSlideDownElastic(node: Node, config: GateSlideDownElasticTweenConfig): void {
        if (!node || !node.isValid) return;

        this.stopGateSlideDownElastic();

        this._gateNode = node;
        this._gateOnComplete = config.onComplete ?? null;

        const pos = node.position;
        const jumpH = Math.max(0.01, config.jumpHeight);
        const fallD = Math.max(0.01, config.fallDistance);
        this._gatePeakPos.set(pos.x, pos.y + jumpH, pos.z);
        this._gateTargetPos.set(pos.x, pos.y - fallD, pos.z);

        const jumpDur = Math.max(0.01, config.jumpDuration);
        const fallDur = Math.max(0.01, config.fallDuration);

        this._gateSlideTween = tween(node)
            .to(jumpDur, { position: this._gatePeakPos }, { easing: 'quadOut' })
            .to(fallDur, { position: this._gateTargetPos }, { easing: 'quadIn' })
            .call(() => {
                this._gateSlideTween = null;
                this._gateNode = null;
                const done = this._gateOnComplete;
                this._gateOnComplete = null;
                if (done) done();
            })
            .start();
    }

    stopGateSlideDownElastic(): void {
        if (this._gateSlideTween) {
            this._gateSlideTween.stop();
            this._gateSlideTween = null;
        }
        if (this._gateNode && this._gateNode.isValid) {
            this._gateNode.setPosition(this._gateTargetPos);
        }
        this._gateNode = null;
        const done = this._gateOnComplete;
        this._gateOnComplete = null;
        if (done) done();
    }

    /** Затухающая пружина (Penner elasticOut) для дыры. */
    private readonly _holeSpringOut = (k: number): number => {
        if (k === 0 || k === 1) return k;
        const a = this._holeElasticAmp;
        const p = this._holeElasticPeriod;
        const s = p * Math.asin(1 / a) / (2 * Math.PI);
        return a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1;
    };

    /** Затухающая пружина (Penner elasticOut) для UI punch. */
    private readonly _uiSpringOut = (k: number): number => {
        if (k === 0 || k === 1) return k;
        const a = this._uiElasticAmp;
        const p = this._uiElasticPeriod;
        const s = p * Math.asin(1 / a) / (2 * Math.PI);
        return a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1;
    };

    /** Затухающая пружина (Penner elasticOut) для UI grow. */
    private readonly _uiGrowSpringOut = (k: number): number => {
        if (k === 0 || k === 1) return k;
        const a = this._uiGrowElasticAmp;
        const p = this._uiGrowElasticPeriod;
        const s = p * Math.asin(1 / a) / (2 * Math.PI);
        return a * Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1;
    };

}

export let TweenService: ITweenService = new TweenServiceImpl();
