import { Node, Label, Button, UIOpacity, tween, Vec3 } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export class EndCardView {
    private _panel: Node | null = null;
    private _panelOpacity: UIOpacity | null = null;
    private _finalScoreLabel: Label | null = null;
    private _ctaButton: Button | null = null;
    private _ctaLabel: Label | null = null;

    /** Scratch для анимации появления */
    private readonly _panelFromScale: Vec3 = new Vec3(0.7, 0.7, 0.7);
    private readonly _panelToScale:   Vec3 = new Vec3(1.0, 1.0, 1.0);

    constructor(
        panel: Node,
        panelOpacity: UIOpacity,
        finalScoreLabel: Label,
        ctaButton: Button,
        ctaLabel: Label
    ) {
        this._panel = panel;
        this._panelOpacity = panelOpacity;
        this._finalScoreLabel = finalScoreLabel;
        this._ctaButton = ctaButton;
        this._ctaLabel = ctaLabel;

        this._panelFromScale.set(LEVEL_CONFIG.endCardPopScale, LEVEL_CONFIG.endCardPopScale, LEVEL_CONFIG.endCardPopScale);
        
        if (this._panel) this._panel.active = false;
    }

    public initCtaButton(onClick: () => void, target: any): void {
        if (this._ctaButton) {
            this._ctaButton.node.on(Button.EventType.CLICK, onClick, target);
        }
    }

    public destroyCtaButton(onClick: () => void, target: any): void {
        if (this._ctaButton) {
            this._ctaButton.node.off(Button.EventType.CLICK, onClick, target);
        }
    }

    public show(score: number): void {
        if (!this._panel) return;
        
        // Обновляем счёт
        if (this._finalScoreLabel) {
            this._finalScoreLabel.string = `Score: ${Math.floor(score)}`;
        }
        if (this._ctaLabel) this._ctaLabel.string = 'Play Now!';

        // Анимация появления (pop-in)
        this._panel.active = true;
        this._panel.setScale(this._panelFromScale);
        
        if (this._panelOpacity) this._panelOpacity.opacity = 0;

        tween(this._panel)
            .to(LEVEL_CONFIG.endCardAnimTime, { scale: this._panelToScale }, { easing: 'backOut' })
            .start();
            
        if (this._panelOpacity) {
            tween(this._panelOpacity)
                .to(LEVEL_CONFIG.endCardAnimTime, { opacity: 255 })
                .start();
        }
    }
}
