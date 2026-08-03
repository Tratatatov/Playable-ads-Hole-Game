/**
 * AudioService — воспроизведение SFX по событиям EventBus.
 * Клипы берутся из AudioConfig. Подписки только через события (не прямые вызовы из геймплея).
 *
 *   ITEM_COLLECTED      → collectClip (random pitch ИЛИ streak ↑) via WebAudio
 *   HOLE_SIZE_CHANGED   → holeGrowClip + сброс streak + подъём базы сбора (Grow Boost)
 *   DOOR_OPENED         → doorOpenClip (pitch ↑ за каждые новые ворота) via WebAudio
 *   PERFECT_MESSAGE     → perfectMessageClip (random pitch range) via WebAudio
 *   FIRST_TOUCH / жест  → unlock WebAudio (мобильный autoplay policy)
 *
 * Pitch через PitchSfxPlayer: Cocos 3.8 AudioSource не имеет playbackRate.
 */

import { AudioClip, AudioSource, game } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { GameStore } from './GameStore';
import { CollectableType } from '../gameplay/Collectable';
import { AudioConfig } from './AudioConfig';
import { PitchSfxPlayer } from './PitchSfxPlayer';

export interface IAudioService {
    init(config: AudioConfig): void;
    /** Разблокировать WebAudio в стеке user-gesture (iOS/Android). */
    unlock(): void;
    destroy(): void;
}

class AudioServiceImpl implements IAudioService {
    private _config: AudioConfig | null = null;
    private _source: AudioSource | null = null;
    private readonly _pitch: PitchSfxPlayer = new PitchSfxPlayer();
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;
    private _lastCollectTime: number = -1e9;
    /** Индекс streak внутри текущей фазы (сброс при росте). */
    private _collectPitchStreak: number = 0;
    /** Текущая база сбора; ↑ на Grow Boost при каждом росте дыры. */
    private _collectPitchBase: number = 1;
    /** Сколько ворот уже открыто (для door pitch step). */
    private _doorOpenCount: number = 0;
    private _unlocked: boolean = false;
    private _gestureUnlockInstalled: boolean = false;

    private readonly _onCanvasUnlock = (): void => {
        this.unlock();
    };

    init(config: AudioConfig): void {
        if (!config) {
            console.warn('[AudioService] AudioConfig не передан');
            return;
        }

        this._config = config;
        this._lastHoleScale = 1;
        this._lastCollectTime = -1e9;
        this._collectPitchStreak = 0;
        this._collectPitchBase = config.collectPitchMin;
        this._doorOpenCount = 0;
        this._unlocked = false;

        // Основной AudioSource (door + silent unlock fallback)
        this._source = config.node.getComponent(AudioSource);
        if (!this._source) {
            this._source = config.node.addComponent(AudioSource);
        }
        this._source.playOnAwake = false;

        this._pitch.warm(config.collectClip);
        this._pitch.warm(config.holeGrowClip);
        this._pitch.warm(config.doorOpenClip);
        this._pitch.warm(config.perfectMessageClip);

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.on(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            EventBus.on(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
            this._subscribed = true;
        }

        this._installGestureUnlock();

        if (config.collectPitchStreakEnabled) {
            const span = Math.abs(config.collectPitchMax - config.collectPitchMin);
            const step = Math.max(0, config.collectPitchStreakStep);
            const steps = step > 0 ? Math.floor(span / step) : 0;
            if (steps < 3) {
                console.warn(
                    `[AudioService] Collect streak почти не слышен: ` +
                    `Min=${config.collectPitchMin}, Max=${config.collectPitchMax}, Step=${step} ` +
                    `(~${steps} ступеней). Увеличь Max или уменьши Step.`
                );
            }
        }

        console.log(
            `[AudioService] init: pitch via WebAudio, ` +
            `streak=${config.collectPitchStreakEnabled}, ` +
            `minInterval=${config.collectMinInterval}s, ` +
            `stackAtten=${config.collectStackAttenuation}`
        );
    }

    unlock(): void {
        this._resumeWebAudioContexts();
        this._pitch.unlock();

        if (this._unlocked) return;
        this._unlocked = true;
        this._removeGestureUnlock();

        // Silent play внутри gesture — iOS / DOM fallback
        const clip =
            this._config?.collectClip ??
            this._config?.doorOpenClip ??
            this._config?.perfectMessageClip ??
            null;
        if (clip && this._source && this._source.isValid) {
            this._source.playOneShot(clip, 0.001);
        }

        console.log('[AudioService] WebAudio unlocked (user gesture)');
    }

    destroy(): void {
        this._removeGestureUnlock();

        if (this._subscribed) {
            EventBus.off(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.off(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            EventBus.off(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
            this._subscribed = false;
        }
        this._pitch.destroy();
        this._config = null;
        this._source = null;
        this._lastHoleScale = 1;
        this._lastCollectTime = -1e9;
        this._collectPitchStreak = 0;
        this._collectPitchBase = 1;
        this._doorOpenCount = 0;
        this._unlocked = false;
    }

    private _onFirstTouch = (): void => {
        this.unlock();
    };

    private _onItemCollected = (): void => {
        if (!this._config) return;
        this._resumeWebAudioContexts();
        this._playCollect();
    };

    private _onHoleSizeChanged = (payload: { scale: number }): void => {
        if (!this._config) return;
        if (payload.scale > this._lastHoleScale) {
            this._onHoleGrew();
            this._resumeWebAudioContexts();
            this._pitch.play(
                this._config.holeGrowClip,
                this._config.holeGrowVolume,
                GameStore.holeGrowPitch
            );
        }
        this._lastHoleScale = payload.scale;
    };

    /** Streak → 0, база сбора ↑ на Grow Boost (clamp Max). */
    private _onHoleGrew(): void {
        const config = this._config;
        if (!config || !config.collectPitchStreakEnabled) {
            this._collectPitchStreak = 0;
            return;
        }
        this._collectPitchStreak = 0;
        const min = config.collectPitchMin;
        const max = config.collectPitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;
        const boost = Math.max(0, config.collectPitchGrowBoost);
        this._collectPitchBase = Math.min(hi, Math.max(lo, this._collectPitchBase) + boost);
    }

    private _onDoorOpened = (_payload: { type: CollectableType }): void => {
        if (!this._config) return;
        this._resumeWebAudioContexts();
        this._playDoorOpen();
    };

    private _onPerfectMessage = (): void => {
        if (!this._config) return;
        this._resumeWebAudioContexts();
        this._playPerfectMessage();
    };

    private _installGestureUnlock(): void {
        if (this._gestureUnlockInstalled) return;
        this._gestureUnlockInstalled = true;

        const canvas = game.canvas;
        if (!canvas) return;

        canvas.addEventListener('touchstart', this._onCanvasUnlock, { passive: true });
        canvas.addEventListener('touchend', this._onCanvasUnlock, { passive: true });
        canvas.addEventListener('mousedown', this._onCanvasUnlock);
        canvas.addEventListener('pointerdown', this._onCanvasUnlock);
    }

    private _removeGestureUnlock(): void {
        if (!this._gestureUnlockInstalled) return;
        this._gestureUnlockInstalled = false;

        const canvas = game.canvas;
        if (!canvas) return;

        canvas.removeEventListener('touchstart', this._onCanvasUnlock);
        canvas.removeEventListener('touchend', this._onCanvasUnlock);
        canvas.removeEventListener('mousedown', this._onCanvasUnlock);
        canvas.removeEventListener('pointerdown', this._onCanvasUnlock);
    }

    private _resumeWebAudioContexts(): void {
        this._pitch.resume();

        const g = globalThis as unknown as Record<string, unknown>;
        this._tryResumeCtx(g['__audioContext']);
        this._tryResumeCtx(g['audioContext']);
    }

    private _tryResumeCtx(ctx: unknown): void {
        if (!ctx || typeof ctx !== 'object') return;
        const c = ctx as { state?: string; resume?: () => Promise<void> | void };
        if (c.state === 'suspended' && typeof c.resume === 'function') {
            try {
                const ret = c.resume();
                if (ret && typeof (ret as Promise<void>).catch === 'function') {
                    (ret as Promise<void>).catch(() => { /* ignore */ });
                }
            } catch {
                /* ignore */
            }
        }
    }

    private _playCollect(): void {
        const config = this._config;
        if (!config) return;
        const clip = config.collectClip;
        if (!clip) return;

        const min = config.collectPitchMin;
        const max = config.collectPitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;

        let pitch: number;
        if (config.collectPitchStreakEnabled) {
            const step = Math.max(0, config.collectPitchStreakStep);
            const base = Math.min(hi, Math.max(lo, this._collectPitchBase));
            pitch = Math.min(hi, base + this._collectPitchStreak * step);
            this._collectPitchStreak++;
        } else {
            pitch = lo + Math.random() * (hi - lo);
        }

        const now = performance.now() * 0.001;
        const minInterval = Math.max(0, config.collectMinInterval);
        if (now - this._lastCollectTime < minInterval) {
            return;
        }

        const active = this._pitch.collectActive;
        const atten = Math.max(0, config.collectStackAttenuation);
        const volScale = atten > 0 ? 1 / (1 + atten * active) : 1;
        const volume = Math.max(0, Math.min(1, config.collectVolume * volScale));

        this._pitch.playCollect(clip, volume, pitch);
        this._lastCollectTime = now;
    }

    private _playDoorOpen(): void {
        const config = this._config;
        if (!config) return;

        const min = config.doorOpenPitchMin;
        const max = config.doorOpenPitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;
        const step = Math.max(0, config.doorOpenPitchStep);
        const pitch = Math.min(hi, lo + this._doorOpenCount * step);
        this._doorOpenCount++;

        this._pitch.play(config.doorOpenClip, config.doorOpenVolume, pitch);
    }

    private _playPerfectMessage(): void {
        const config = this._config;
        if (!config) return;

        const min = config.perfectMessagePitchMin;
        const max = config.perfectMessagePitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;
        const pitch = lo + Math.random() * (hi - lo);

        this._pitch.play(
            config.perfectMessageClip,
            config.perfectMessageVolume,
            pitch
        );
    }
}

export let AudioService: IAudioService = new AudioServiceImpl();
