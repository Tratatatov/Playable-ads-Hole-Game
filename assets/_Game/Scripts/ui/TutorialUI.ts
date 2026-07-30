/**
 * TutorialUI — оверлей туториала.
 * Показывает анимацию пальца и текст "Drag to move".
 * При первом FIRST_TOUCH переходит в Gameplay (RULES §3.1).
 * Адаптивен к portrait/landscape (RULES §3.2).
 */

import { _decorator, Component, Node, Label, UIOpacity, tween, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

const { ccclass, property } = _decorator;

@ccclass('TutorialUI')
export class TutorialUI extends Component {
    @property(Node)
    fingerNode: Node = null!;

    @property(Label)
    hintLabel: Label = null!;

    @property(Node)
    panel: Node = null!;

    @property(UIOpacity)
    panelOpacity: UIOpacity = null!;

    /** Scratch для анимации пальца */
    private readonly _fingerFrom: Vec3 = new Vec3(-30, 0, 0);
    private readonly _fingerTo:   Vec3 = new Vec3( 30, 0, 0);
    private _fingerTween: ReturnType<typeof tween> | null = null;

    init(): void {
        this._fingerFrom.set(-LEVEL_CONFIG.tutorialFingerRange, 0, 0);
        this._fingerTo.set(LEVEL_CONFIG.tutorialFingerRange, 0, 0);
        EventBus.on(GameEvent.GAME_START, this._hide, this);
        this._startFingerAnim();
    }

    onDestroy(): void {
        EventBus.off(GameEvent.GAME_START, this._hide, this);
        this._fingerTween?.stop();
    }

    show(): void {
        if (this.panel) this.panel.active = true;
        this._startFingerAnim();
    }

    private _startFingerAnim(): void {
        if (!this.fingerNode) return;
        this._fingerTween?.stop();
        this.fingerNode.setPosition(this._fingerFrom);
        this._fingerTween = tween(this.fingerNode)
            .to(LEVEL_CONFIG.tutorialAnimTime, { position: this._fingerTo  }, { easing: 'sineInOut' })
            .to(LEVEL_CONFIG.tutorialAnimTime, { position: this._fingerFrom }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private _hide = (): void => {
        this._fingerTween?.stop();
        if (!this.panel) return;
        
        if (this.panelOpacity) {
            tween(this.panelOpacity)
                .to(0.25, { opacity: 0 })
                .call(() => { this.panel.active = false; })
                .start();
        } else {
            this.panel.active = false;
        }
    }
}
