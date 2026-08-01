import { _decorator, Component, Label, Node, Button, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('UIConfig')
export class UIConfig extends Component {
    
    // ── Remaining Counters ──────────────────────────────────────────────
    @property({ type: Label, group: { name: 'Remaining Counters', id: '1' } })
    remainingBlueLabel: Label = null!;

    @property({ type: Label, group: { name: 'Remaining Counters', id: '1' } })
    remainingRedLabel: Label = null!;

    @property({ type: Label, group: { name: 'Remaining Counters', id: '1' } })
    remainingGreenLabel: Label = null!;

    @property({ type: Label, group: { name: 'Remaining Counters', id: '1' } })
    remainingTurquoiseLabel: Label = null!;

    // ── HUD Settings ───────────────────────────────────────────────────
    @property({ type: Label, group: { name: 'HUD Settings', id: '2' } })
    hudScoreLabel: Label = null!;

    @property({ type: Label, group: { name: 'HUD Settings', id: '2' } })
    hudTimerLabel: Label = null!;

    // ── Tutorial Settings ──────────────────────────────────────────────
    @property({ type: Node, group: { name: 'Tutorial Settings', id: '3' } })
    tutorialFingerNode: Node = null!;

    @property({ type: Label, group: { name: 'Tutorial Settings', id: '3' } })
    tutorialHintLabel: Label = null!;

    @property({ type: Node, group: { name: 'Tutorial Settings', id: '3' } })
    tutorialPanel: Node = null!;

    @property({ type: UIOpacity, group: { name: 'Tutorial Settings', id: '3' } })
    tutorialPanelOpacity: UIOpacity = null!;

    // ── EndCard Settings ───────────────────────────────────────────────
    @property({ type: Node, group: { name: 'EndCard Settings', id: '4' } })
    endCardPanel: Node = null!;

    @property({ type: UIOpacity, group: { name: 'EndCard Settings', id: '4' } })
    endCardOpacity: UIOpacity = null!;

    @property({ type: Label, group: { name: 'EndCard Settings', id: '4' } })
    endCardFinalScoreLabel: Label = null!;

    @property({ type: Button, group: { name: 'EndCard Settings', id: '4' } })
    endCardCtaButton: Button = null!;

    @property({ type: Label, group: { name: 'EndCard Settings', id: '4' } })
    endCardCtaLabel: Label = null!;
}
