import { _decorator, Component, Label, Node, Button, UIOpacity, CCFloat } from 'cc';
import { Card } from './Card';
import { TutorialFinger } from './TutorialFinger';
const { ccclass, property } = _decorator;

/**
 * UIConfig — единый контейнер ссылок на UI для всех фаз игрового цикла.
 * TutorialState / GameplayState / EndGameState берут ноды отсюда через Bootstrap.
 */
@ccclass('UIConfig')
export class UIConfig extends Component {

    // ── TutorialState ──────────────────────────────────────────────────
    @property({ type: TutorialFinger, group: { name: 'TutorialState', id: '1' }, tooltip: 'Компонент TutorialFinger на ноде пальца' })
    tutorialFinger: TutorialFinger = null!;

    @property({ type: Node, group: { name: 'TutorialState', id: '1' }, tooltip: 'Нода пальца (если TutorialFinger не назначен — возьмём/добавим компонент с неё)' })
    tutorialFingerNode: Node = null!;

    @property({ type: Node, group: { name: 'TutorialState', id: '1' }, tooltip: 'Нода TutorialSprite (∞). Fade через UIOpacity' })
    tutorialPanel: Node = null!;

    @property({ type: UIOpacity, group: { name: 'TutorialState', id: '1' }, tooltip: '(Устарело) UIOpacity панели — View сам берёт/создаёт UIOpacity' })
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

    // ── Color Cards (UIAnimationService) ───────────────────────────────
    @property({ type: Card, group: { name: 'Color Cards', id: '4' }, tooltip: 'UI-карточка Blue' })
    blueCard: Card = null!;

    @property({ type: Card, group: { name: 'Color Cards', id: '4' }, tooltip: 'UI-карточка Red' })
    redCard: Card = null!;

    @property({ type: Card, group: { name: 'Color Cards', id: '4' }, tooltip: 'UI-карточка Teal' })
    tealCard: Card = null!;

    @property({ type: Card, group: { name: 'Color Cards', id: '4' }, tooltip: 'UI-карточка Green' })
    greenCard: Card = null!;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Длительность elastic punch карточки (сек)',
        min: 0.01,
    })
    cardAnimDuration: number = 0.45;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Сила overshoot пружины punch (≥1)',
        min: 1,
    })
    cardAnimAmplitude: number = 1.35;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Период колебаний пружины punch (0.3–0.5)',
        min: 0.05,
    })
    cardAnimPeriod: number = 0.4;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Стартовый scale punch относительно base (1.25 = +25%)',
        min: 0.01,
    })
    cardAnimPunchScale: number = 1.25;

    @property({
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Если вкл. — новый collect прерывает текущий punch. Если выкл. — пока играет, новые игнорятся',
    })
    cardAnimAllowInterrupt: boolean = false;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Длительность elastic роста CheckSprite (сек)',
        min: 0.01,
    })
    checkAnimDuration: number = 0.5;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Сила overshoot пружины CheckSprite (≥1)',
        min: 1,
    })
    checkAnimAmplitude: number = 1.35;

    @property({
        type: CCFloat,
        group: { name: 'Color Cards', id: '4' },
        tooltip: 'Период колебаний пружины CheckSprite (0.3–0.5)',
        min: 0.05,
    })
    checkAnimPeriod: number = 0.4;

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
