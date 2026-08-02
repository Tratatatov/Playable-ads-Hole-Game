/**
 * ParticleService — одноразовый запуск VFX на сцене.
 * Ссылки на ParticleSystem берутся из LevelConfig (узлы уже на сцене)
 * и UIMessagesConfig.perfectMessageParticles (через init).
 * Подписки только через EventBus (не прямые вызовы из геймплея).
 *
 *   DOOR_OPENED         → Confetti
 *   HOLE_SIZE_CHANGED   → все particleSparkles (только при росте scale)
 *   PERFECT_MESSAGE     → PerfectMessage particles
 */

import { ParticleSystem } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IParticleService {
    init(perfectMessageParticles?: ParticleSystem | null): void;
    destroy(): void;
    playConfetti(): void;
    playSparkles(): void;
    playPerfectMessage(): void;
}

class ParticleServiceImpl implements IParticleService {
    private _confetti: ParticleSystem | null = null;
    private _sparkles: ParticleSystem[] = [];
    private _perfect: ParticleSystem | null = null;
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;

    init(perfectMessageParticles?: ParticleSystem | null): void {
        if (!LEVEL_CONFIG) {
            console.warn('[ParticleService] LEVEL_CONFIG не задан');
            return;
        }

        this._confetti = LEVEL_CONFIG.particleConfetti ?? null;
        this._sparkles = this._collectValid(LEVEL_CONFIG.particleSparkles);
        this._perfect = perfectMessageParticles ?? null;
        this._lastHoleScale = 1;

        this._prepare(this._confetti);
        for (let i = 0; i < this._sparkles.length; i++) {
            this._prepare(this._sparkles[i]);
        }
        this._prepare(this._perfect);

        if (!this._subscribed) {
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            this._subscribed = true;
        }

        const sparkleNames = this._sparkles.length > 0
            ? this._sparkles.map((ps) => ps.node.name).join(',')
            : 'none';

        console.log(
            `[ParticleService] Инициализирован` +
            ` confetti=${this._confetti ? this._confetti.node.name : 'null'}` +
            ` sparkles=[${sparkleNames}]` +
            ` perfect=${this._perfect ? this._perfect.node.name : 'null'}` +
            ` (DOOR_OPENED / HOLE_SIZE_CHANGED / PERFECT_MESSAGE)`,
        );
    }

    destroy(): void {
        if (this._subscribed) {
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.off(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            this._subscribed = false;
        }
        this._confetti = null;
        this._sparkles = [];
        this._perfect = null;
        this._lastHoleScale = 1;
    }

    playConfetti(): void {
        this._playOnce(this._confetti, 'Confetti');
    }

    playSparkles(): void {
        if (this._sparkles.length === 0) {
            console.warn('[ParticleService] Sparkles коллекция пуста в LevelConfig');
            return;
        }
        for (let i = 0; i < this._sparkles.length; i++) {
            this._playOnce(this._sparkles[i], `Sparkles[${i}]`);
        }
    }

    playPerfectMessage(): void {
        this._playOnce(this._perfect, 'PerfectMessage');
    }

    private _onDoorOpened = (): void => {
        this.playConfetti();
    };

    private _onHoleSizeChanged = (payload: { scale: number }): void => {
        if (payload.scale > this._lastHoleScale) {
            this.playSparkles();
        }
        this._lastHoleScale = payload.scale;
    };

    private _onPerfectMessage = (): void => {
        this.playPerfectMessage();
    };

    private _collectValid(list: ParticleSystem[] | null | undefined): ParticleSystem[] {
        const out: ParticleSystem[] = [];
        if (!list || list.length === 0) return out;
        for (let i = 0; i < list.length; i++) {
            const ps = list[i];
            if (ps && ps.isValid) {
                out.push(ps);
            }
        }
        return out;
    }

    /** playOnAwake off, остановить до явного play* */
    private _prepare(ps: ParticleSystem | null): void {
        if (!ps || !ps.isValid) return;
        ps.playOnAwake = false;
        ps.stop();
        ps.clear();
    }

    /** Перезапуск one-shot: stop → clear → play */
    private _playOnce(ps: ParticleSystem | null, label: string): void {
        if (!ps || !ps.isValid) {
            console.warn(`[ParticleService] ${label} не назначен`);
            return;
        }
        ps.stop();
        ps.clear();
        ps.play();
    }
}

export let ParticleService: IParticleService = new ParticleServiceImpl();
