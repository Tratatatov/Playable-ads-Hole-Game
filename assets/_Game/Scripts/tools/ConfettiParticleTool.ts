/**
 * ConfettiParticleTool — editor-only: создаёт / настраивает one-shot конфетти
 * по референсу Unity Hyper Casual FX `confetti_small`.
 *
 * Эффект:
 *  - point/sphere burst вверх (node tilt X=90°)
 *  - RandomColor из палитры Lana Studio
 *  - вращение + size/alpha fade к концу жизни
 *  - падение через gravityModifier (упрощение Velocity over Lifetime из Unity)
 *
 * Runtime уничтожается. Gameplay не импортирует этот Tool.
 */

import {
    _decorator, Component, Node, ParticleSystem, Color, Material, Texture2D,
    GradientRange, CurveRange, ColorKey, AlphaKey, RealCurve, Burst,
} from 'cc';
import { EDITOR } from 'cc/env';
import { LevelConfig } from '../gameplay/LevelConfig';

const { ccclass, property, executeInEditMode, menu, disallowMultiple } = _decorator;

/** Палитра Unity confetti_small (RandomColor gradient, 6 ключей). */
const UNITY_CONFETTI_COLORS: ReadonlyArray<Readonly<[number, number, number]>> = [
    [231, 64, 47],   // red
    [255, 149, 0],   // orange
    [255, 244, 0],   // yellow
    [69, 233, 149],  // green
    [0, 210, 214],   // cyan
    [38, 98, 245],   // blue
];

/** ShapeType.Sphere в Cocos Creator 3.x */
const SHAPE_SPHERE = 3;

@ccclass('ConfettiParticleTool')
@executeInEditMode(true)
@disallowMultiple
@menu('Tools/Confetti Particles')
export class ConfettiParticleTool extends Component {

    @property({ type: Node, tooltip: 'Родитель для нового узла (пусто = этот узел)' })
    public parentNode: Node | null = null;

    @property({
        type: ParticleSystem,
        tooltip: 'Существующий ParticleSystem — перенастроить. Пусто = создать новый узел.',
    })
    public targetSystem: ParticleSystem | null = null;

    @property({
        type: LevelConfig,
        tooltip: 'Опционально: записать ParticleSystem в LevelConfig.particleConfetti',
    })
    public levelConfig: LevelConfig | null = null;

    @property({ type: Material, tooltip: 'Материал частиц (M_Particles)' })
    public particleMaterial: Material | null = null;

    @property({ type: Texture2D, tooltip: 'Текстура confetti quad (опционально)' })
    public particleTexture: Texture2D | null = null;

    @property({ tooltip: 'Имя узла при создании' })
    public nodeName = 'ConfettiParticles';

    @property({ type: [Color], tooltip: 'Палитра стартовых цветов (RandomColor)' })
    public colors: Color[] = UNITY_CONFETTI_COLORS.map(
        ([r, g, b]) => new Color(r, g, b, 255),
    );

    @property({ tooltip: 'Ёмкость ParticleSystem' })
    public capacity = 40;

    @property({ tooltip: 'Длительность эмиттера (сек), loop = false' })
    public duration = 1;

    @property({ tooltip: 'Число частиц в burst (Unity confetti_small = 15)' })
    public burstCount = 20;

    @property({ tooltip: 'Мин. время жизни частицы (сек)' })
    public startLifetimeMin = 2.5;

    @property({ tooltip: 'Макс. время жизни частицы (сек)' })
    public startLifetimeMax = 4;

    @property({ tooltip: 'Мин. стартовая скорость' })
    public startSpeedMin = 5;

    @property({ tooltip: 'Макс. стартовая скорость' })
    public startSpeedMax = 12;

    @property({ tooltip: 'Мин. стартовый размер' })
    public startSizeMin = 0.08;

    @property({ tooltip: 'Макс. стартовый размер' })
    public startSizeMax = 0.18;

    @property({ tooltip: 'Gravity modifier (падение; Unity = Velocity Y overtime)' })
    public gravityModifier = 1.6;

    @property({ tooltip: 'Мин. скорость вращения (град/сек)' })
    public rotationSpeedMinDeg = -200;

    @property({ tooltip: 'Макс. скорость вращения (град/сек)' })
    public rotationSpeedMaxDeg = 200;

    @property({ tooltip: 'Радиус сферы-эмиттера (Unity ≈ 0)' })
    public sphereRadius = 0.02;

    @property({ tooltip: 'Наклон узла (X°) — эмиттер «вверх» по world Y' })
    public nodeTiltXDeg = 90;

    @property({ tooltip: 'Создать / перенастроить конфетти на сцене' })
    public get createButton(): boolean {
        return false;
    }
    public set createButton(v: boolean) {
        if (v && EDITOR) {
            this.createOrConfigure();
        }
    }

    @property({ tooltip: 'Превью: play one-shot (только в редакторе)' })
    public get previewButton(): boolean {
        return false;
    }
    public set previewButton(v: boolean) {
        if (v && EDITOR) {
            this.preview();
        }
    }

    onLoad(): void {
        if (!EDITOR) {
            this.destroy();
        }
    }

    // ── Public ────────────────────────────────────────────────────────────

    public createOrConfigure(): ParticleSystem | null {
        const ps = this._resolveOrCreateSystem();
        if (!ps) {
            return null;
        }

        this._configureMain(ps);
        this._configureStartColor(ps);
        this._configureStartSize(ps);
        this._configureStartSpeed(ps);
        this._configureStartRotation(ps);
        this._configureShape(ps);
        this._configureColorOverLifetime(ps);
        this._configureSizeOverLifetime(ps);
        this._configureRotationOverLifetime(ps);
        this._configureBurst(ps);
        this._configureRenderer(ps);
        this._assignToLevelConfig(ps);

        ps.playOnAwake = false;
        ps.stop();
        ps.clear();

        console.log(
            `[ConfettiParticleTool] Готово: «${ps.node.name}» ` +
            `(burst=${this.burstCount}, colors=${this.colors.length}, ` +
            `life=${this.startLifetimeMin}–${this.startLifetimeMax}s).`,
        );

        return ps;
    }

    public preview(): void {
        const ps = this.targetSystem
            ?? this.node.getComponentInChildren(ParticleSystem)
            ?? this._findByName();

        if (!ps || !ps.isValid) {
            console.warn('[ConfettiParticleTool] Нет ParticleSystem — сначала Create');
            return;
        }

        ps.stop();
        ps.clear();
        ps.play();
        console.log(`[ConfettiParticleTool] Preview → ${ps.node.name}`);
    }

    // ── Resolve / create ──────────────────────────────────────────────────

    private _resolveOrCreateSystem(): ParticleSystem | null {
        if (this.targetSystem && this.targetSystem.isValid) {
            return this.targetSystem;
        }

        const existing = this._findByName() ?? this._findLegacyTypo();
        if (existing) {
            this.targetSystem = existing;
            if (existing.node.name !== this.nodeName) {
                existing.node.name = this.nodeName;
            }
            return existing;
        }

        const parent = (this.parentNode && this.parentNode.isValid)
            ? this.parentNode
            : this.node;

        const n = new Node(this.nodeName);
        parent.addChild(n);
        n.setPosition(0, 0, 0);
        n.setRotationFromEuler(this.nodeTiltXDeg, 0, 0);
        n.setScale(1, 1, 1);

        const ps = n.addComponent(ParticleSystem);
        this.targetSystem = ps;
        return ps;
    }

    private _findByName(): ParticleSystem | null {
        const parent = (this.parentNode && this.parentNode.isValid)
            ? this.parentNode
            : this.node;
        const child = parent.getChildByName(this.nodeName);
        return child?.getComponent(ParticleSystem) ?? null;
    }

    /** Старое имя узла на сцене: ConfettyParticles */
    private _findLegacyTypo(): ParticleSystem | null {
        const parent = (this.parentNode && this.parentNode.isValid)
            ? this.parentNode
            : this.node;
        const child = parent.getChildByName('ConfettyParticles');
        return child?.getComponent(ParticleSystem) ?? null;
    }

    // ── Configure modules ─────────────────────────────────────────────────

    private _configureMain(ps: ParticleSystem): void {
        ps.capacity = Math.max(1, Math.floor(this.capacity));
        ps.duration = Math.max(0.05, this.duration);
        ps.loop = false;
        ps.playOnAwake = false;
        ps.prewarm = false;
        ps.simulationSpeed = 1;

        this._setConstant(ps.startDelay, 0);
        this._setTwoConstants(
            ps.startLifetime,
            Math.min(this.startLifetimeMin, this.startLifetimeMax),
            Math.max(this.startLifetimeMin, this.startLifetimeMax),
        );
        this._setConstant(ps.gravityModifier, this.gravityModifier);
        this._setConstant(ps.rateOverTime, 0);
        this._setConstant(ps.rateOverDistance, 0);
    }

    private _configureStartColor(ps: ParticleSystem): void {
        const palette = this.colors.length > 0
            ? this.colors
            : UNITY_CONFETTI_COLORS.map(([r, g, b]) => new Color(r, g, b, 255));

        const colorKeys: ColorKey[] = [];
        for (let i = 0; i < palette.length; i++) {
            const key = new ColorKey();
            key.color = palette[i].clone();
            key.color.a = 255;
            key.time = palette.length === 1 ? 0 : i / (palette.length - 1);
            colorKeys.push(key);
        }

        const alphaKey = new AlphaKey();
        alphaKey.alpha = 255;
        alphaKey.time = 0;

        ps.startColor.mode = GradientRange.Mode.RandomColor;
        ps.startColor.gradient.setKeys(colorKeys, [alphaKey]);
    }

    private _configureStartSize(ps: ParticleSystem): void {
        const min = Math.min(this.startSizeMin, this.startSizeMax);
        const max = Math.max(this.startSizeMin, this.startSizeMax);
        ps.startSize3D = false;
        this._setTwoConstants(ps.startSizeX, min, max);
    }

    private _configureStartSpeed(ps: ParticleSystem): void {
        const min = Math.min(this.startSpeedMin, this.startSpeedMax);
        const max = Math.max(this.startSpeedMin, this.startSpeedMax);
        this._setTwoConstants(ps.startSpeed, min, max);
    }

    private _configureStartRotation(ps: ParticleSystem): void {
        ps.startRotation3D = false;
        this._setTwoConstants(ps.startRotationZ, 0, Math.PI * 2);
    }

    private _configureShape(ps: ParticleSystem): void {
        const shape = ps.shapeModule;
        shape.enable = true;
        shape.shapeType = SHAPE_SPHERE;
        shape.radius = Math.max(0.001, this.sphereRadius);
        shape.radiusThickness = 1;
        shape.arc = 360;
        shape.emitFrom = 0;
        shape.alignToDirection = false;
        shape.randomDirectionAmount = 0;
        shape.sphericalDirectionAmount = 0;
        shape.position.set(0, 0, 0);
        shape.rotation.set(0, 0, 0);
        shape.scale.set(1, 1, 1);

        // Узел уже tilted X=90 — сохраняем ориентацию
        ps.node.setRotationFromEuler(this.nodeTiltXDeg, 0, 0);
    }

    /** Unity Color over Lifetime: fade-in → hold → fade-out. */
    private _configureColorOverLifetime(ps: ParticleSystem): void {
        const mod = ps.colorOverLifetimeModule;
        mod.enable = true;

        const ck0 = new ColorKey();
        ck0.color = new Color(255, 255, 255, 255);
        ck0.time = 0;
        const ck1 = new ColorKey();
        ck1.color = new Color(255, 255, 255, 255);
        ck1.time = 1;

        const ak0 = new AlphaKey();
        ak0.alpha = 0;
        ak0.time = 0;
        const ak1 = new AlphaKey();
        ak1.alpha = 255;
        ak1.time = 0.05;
        const ak2 = new AlphaKey();
        ak2.alpha = 255;
        ak2.time = 0.75;
        const ak3 = new AlphaKey();
        ak3.alpha = 0;
        ak3.time = 1;

        mod.color.mode = GradientRange.Mode.Gradient;
        mod.color.gradient.setKeys([ck0, ck1], [ak0, ak1, ak2, ak3]);
    }

    /** Unity Size over Lifetime: ~1 до 0.76 → ~0.18. */
    private _configureSizeOverLifetime(ps: ParticleSystem): void {
        const mod = ps.sizeOvertimeModule;
        mod.enable = true;
        mod.separateAxes = false;

        const size = mod.size;
        size.mode = CurveRange.Mode.Curve;
        size.multiplier = 1;
        this._setCurve(size.spline, [0, 0.76, 1], [1, 1, 0.18]);
    }

    /** Вращение вокруг Z (случайная угловая скорость). */
    private _configureRotationOverLifetime(ps: ParticleSystem): void {
        const mod = ps.rotationOvertimeModule;
        mod.enable = true;
        mod.separateAxes = false;

        const minRad = (this.rotationSpeedMinDeg * Math.PI) / 180;
        const maxRad = (this.rotationSpeedMaxDeg * Math.PI) / 180;
        this._setTwoConstants(
            mod.z,
            Math.min(minRad, maxRad),
            Math.max(minRad, maxRad),
        );
    }

    private _configureBurst(ps: ParticleSystem): void {
        const count = Math.max(1, Math.floor(this.burstCount));

        const burst = new Burst();
        burst.time = 0;
        burst.repeatCount = 1;
        burst.repeatInterval = 1;
        this._setConstant(burst.count, count);

        ps.bursts.length = 0;
        ps.bursts.push(burst);
    }

    private _configureRenderer(ps: ParticleSystem): void {
        const renderer = ps.renderer;
        // Billboard (Unity uses Mesh; billboard + quad texture ближе по бюджету playable)
        renderer.renderMode = 0;

        if (this.particleMaterial) {
            ps.setSharedMaterial(this.particleMaterial, 0);
            renderer.cpuMaterial = this.particleMaterial;
        }

        if (this.particleTexture) {
            renderer.mainTexture = this.particleTexture;
        }
    }

    private _assignToLevelConfig(ps: ParticleSystem): void {
        if (!this.levelConfig || !this.levelConfig.isValid) {
            return;
        }
        this.levelConfig.particleConfetti = ps;
        console.log(`[ConfettiParticleTool] → LevelConfig.particleConfetti = ${ps.node.name}`);
    }

    // ── Curve helpers ─────────────────────────────────────────────────────

    private _setConstant(range: CurveRange | null | undefined, value: number): void {
        if (!range) {
            console.warn('[ConfettiParticleTool] CurveRange отсутствует (Constant)');
            return;
        }
        range.mode = CurveRange.Mode.Constant;
        range.constant = value;
        range.multiplier = 1;
    }

    private _setTwoConstants(range: CurveRange | null | undefined, min: number, max: number): void {
        if (!range) {
            console.warn('[ConfettiParticleTool] CurveRange отсутствует (TwoConstants)');
            return;
        }
        range.mode = CurveRange.Mode.TwoConstants;
        range.constantMin = min;
        range.constantMax = max;
        range.multiplier = 1;
    }

    private _setCurve(spline: RealCurve, times: number[], values: number[]): void {
        if (!spline) {
            console.warn('[ConfettiParticleTool] RealCurve spline отсутствует');
            return;
        }
        spline.assignSorted(times, values);
    }
}
