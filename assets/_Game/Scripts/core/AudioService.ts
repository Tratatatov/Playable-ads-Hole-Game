/**
 * AudioService — воспроизведение SFX по событиям EventBus.
 * Клипы берутся из AudioConfig. Подписки только через события (не прямые вызовы из геймплея).
 *
 *   ITEM_COLLECTED      → collectClip (voice pool + pitch + anti-mud)
 *   HOLE_SIZE_CHANGED   → holeGrowClip (только при росте scale)
 *   DOOR_OPENED         → doorOpenClip
 *   PERFECT_MESSAGE     → perfectMessageClip
 *   FIRST_TOUCH / жест  → unlock WebAudio (мобильный autoplay policy)
 *
 * Collect pool: idle-first; если все заняты — drop (без stop/click), не режем хвост.
 */

import { AudioClip, AudioSource, game } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { AudioConfig } from './AudioConfig';

const DEFAULT_COLLECT_POOL = 8;

export interface IAudioService {
    init(config: AudioConfig): void;
    /** Разблокировать WebAudio в стеке user-gesture (iOS/Android). */
    unlock(): void;
    destroy(): void;
}

class AudioServiceImpl implements IAudioService {
    private _config: AudioConfig | null = null;
    private _source: AudioSource | null = null;
    private readonly _collectPool: AudioSource[] = [];
    private _collectScan: number = 0;
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;
    private _lastCollectTime: number = -1e9;
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
        this._collectScan = 0;
        this._lastCollectTime = -1e9;
        this._unlocked = false;
        this._collectPool.length = 0;

        // Основной AudioSource (дыра / двери / perfect + silent unlock)
        this._source = config.node.getComponent(AudioSource);
        if (!this._source) {
            this._source = config.node.addComponent(AudioSource);
        }
        this._source.playOnAwake = false;

        const poolSize = Math.max(2, Math.min(16, config.collectPoolSize | 0 || DEFAULT_COLLECT_POOL));
        for (let i = 0; i < poolSize; i++) {
            const src = config.node.addComponent(AudioSource);
            src.playOnAwake = false;
            src.loop = false;
            if (config.collectClip) {
                src.clip = config.collectClip;
            }
            this._collectPool.push(src);
        }

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED, this._onItemCollected, this);
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.on(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            // FIRST_TOUCH всё ещё в user-gesture call stack
            EventBus.on(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
            this._subscribed = true;
        }

        this._installGestureUnlock();

        console.log(
            `[AudioService] init: collectPool=${poolSize}, ` +
            `minInterval=${config.collectMinInterval}s, ` +
            `stackAtten=${config.collectStackAttenuation}`
        );
    }

    unlock(): void {
        this._resumeWebAudioContexts();

        if (this._unlocked) return;
        this._unlocked = true;
        this._removeGestureUnlock();

        // Silent play внутри gesture — iOS стартует WebAudio timeline
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
        this._config = null;
        this._source = null;
        this._collectPool.length = 0;
        this._collectScan = 0;
        this._lastHoleScale = 1;
        this._lastCollectTime = -1e9;
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
            this._resumeWebAudioContexts();
            this._playOneShot(this._config.holeGrowClip, this._config.holeGrowVolume);
        }
        this._lastHoleScale = payload.scale;
    };

    private _onDoorOpened = (_payload: { type: CollectableType }): void => {
        if (!this._config) return;
        this._resumeWebAudioContexts();
        this._playOneShot(this._config.doorOpenClip, this._config.doorOpenVolume);
    };

    private _onPerfectMessage = (): void => {
        if (!this._config) return;
        this._resumeWebAudioContexts();
        this._playOneShot(this._config.perfectMessageClip, this._config.perfectMessageVolume);
    };

    /**
     * Тач во время CameraIntro (InputService ещё выкл.) тоже должен unlock'ать звук.
     */
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

    /** Resume suspended AudioContext (iOS / WebView / tab return). */
    private _resumeWebAudioContexts(): void {
        const g = globalThis as unknown as Record<string, unknown>;
        this._tryResumeCtx(g['__audioContext']);
        this._tryResumeCtx(g['audioContext']);

        // Cocos / bundlers иногда кладут ctx на webkitAudioContext instances
        const w = globalThis as unknown as {
            AudioContext?: new () => { state: string; resume: () => Promise<void> };
            webkitAudioContext?: new () => { state: string; resume: () => Promise<void> };
        };
        // Не создаём новый контекст — только resume уже существующих через silent play.
        void w;
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
        const pool = this._collectPool;
        if (!clip || pool.length === 0) return;

        const now = performance.now() * 0.001;
        const minInterval = Math.max(0, config.collectMinInterval);
        if (now - this._lastCollectTime < minInterval) {
            return;
        }

        const src = this._acquireCollectVoice();
        if (!src) {
            return;
        }

        const min = config.collectPitchMin;
        const max = config.collectPitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;
        const pitch = lo + Math.random() * (hi - lo);

        const active = this._countPlayingCollect();
        const atten = Math.max(0, config.collectStackAttenuation);
        const volScale = atten > 0 ? 1 / (1 + atten * active) : 1;
        const volume = Math.max(0, Math.min(1, config.collectVolume * volScale));

        if (src.clip !== clip) {
            src.clip = clip;
        }
        src.loop = false;
        src.volume = volume;
        src.playbackRate = pitch;
        src.play();

        this._lastCollectTime = now;
    }

    private _acquireCollectVoice(): AudioSource | null {
        const pool = this._collectPool;
        const n = pool.length;
        if (n === 0) return null;

        const start = this._collectScan % n;
        for (let k = 0; k < n; k++) {
            const i = (start + k) % n;
            const src = pool[i];
            if (!src || !src.isValid) continue;
            if (!src.playing) {
                this._collectScan = (i + 1) % n;
                return src;
            }
        }
        return null;
    }

    private _countPlayingCollect(): number {
        const pool = this._collectPool;
        let n = 0;
        for (let i = 0; i < pool.length; i++) {
            const src = pool[i];
            if (src && src.isValid && src.playing) n++;
        }
        return n;
    }

    private _playOneShot(clip: AudioClip | null, volume: number): void {
        if (!clip || !this._source) return;
        this._source.playOneShot(clip, volume);
    }
}

export let AudioService: IAudioService = new AudioServiceImpl();
