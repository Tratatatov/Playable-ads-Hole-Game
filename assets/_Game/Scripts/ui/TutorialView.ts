import { Node, Label, UIOpacity, tween, Vec3 } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export class TutorialView {
    private _fingerNode: Node | null = null;
    private _hintLabel: Label | null = null;
    private _panel: Node | null = null;
    private _panelOpacity: UIOpacity | null = null;

    /** Scratch для анимации пальца */
    private readonly _fingerFrom: Vec3 = new Vec3(-30, 0, 0);
    private readonly _fingerTo:   Vec3 = new Vec3( 30, 0, 0);
    private _fingerTween: ReturnType<typeof tween> | null = null;

    constructor(fingerNode: Node, hintLabel: Label, panel: Node, panelOpacity: UIOpacity) {
        this._fingerNode = fingerNode;
        this._hintLabel = hintLabel;
        this._panel = panel;
        this._panelOpacity = panelOpacity;
        
        this._fingerFrom.set(-LEVEL_CONFIG.tutorialFingerRange, 0, 0);
        this._fingerTo.set(LEVEL_CONFIG.tutorialFingerRange, 0, 0);
    }

    public show(): void {
        if (this._panel) this._panel.active = true;
        this._startFingerAnim();
    }

    public hide(): void {
        this._fingerTween?.stop();
        if (!this._panel) return;
        
        if (this._panelOpacity) {
            tween(this._panelOpacity)
                .to(0.25, { opacity: 0 })
                .call(() => { if (this._panel) this._panel.active = false; })
                .start();
        } else {
            this._panel.active = false;
        }
    }

    public stopAnimations(): void {
        this._fingerTween?.stop();
    }

    private _startFingerAnim(): void {
        if (!this._fingerNode) return;
        this._fingerTween?.stop();
        this._fingerNode.setPosition(this._fingerFrom);
        this._fingerTween = tween(this._fingerNode)
            .to(LEVEL_CONFIG.tutorialAnimTime, { position: this._fingerTo  }, { easing: 'sineInOut' })
            .to(LEVEL_CONFIG.tutorialAnimTime, { position: this._fingerFrom }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
