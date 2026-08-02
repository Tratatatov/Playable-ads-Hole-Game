import { Node, UIOpacity, tween, Tween } from 'cc';
import { TutorialFinger } from './TutorialFinger';

/**
 * TutorialView — TutorialSprite (∞) + TutorialFinger.
 * Fade обоих через UIOpacity; движение пальца — TutorialFinger.play().
 */
export class TutorialView {
    private _finger: TutorialFinger | null = null;
    private _spriteNode: Node | null = null;
    private _spriteOpacity: UIOpacity | null = null;
    private _spriteFadeTween: Tween<UIOpacity> | null = null;

    constructor(finger: TutorialFinger, spriteNode: Node | null) {
        this._finger = finger;
        this._spriteNode = spriteNode;
        if (spriteNode) {
            this._spriteOpacity =
                spriteNode.getComponent(UIOpacity) ?? spriteNode.addComponent(UIOpacity);
        }
    }

    public get hintActiveSeconds(): number {
        return this._finger?.hintActiveSeconds ?? 5;
    }

    public get fadeDuration(): number {
        return this._finger?.fadeDuration ?? 0.3;
    }

    /** Показать ∞ + палец (fade in) и запустить движение. */
    public show(): void {
        this._finger?.play();
        this._fadeSpriteIn();
        this._finger?.fadeIn();
    }

    /** Скрыть при таче (fade out), движение пальца продолжает крутиться. */
    public fadeOutOnTouch(): void {
        this._fadeSpriteOut();
        this._finger?.fadeOut();
    }

    /** Снова показать после отпускания (fade in). */
    public fadeInOnRelease(): void {
        this._fadeSpriteIn();
        this._finger?.fadeIn();
    }

    /** Окончательно скрыть (конец окна 5с / destroy). */
    public hidePermanent(): void {
        this._fadeSpriteOut(() => {
            if (this._spriteNode) this._spriteNode.active = false;
        });
        this._finger?.fadeOut(() => {
            this._finger?.stopMove();
            if (this._finger?.node) this._finger.node.active = false;
        });
    }

    /** Мгновенное скрытие без анимации (boot / destroy). */
    public hideImmediate(): void {
        this._stopSpriteFade();
        this._finger?.hideImmediate();
        if (this._spriteOpacity) this._spriteOpacity.opacity = 0;
        if (this._spriteNode) this._spriteNode.active = false;
    }

    public stopAnimations(): void {
        this._stopSpriteFade();
        this._finger?.stop();
    }

    private _fadeSpriteIn(): void {
        if (!this._spriteNode || !this._spriteOpacity) return;
        this._stopSpriteFade();
        this._spriteNode.active = true;
        const duration = Math.max(0.01, this.fadeDuration);
        this._spriteFadeTween = tween(this._spriteOpacity)
            .to(duration, { opacity: 255 }, { easing: 'sineOut' })
            .call(() => { this._spriteFadeTween = null; })
            .start();
    }

    private _fadeSpriteOut(onComplete?: () => void): void {
        if (!this._spriteNode || !this._spriteOpacity) {
            if (onComplete) onComplete();
            return;
        }
        this._stopSpriteFade();
        const duration = Math.max(0.01, this.fadeDuration);
        this._spriteFadeTween = tween(this._spriteOpacity)
            .to(duration, { opacity: 0 }, { easing: 'sineIn' })
            .call(() => {
                this._spriteFadeTween = null;
                if (onComplete) onComplete();
            })
            .start();
    }

    private _stopSpriteFade(): void {
        if (this._spriteFadeTween) {
            this._spriteFadeTween.stop();
            this._spriteFadeTween = null;
        }
    }
}
