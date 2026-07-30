/**
 * EndCard — финальная карточка с CTA кнопкой.
 * Появляется в состоянии EndCardState.
 * CTA "Play Now" обязательна и всегда кликабельна (RULES §3.3).
 * Вызывает AdNetworkManager.handleClickout() — не mraid.open() напрямую.
 */

import { _decorator, Component, Node, Label, Button, UIOpacity, tween, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { AdNetworkManager } from '../core/AdNetworkManager';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

const { ccclass, property } = _decorator;

@ccclass('EndCard')
export class EndCard extends Component {
    @property(Node)
    panel: Node = null!;

    @property(UIOpacity)
    panelOpacity: UIOpacity = null!;

    @property(Label)
    finalScoreLabel: Label = null!;

    @property(Button)
    ctaButton: Button = null!;

    @property(Label)
    ctaLabel: Label = null!;

    /** Scratch для анимации появления */
    private readonly _panelFromScale: Vec3 = new Vec3(0.7, 0.7, 0.7);
    private readonly _panelToScale:   Vec3 = new Vec3(1.0, 1.0, 1.0);

    init(): void {
        this._panelFromScale.set(LEVEL_CONFIG.endCardPopScale, LEVEL_CONFIG.endCardPopScale, LEVEL_CONFIG.endCardPopScale);
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);
        if (this.panel) this.panel.active = false;
        // CTA-кнопка подключается здесь
        if (this.ctaButton) {
            this.ctaButton.node.on(Button.EventType.CLICK, this._onCtaClick, this);
        }
    }

    onDestroy(): void {
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
        this.ctaButton?.node.off(Button.EventType.CLICK, this._onCtaClick, this);
    }

    private _onGameEnd = (payload: { score: number }): void => {
        GameStateMachine.transition(GameState.EndCard);
        this._show(payload.score);
    };

    private _show(score: number): void {
        if (!this.panel) return;
        // Обновляем счёт
        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = `Score: ${Math.floor(score)}`;
        }
        if (this.ctaLabel) this.ctaLabel.string = 'Play Now!';

        // Анимация появления (pop-in)
        this.panel.active = true;
        this.panel.setScale(this._panelFromScale);
        
        if (this.panelOpacity) this.panelOpacity.opacity = 0;

        tween(this.panel)
            .to(LEVEL_CONFIG.endCardAnimTime, { scale: this._panelToScale }, { easing: 'backOut' })
            .start();
        if (this.panelOpacity) {
            tween(this.panelOpacity)
                .to(LEVEL_CONFIG.endCardAnimTime, { opacity: 255 })
                .start();
        }
    }

    /** CTA — единственный правильный способ редиректа (RULES §1.3 + §3.3) */
    private _onCtaClick = (): void => {
        AdNetworkManager.handleClickout();
    };
}
