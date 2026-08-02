/**
 * UIMessagesConfig — ссылки и параметры анимаций UI-сообщений.
 * Назначается в Inspector на GameBootstrap.
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, ParticleSystem, CCFloat, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('UIMessagesConfig')
export class UIMessagesConfig extends Component {

    // ── Sprites ────────────────────────────────────────────────────────
    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Иконка Cross (провал / ошибка)' })
    crossSprite: Sprite = null!;

    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Иконка Success' })
    successSprite: Sprite = null!;

    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Иконка Size Up' })
    sizeUpSprite: Sprite = null!;

    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Спрайт туториала' })
    tutorialSprite: Sprite = null!;

    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Палец туториала' })
    tutorialFingerSprite: Sprite = null!;

    @property({ type: Sprite, group: { name: 'Sprites', id: '1' }, tooltip: 'Фон (FadeIn при конце игры)' })
    backgroundSprite: Sprite = null!;

    // ── Perfect Message ────────────────────────────────────────────────
    @property({
        type: Sprite,
        group: { name: 'Perfect Message', id: '1b' },
        tooltip: 'Спрайт Perfect / Nice / Great (случайная текстура)',
    })
    perfectMessageSprite: Sprite = null!;

    @property({
        type: [SpriteFrame],
        group: { name: 'Perfect Message', id: '1b' },
        tooltip: 'Пул текстур для PerfectMessage (случайный выбор при показе)',
    })
    perfectMessageTextures: SpriteFrame[] = [];

    @property({
        type: ParticleSystem,
        group: { name: 'Perfect Message', id: '1b' },
        tooltip: 'Партиклы при PerfectMessage (EventBus → ParticleService)',
    })
    perfectMessageParticles: ParticleSystem = null!;

    @property({
        type: CCInteger,
        group: { name: 'Perfect Message', id: '1b' },
        tooltip: 'Мин. число собранных до следующего PerfectMessage',
        min: 1,
    })
    perfectMessageIntervalMin: number = 20;

    @property({
        type: CCInteger,
        group: { name: 'Perfect Message', id: '1b' },
        tooltip: 'Макс. число собранных до следующего PerfectMessage',
        min: 1,
    })
    perfectMessageIntervalMax: number = 40;

    // ── Game End Sprite ────────────────────────────────────────────────
    @property({ type: Sprite, group: { name: 'Game End Sprite', id: '2' }, tooltip: 'Спрайт конца игры (выезжает снизу)' })
    gameEndSprite: Sprite = null!;

    @property({
        type: Node,
        group: { name: 'Game End Sprite', id: '2' },
        tooltip: 'Конечная позиция спрайта (позиция Node → куда выедет)',
    })
    gameEndPanelEndPoint: Node = null!;

    @property({
        type: CCFloat,
        group: { name: 'Game End Sprite', id: '2' },
        tooltip: 'Длительность выезда спрайта (сек)',
        min: 0.01,
    })
    gameEndSlideDuration: number = 0.5;

    @property({
        group: { name: 'Game End Sprite', id: '2' },
        tooltip: 'Easing выезда (backOut, quadOut, sineOut…)',
    })
    gameEndSlideEasing: string = 'backOut';

    @property({
        type: CCFloat,
        group: { name: 'Game End Sprite', id: '2' },
        tooltip: 'Длительность уезда спрайта вниз (сек)',
        min: 0.01,
    })
    gameEndHideDuration: number = 0.35;

    @property({
        group: { name: 'Game End Sprite', id: '2' },
        tooltip: 'Easing уезда вниз',
    })
    gameEndHideEasing: string = 'quadIn';

    // ── Fade (sprites) ─────────────────────────────────────────────────
    @property({
        type: CCFloat,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Сколько держать сообщение видимым до авто-скрытия (сек)',
        min: 0,
    })
    autoHideDelay: number = 1.2;

    @property({
        type: CCFloat,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Длительность появления (сек)',
        min: 0.01,
    })
    fadeInDuration: number = 0.3;

    @property({
        type: CCFloat,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Длительность скрытия (сек)',
        min: 0.01,
    })
    fadeOutDuration: number = 0.25;

    @property({
        group: { name: 'Fade', id: '3' },
        tooltip: 'Easing появления',
    })
    fadeInEasing: string = 'sineOut';

    @property({
        group: { name: 'Fade', id: '3' },
        tooltip: 'Easing скрытия',
    })
    fadeOutEasing: string = 'sineIn';

    @property({
        type: CCInteger,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Прозрачность при показе (0–255)',
        range: [0, 255, 1],
        slide: true,
    })
    fadeShowOpacity: number = 255;

    @property({
        type: CCInteger,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Прозрачность при скрытии (0–255)',
        range: [0, 255, 1],
        slide: true,
    })
    fadeHideOpacity: number = 0;

    @property({
        type: CCFloat,
        group: { name: 'Fade', id: '3' },
        tooltip: 'Начальный scale при появлении (0 = из нуля, <1 = увеличение)',
        min: 0,
    })
    scaleFrom: number = 0;

    @property({
        group: { name: 'Fade', id: '3' },
        tooltip: 'Easing увеличения при появлении',
    })
    scaleInEasing: string = 'backOut';

    @property({
        type: CCFloat,
        group: { name: 'Fade', id: '3' },
        tooltip: 'На сколько пикселей вверх уплывает сообщение за время показа (кроме End)',
    })
    messageFloatDistance: number = 80;

    @property({
        group: { name: 'Fade', id: '3' },
        tooltip: 'Easing движения вверх',
    })
    messageFloatEasing: string = 'sineOut';

    /** Деактивирует все связанные UI-объекты. Вызывается Bootstrap. */
    init(): void {
        this._deactivateSprite(this.crossSprite);
        this._deactivateSprite(this.successSprite);
        this._deactivateSprite(this.sizeUpSprite);
        this._deactivateSprite(this.perfectMessageSprite);
        this._deactivateSprite(this.tutorialSprite);
        this._deactivateSprite(this.tutorialFingerSprite);
        this._deactivateSprite(this.gameEndSprite);
        if (this.gameEndPanelEndPoint) {
            this.gameEndPanelEndPoint.active = false;
        }
        if (this.perfectMessageParticles?.isValid) {
            this.perfectMessageParticles.playOnAwake = false;
            this.perfectMessageParticles.stop();
            this.perfectMessageParticles.clear();
        }
    }

    private _deactivateSprite(sprite: Sprite | null): void {
        if (sprite?.node) {
            sprite.node.active = false;
        }
    }
}
