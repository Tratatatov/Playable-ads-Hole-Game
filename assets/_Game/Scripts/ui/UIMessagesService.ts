/**
 * UIMessagesService — показ / скрытие UI-сообщений игроку.
 * Ссылки и параметры анимаций — из UIMessagesConfig.
 *
 * EventBus:
 *   HOLE_SIZE_CHANGED (рост) → showSizeUp
 *   DOOR_OPENED              → showSuccess
 *   GATE_TOUCHED             → showCross
 *
 * TutorialState / EndGameState вызывают show/hide напрямую.
 *
 * Sprites: fade + scale pop-in + float up → hold (autoHideDelay) → fade out → reset.
 * GameEndSprite: slide in и остаётся (без авто-скрытия, без float).
 * Background: изначально выключен (opacity 0); FadeIn при показе GameEnd.
 * Tutorial / TutorialFinger: без авто-скрытия (управляет TutorialState).
 */

import { Node, Sprite, UIOpacity, Vec3, tween, Tween } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { UIMessagesConfig } from './UIMessagesConfig';

export interface IUIMessagesService {
    init(config: UIMessagesConfig): void;
    destroy(): void;

    showCross(): void;
    hideCross(): void;

    showSuccess(): void;
    hideSuccess(): void;

    showSizeUp(): void;
    hideSizeUp(): void;

    showTutorial(): void;
    hideTutorial(): void;

    showTutorialFinger(): void;
    hideTutorialFinger(): void;

    showGameEndSprite(): void;
    hideGameEndSprite(): void;

    /** Мгновенно скрыть всё без анимации. */
    hideAllImmediate(): void;
}

interface FadeSlot {
    node: Node;
    opacity: UIOpacity;
    tween: Tween<UIOpacity> | null;
    scaleTween: Tween<Node> | null;
    posTween: Tween<Node> | null;
    /** Исходный scale из сцены — цель pop-in и сброс после hide. */
    readonly baseScale: Vec3;
    /** Исходная позиция из сцены — старт float и сброс после hide. */
    readonly basePos: Vec3;
    /** Цель float-up (свой Vec3 на слот — без shared scratch). */
    readonly floatTarget: Vec3;
    /** true → после fade-in ждём autoHideDelay и вызываем hide. */
    autoHide: boolean;
}

interface OpacitySlot {
    node: Node;
    opacity: UIOpacity;
    tween: Tween<UIOpacity> | null;
}

class UIMessagesServiceImpl implements IUIMessagesService {
    private _config: UIMessagesConfig | null = null;
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;

    private _cross: FadeSlot | null = null;
    private _success: FadeSlot | null = null;
    private _sizeUp: FadeSlot | null = null;
    private _tutorial: FadeSlot | null = null;
    private _tutorialFinger: FadeSlot | null = null;
    private _background: OpacitySlot | null = null;

    private _gameEndNode: Node | null = null;
    private _gameEndTween: Tween<Node> | null = null;
    private readonly _gameEndStart: Vec3 = new Vec3();
    private readonly _gameEndEnd: Vec3 = new Vec3();
    private readonly _scaleFromScratch: Vec3 = new Vec3();

    init(config: UIMessagesConfig): void {
        if (!config) {
            console.warn('[UIMessagesService] UIMessagesConfig не передан');
            return;
        }

        this._config = config;
        this._lastHoleScale = 1;

        this._cross = this._bindSprite(config.crossSprite, 'Cross', true);
        this._success = this._bindSprite(config.successSprite, 'Success', true);
        this._sizeUp = this._bindSprite(config.sizeUpSprite, 'SizeUp', true);
        this._tutorial = this._bindSprite(config.tutorialSprite, 'Tutorial', false);
        this._tutorialFinger = this._bindSprite(config.tutorialFingerSprite, 'TutorialFinger', false);
        this._background = this._bindBackground(config.backgroundSprite);

        this._gameEndNode = config.gameEndSprite?.node ?? null;
        if (this._gameEndNode) {
            // Стартовая точка = фактическая позиция спрайта в сцене
            const p = this._gameEndNode.position;
            this._gameEndStart.set(p.x, p.y, p.z);
            this._cacheGameEndEnd();
            this._gameEndNode.active = false;
        } else {
            console.warn('[UIMessagesService] gameEndSprite не назначен');
        }

        this.hideAllImmediate();

        if (!this._subscribed) {
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.on(GameEvent.GATE_TOUCHED, this._onGateTouched, this);
            this._subscribed = true;
        }

        console.log('[UIMessagesService] Инициализирован (HOLE_SIZE_CHANGED / DOOR_OPENED / GATE_TOUCHED)');
    }

    destroy(): void {
        if (this._subscribed) {
            EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.off(GameEvent.GATE_TOUCHED, this._onGateTouched, this);
            this._subscribed = false;
        }

        this.hideAllImmediate();
        this._stopBackgroundTween();
        this._config = null;
        this._cross = null;
        this._success = null;
        this._sizeUp = null;
        this._tutorial = null;
        this._tutorialFinger = null;
        this._background = null;
        this._gameEndNode = null;
        this._gameEndTween = null;
        this._lastHoleScale = 1;
    }

    // ── EventBus ───────────────────────────────────────────────────────

    private _onHoleSizeChanged = (payload: { scale: number }): void => {
        if (payload.scale > this._lastHoleScale) {
            this.showSizeUp();
        }
        this._lastHoleScale = payload.scale;
    };

    private _onDoorOpened = (_payload: { type: CollectableType }): void => {
        this.showSuccess();
    };

    private _onGateTouched = (): void => {
        this.showCross();
    };

    // ── Public Show / Hide ─────────────────────────────────────────────

    showCross(): void {
        if (this._cross?.node.active) return;
        this._showFade(this._cross);
    }
    hideCross(): void { this._hideFade(this._cross); }

    showSuccess(): void { this._showFade(this._success); }
    hideSuccess(): void { this._hideFade(this._success); }

    showSizeUp(): void { this._showFade(this._sizeUp); }
    hideSizeUp(): void { this._hideFade(this._sizeUp); }

    showTutorial(): void { this._showFade(this._tutorial); }
    hideTutorial(): void { this._hideFade(this._tutorial); }

    showTutorialFinger(): void { this._showFade(this._tutorialFinger); }
    hideTutorialFinger(): void { this._hideFade(this._tutorialFinger); }

    showGameEndSprite(): void {
        const node = this._gameEndNode;
        const cfg = this._config;
        if (!node || !cfg) return;

        this._stopGameEndTween();
        this._cacheGameEndEnd();

        node.setPosition(this._gameEndStart);
        node.active = true;

        const duration = Math.max(0.01, cfg.gameEndSlideDuration);
        const easing = (cfg.gameEndSlideEasing || 'backOut') as any;

        this._gameEndTween = tween(node)
            .to(duration, { position: this._gameEndEnd }, { easing })
            .call(() => { this._gameEndTween = null; })
            .start();

        this._fadeInBackground();
    }

    hideGameEndSprite(): void {
        const node = this._gameEndNode;
        const cfg = this._config;
        if (!node || !cfg) return;
        if (!node.active) return;

        this._stopGameEndTween();

        const duration = Math.max(0.01, cfg.gameEndHideDuration);
        const easing = (cfg.gameEndHideEasing || 'quadIn') as any;

        this._gameEndTween = tween(node)
            .to(duration, { position: this._gameEndStart }, { easing })
            .call(() => {
                node.active = false;
                this._gameEndTween = null;
            })
            .start();
    }

    hideAllImmediate(): void {
        this._hideFadeImmediate(this._cross);
        this._hideFadeImmediate(this._success);
        this._hideFadeImmediate(this._sizeUp);
        this._hideFadeImmediate(this._tutorial);
        this._hideFadeImmediate(this._tutorialFinger);
        this._hideBackgroundImmediate();

        this._stopGameEndTween();
        if (this._gameEndNode) {
            this._gameEndNode.active = false;
            this._gameEndNode.setPosition(this._gameEndStart);
        }
    }

    // ── Fade helpers ───────────────────────────────────────────────────

    private _bindSprite(sprite: Sprite | null, label: string, autoHide: boolean): FadeSlot | null {
        if (!sprite || !sprite.node) {
            console.warn(`[UIMessagesService] ${label} не назначен`);
            return null;
        }

        const node = sprite.node;
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }

        const s = node.scale;
        const baseScale = new Vec3(s.x, s.y, s.z);
        const p = node.position;
        const basePos = new Vec3(p.x, p.y, p.z);
        const floatTarget = new Vec3(p.x, p.y, p.z);

        node.active = false;
        opacity.opacity = 0;
        node.setScale(baseScale);
        node.setPosition(basePos);

        return { node, opacity, tween: null, scaleTween: null, posTween: null, baseScale, basePos, floatTarget, autoHide };
    }

    /** Background: изначально выключен, opacity 0. */
    private _bindBackground(sprite: Sprite | null): OpacitySlot | null {
        if (!sprite || !sprite.node) {
            console.warn('[UIMessagesService] Background не назначен');
            return null;
        }

        const node = sprite.node;
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }

        node.active = false;
        opacity.opacity = 0;

        return { node, opacity, tween: null };
    }

    private _fadeInBackground(): void {
        const slot = this._background;
        const cfg = this._config;
        if (!slot || !cfg) return;

        this._stopBackgroundTween();

        const hideOp = cfg.fadeHideOpacity;
        const showOp = cfg.fadeShowOpacity;
        const duration = Math.max(0.01, cfg.fadeInDuration);
        const easing = (cfg.fadeInEasing || 'sineOut') as any;

        slot.opacity.opacity = hideOp;
        slot.node.active = true;

        slot.tween = tween(slot.opacity)
            .to(duration, { opacity: showOp }, { easing })
            .call(() => { slot.tween = null; })
            .start();
    }

    private _hideBackgroundImmediate(): void {
        const slot = this._background;
        if (!slot) return;
        this._stopBackgroundTween();
        slot.opacity.opacity = 0;
        slot.node.active = false;
    }

    private _stopBackgroundTween(): void {
        const slot = this._background;
        if (!slot?.tween) return;
        slot.tween.stop();
        slot.tween = null;
    }

    private _showFade(slot: FadeSlot | null): void {
        const cfg = this._config;
        if (!slot || !cfg) return;

        this._stopFadeTweens(slot);

        const hideOp = cfg.fadeHideOpacity;
        const showOp = cfg.fadeShowOpacity;
        const duration = Math.max(0.01, cfg.fadeInDuration);
        const fadeEasing = (cfg.fadeInEasing || 'sineOut') as any;
        const scaleEasing = (cfg.scaleInEasing || 'backOut') as any;
        const fromMul = Math.max(0, cfg.scaleFrom);

        this._scaleFromScratch.set(
            slot.baseScale.x * fromMul,
            slot.baseScale.y * fromMul,
            slot.baseScale.z * fromMul
        );

        slot.opacity.opacity = hideOp;
        slot.node.setScale(this._scaleFromScratch);
        slot.node.setPosition(slot.basePos);
        slot.node.active = true;

        slot.scaleTween = tween(slot.node)
            .to(duration, { scale: slot.baseScale }, { easing: scaleEasing })
            .call(() => { slot.scaleTween = null; })
            .start();

        this._startFloatUp(slot, duration);

        const fadeIn = tween(slot.opacity)
            .to(duration, { opacity: showOp }, { easing: fadeEasing });

        if (slot.autoHide) {
            const hold = Math.max(0, cfg.autoHideDelay);
            slot.tween = fadeIn
                .delay(hold)
                .call(() => {
                    slot.tween = null;
                    this._hideFade(slot);
                })
                .start();
        } else {
            slot.tween = fadeIn
                .call(() => { slot.tween = null; })
                .start();
        }
    }

    /** Плавный подъём от basePos вверх на messageFloatDistance (не для End). */
    private _startFloatUp(slot: FadeSlot, fadeInDuration: number): void {
        const cfg = this._config;
        if (!cfg) return;

        const dist = cfg.messageFloatDistance;
        if (dist === 0) return;

        const hold = slot.autoHide ? Math.max(0, cfg.autoHideDelay) : 0;
        const floatDur = Math.max(0.01, fadeInDuration + hold + Math.max(0.01, cfg.fadeOutDuration));
        const easing = (cfg.messageFloatEasing || 'sineOut') as any;

        slot.floatTarget.set(
            slot.basePos.x,
            slot.basePos.y + dist,
            slot.basePos.z
        );

        slot.posTween = tween(slot.node)
            .to(floatDur, { position: slot.floatTarget }, { easing })
            .call(() => { slot.posTween = null; })
            .start();
    }

    private _hideFade(slot: FadeSlot | null): void {
        const cfg = this._config;
        if (!slot || !cfg) return;
        if (!slot.node.active) return;

        // Не стопаем posTween — пусть продолжает уплывать вверх во время fade-out
        if (slot.tween) {
            slot.tween.stop();
            slot.tween = null;
        }
        if (slot.scaleTween) {
            slot.scaleTween.stop();
            slot.scaleTween = null;
        }

        const hideOp = cfg.fadeHideOpacity;
        const duration = Math.max(0.01, cfg.fadeOutDuration);
        const easing = (cfg.fadeOutEasing || 'sineIn') as any;

        slot.tween = tween(slot.opacity)
            .to(duration, { opacity: hideOp }, { easing })
            .call(() => {
                if (slot.posTween) {
                    slot.posTween.stop();
                    slot.posTween = null;
                }
                slot.node.active = false;
                slot.node.setScale(slot.baseScale);
                slot.node.setPosition(slot.basePos);
                slot.tween = null;
            })
            .start();
    }

    private _hideFadeImmediate(slot: FadeSlot | null): void {
        if (!slot) return;
        this._stopFadeTweens(slot);
        const hideOp = this._config?.fadeHideOpacity ?? 0;
        slot.opacity.opacity = hideOp;
        slot.node.setScale(slot.baseScale);
        slot.node.setPosition(slot.basePos);
        slot.node.active = false;
    }

    private _stopFadeTweens(slot: FadeSlot): void {
        if (slot.tween) {
            slot.tween.stop();
            slot.tween = null;
        }
        if (slot.scaleTween) {
            slot.scaleTween.stop();
            slot.scaleTween = null;
        }
        if (slot.posTween) {
            slot.posTween.stop();
            slot.posTween = null;
        }
    }

    // ── GameEnd helpers ────────────────────────────────────────────────

    private _cacheGameEndEnd(): void {
        const cfg = this._config;
        if (!cfg) return;

        const endNode = cfg.gameEndPanelEndPoint;
        if (endNode) {
            const p = endNode.position;
            this._gameEndEnd.set(p.x, p.y, p.z);
        } else {
            console.warn('[UIMessagesService] gameEndPanelEndPoint не назначен');
            this._gameEndEnd.set(this._gameEndStart);
        }
    }

    private _stopGameEndTween(): void {
        if (this._gameEndTween) {
            this._gameEndTween.stop();
            this._gameEndTween = null;
        }
    }
}

export let UIMessagesService: IUIMessagesService = new UIMessagesServiceImpl();
