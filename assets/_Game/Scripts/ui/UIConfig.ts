import { _decorator, Component, Label, Node, Button, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

/**
 * UIConfig — единый контейнер ссылок на UI для всех фаз игрового цикла.
 * TutorialState / GameplayState / EndGameState берут ноды отсюда через Bootstrap.
 */
@ccclass('UIConfig')
export class UIConfig extends Component {

    // ── TutorialState ──────────────────────────────────────────────────
    @property({ type: Node, group: { name: 'TutorialState', id: '1' }, tooltip: 'Анимированный палец туториала' })
    tutorialFingerNode: Node = null!;

    @property({ type: Node, group: { name: 'TutorialState', id: '1' }, tooltip: 'Корневая панель туториала' })
    tutorialPanel: Node = null!;

    @property({ type: UIOpacity, group: { name: 'TutorialState', id: '1' }, tooltip: 'UIOpacity панели туториала (fade-out)' })
    tutorialPanelOpacity: UIOpacity = null!;

    // ── GameplayState ──────────────────────────────────────────────────
    @property({ type: Label, group: { name: 'GameplayState', id: '2' }, tooltip: 'Label обратного таймера (формат M:SS)' })
    hudTimerLabel: Label = null!;

    @property({ type: Label, group: { name: 'GameplayState', id: '2' } })
    remainingBlueLabel: Label = null!;

    @property({ type: Label, group: { name: 'GameplayState', id: '2' } })
    remainingRedLabel: Label = null!;

    @property({ type: Label, group: { name: 'GameplayState', id: '2' } })
    remainingGreenLabel: Label = null!;

    @property({ type: Label, group: { name: 'GameplayState', id: '2' } })
    remainingTealLabel: Label = null!;

    // ── EndGameState ───────────────────────────────────────────────────
    @property({ type: Node, group: { name: 'EndGameState', id: '3' }, tooltip: 'Корневая панель EndGame / EndCard' })
    endCardPanel: Node = null!;

    @property({ type: UIOpacity, group: { name: 'EndGameState', id: '3' } })
    endCardOpacity: UIOpacity = null!;

    @property({ type: Button, group: { name: 'EndGameState', id: '3' }, tooltip: 'CTA кнопка (Install / Play Now)' })
    endCardCtaButton: Button = null!;

    @property({ type: Label, group: { name: 'EndGameState', id: '3' } })
    endCardCtaLabel: Label = null!;
}
