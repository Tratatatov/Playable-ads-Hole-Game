/**
 * TutorialFinger — палец туториала, водит по знаку ∞ (лемниската Бернулли).
 * Вешается на ноду пальца; движение + fade через UIOpacity.
 * Центр пути = позиция ноды в момент play() + centerX/Y.
 */

import { _decorator, Component, UIOpacity, Vec3, tween, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TutorialFinger')
export class TutorialFinger extends Component {
    @property({ tooltip: 'Длительность одного полного круга по ∞ (сек)' })
    duration: number = 2.5;

    @property({ tooltip: 'Полуось ∞ по X (половина ширины)' })
    radiusX: number = 500;

    @property({ tooltip: 'Полуось ∞ по Y (половина высоты)' })
    radiusY: number = 120;

    @property({ tooltip: 'Сдвиг центра пути по X от позиции ноды при play()' })
    centerX: number = 0;

    @property({ tooltip: 'Сдвиг центра пути по Y от позиции ноды при play()' })
    centerY: number = 0;

    @property({ tooltip: 'Смещение tip X: node = path - tip (кончик по линии)' })
    tipOffsetX: number = 0;

    @property({ tooltip: 'Смещение tip Y: node = path - tip (кончик по линии)' })
    tipOffsetY: number = 40;

    @property({ tooltip: 'Длительность fade in/out (сек)' })
    fadeDuration: number = 0.3;

    @property({ tooltip: 'Сколько секунд действует правило: тач → скрыть, отпустил → показать' })
    hintActiveSeconds: number = 5;

    private readonly _progress: { p: number } = { p: 0 };
    private readonly _pos: Vec3 = new Vec3();
    private _moveTween: Tween<{ p: number }> | null = null;
    private _fadeTween: Tween<UIOpacity> | null = null;
    private _opacity: UIOpacity | null = null;
    private _pathCenterX: number = 0;
    private _pathCenterY: number = 0;

    /** Запустить loop по ∞. Повторный вызов перезапускает. */
    public play(): void {
        if (!this.node || !this.node.isValid) return;

        this.stopMove();

        const start = this.node.position;
        this._pathCenterX = start.x + this.centerX;
        this._pathCenterY = start.y + this.centerY;

        const duration = Math.max(0.01, this.duration);
        this._progress.p = 0;
        this._applyPos(0);

        this._moveTween = tween(this._progress)
            .to(duration, { p: 1 }, {
                easing: 'linear',
                onUpdate: (_target, ratio) => {
                    this._applyPos(typeof ratio === 'number' ? ratio : this._progress.p);
                },
            })
            .repeatForever()
            .start();
    }

    /** Остановить движение по ∞. */
    public stopMove(): void {
        if (this._moveTween) {
            this._moveTween.stop();
            this._moveTween = null;
        }
        this._progress.p = 0;
    }

    /** Плавное появление. */
    public fadeIn(onComplete?: () => void): void {
        const opacity = this._ensureOpacity();
        this._stopFade();
        this.node.active = true;

        const duration = Math.max(0.01, this.fadeDuration);
        this._fadeTween = tween(opacity)
            .to(duration, { opacity: 255 }, { easing: 'sineOut' })
            .call(() => {
                this._fadeTween = null;
                if (onComplete) onComplete();
            })
            .start();
    }

    /** Плавное затухание. Нода остаётся active (движение может продолжаться). */
    public fadeOut(onComplete?: () => void): void {
        const opacity = this._ensureOpacity();
        this._stopFade();

        const duration = Math.max(0.01, this.fadeDuration);
        this._fadeTween = tween(opacity)
            .to(duration, { opacity: 0 }, { easing: 'sineIn' })
            .call(() => {
                this._fadeTween = null;
                if (onComplete) onComplete();
            })
            .start();
    }

    /** Мгновенно скрыть (boot / destroy). */
    public hideImmediate(): void {
        this._stopFade();
        this.stopMove();
        const opacity = this._ensureOpacity();
        opacity.opacity = 0;
        this.node.active = false;
    }

    /** Полная остановка (движение + fade). */
    public stop(): void {
        this._stopFade();
        this.stopMove();
    }

    private _ensureOpacity(): UIOpacity {
        if (this._opacity && this._opacity.isValid) return this._opacity;
        let opacity = this.node.getComponent(UIOpacity);
        if (!opacity) opacity = this.node.addComponent(UIOpacity);
        this._opacity = opacity;
        return opacity;
    }

    private _stopFade(): void {
        if (this._fadeTween) {
            this._fadeTween.stop();
            this._fadeTween = null;
        }
    }

    /**
     * Лемниската Бернулли: x = a·cos(t)/(1+sin²t), y = a·sin(t)·cos(t)/(1+sin²t).
     * t = p · 2π.
     */
    private _applyPos(p: number): void {
        if (!this.node || !this.node.isValid) return;

        const t = p * Math.PI * 2;
        const sinT = Math.sin(t);
        const cosT = Math.cos(t);
        const denom = 1 + sinT * sinT;

        const rx = Math.max(0.01, this.radiusX);
        const ry = Math.max(0.01, this.radiusY);
        const pathX = this._pathCenterX + rx * cosT / denom;
        const pathY = this._pathCenterY + ry * sinT * cosT / denom;

        this._pos.set(pathX - this.tipOffsetX, pathY - this.tipOffsetY, 0);
        this.node.setPosition(this._pos);
    }
}
