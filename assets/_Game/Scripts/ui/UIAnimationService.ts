/**
 * UIAnimationService — анимации UI-карточек цветов.
 * Ссылки и параметры — из UIConfig (Card: IconSprite + CheckSprite).
 *
 * EventBus:
 *   ITEM_COLLECTED   → elastic punch IconSprite
 *   TYPE_*_CLEARED   → activate CheckSprite + elastic grow 0 → base
 *
 * Punch: пока играет — новые игнорятся, если cardAnimAllowInterrupt = false.
 */

import { Vec3 } from 'cc';
import { EventBus, GameEvent, EventPayloadMap } from '../core/EventBus';
import { TweenService } from '../core/TweenService';
import { CollectableType } from '../gameplay/Collectable';
import { Card } from './Card';
import { UIConfig } from './UIConfig';

export interface IUIAnimationService {
    init(config: UIConfig): void;
    destroy(): void;
}

class UIAnimationServiceImpl implements IUIAnimationService {
    private _config: UIConfig | null = null;
    private _subscribed: boolean = false;

    private readonly _checkBaseBlue: Vec3 = new Vec3(1, 1, 1);
    private readonly _checkBaseRed: Vec3 = new Vec3(1, 1, 1);
    private readonly _checkBaseGreen: Vec3 = new Vec3(1, 1, 1);
    private readonly _checkBaseTeal: Vec3 = new Vec3(1, 1, 1);

    init(config: UIConfig): void {
        this._config = config;
        this._cacheAndHideChecks();

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            EventBus.on(GameEvent.TYPE_BLUE_CLEARED, this._onBlueCleared, this);
            EventBus.on(GameEvent.TYPE_RED_CLEARED, this._onRedCleared, this);
            EventBus.on(GameEvent.TYPE_GREEN_CLEARED, this._onGreenCleared, this);
            EventBus.on(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
            this._subscribed = true;
        }

        console.log('[UIAnimationService] Инициализирован (collect punch + check grow)');
    }

    destroy(): void {
        TweenService.stopUiScaleElastic();
        TweenService.stopUiScaleGrowElastic();

        if (this._subscribed) {
            EventBus.off(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            EventBus.off(GameEvent.TYPE_BLUE_CLEARED, this._onBlueCleared, this);
            EventBus.off(GameEvent.TYPE_RED_CLEARED, this._onRedCleared, this);
            EventBus.off(GameEvent.TYPE_GREEN_CLEARED, this._onGreenCleared, this);
            EventBus.off(GameEvent.TYPE_TEAL_CLEARED, this._onTealCleared, this);
            this._subscribed = false;
        }
        this._config = null;
    }

    private _onItemCollected = (payload: EventPayloadMap[GameEvent.ITEM_COLLECTED]): void => {
        const config = this._config;
        if (!config) return;

        const card = this._cardForType(payload.type);
        const icon = card?.iconSprite;
        if (!icon || !icon.node || !icon.node.isValid) return;

        if (TweenService.isUiScaleElasticPlaying()) {
            if (!config.cardAnimAllowInterrupt) return;
        }

        TweenService.uiScaleElastic(icon.node, {
            duration: config.cardAnimDuration,
            amplitude: config.cardAnimAmplitude,
            period: config.cardAnimPeriod,
            punchScale: config.cardAnimPunchScale,
        });
    };

    private _onBlueCleared = (): void => {
        this._playCheck(CollectableType.Blue);
    };

    private _onRedCleared = (): void => {
        this._playCheck(CollectableType.Red);
    };

    private _onGreenCleared = (): void => {
        this._playCheck(CollectableType.Green);
    };

    private _onTealCleared = (): void => {
        this._playCheck(CollectableType.Teal);
    };

    private _playCheck(type: CollectableType): void {
        const config = this._config;
        if (!config) return;

        const card = this._cardForType(type);
        const check = card?.checkSprite;
        if (!check || !check.node || !check.node.isValid) return;

        const checkNode = check.node;
        const target = this._checkBaseForType(type);

        checkNode.active = true;
        TweenService.uiScaleGrowElastic(checkNode, target, {
            duration: config.checkAnimDuration,
            amplitude: config.checkAnimAmplitude,
            period: config.checkAnimPeriod,
        });
    }

    private _cacheAndHideChecks(): void {
        const config = this._config;
        if (!config) return;

        this._cacheHide(config.blueCard, this._checkBaseBlue);
        this._cacheHide(config.redCard, this._checkBaseRed);
        this._cacheHide(config.greenCard, this._checkBaseGreen);
        this._cacheHide(config.tealCard, this._checkBaseTeal);
    }

    private _cacheHide(card: Card | null, outBase: Vec3): void {
        if (!card?.checkSprite?.node) return;
        const n = card.checkSprite.node;
        outBase.set(n.scale);
        if (outBase.x === 0 && outBase.y === 0 && outBase.z === 0) {
            outBase.set(1, 1, 1);
        }
        n.active = false;
    }

    private _checkBaseForType(type: CollectableType): Readonly<Vec3> {
        switch (type) {
            case CollectableType.Blue:  return this._checkBaseBlue;
            case CollectableType.Red:   return this._checkBaseRed;
            case CollectableType.Green: return this._checkBaseGreen;
            case CollectableType.Teal:  return this._checkBaseTeal;
            default: return this._checkBaseBlue;
        }
    }

    private _cardForType(type: CollectableType): Card | null {
        const config = this._config;
        if (!config) return null;

        switch (type) {
            case CollectableType.Blue:  return config.blueCard;
            case CollectableType.Red:   return config.redCard;
            case CollectableType.Teal:  return config.tealCard;
            case CollectableType.Green: return config.greenCard;
            default: return null;
        }
    }
}

export let UIAnimationService: IUIAnimationService = new UIAnimationServiceImpl();
