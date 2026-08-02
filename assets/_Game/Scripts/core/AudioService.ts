/**
 * AudioService — воспроизведение SFX по событиям EventBus.
 * Клипы берутся из AudioConfig. Подписки только через события (не прямые вызовы из геймплея).
 *
 *   ITEM_COLLECTED      → collectClip (рандомный pitch в [min, max])
 *   HOLE_SIZE_CHANGED   → holeGrowClip (только при росте scale)
 *   DOOR_OPENED         → doorOpenClip
 */

import { AudioClip, AudioSource } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';
import { AudioConfig } from './AudioConfig';

/** Пул источников для overlapping collect SFX с разным pitch */
const COLLECT_SOURCE_POOL = 4;

export interface IAudioService {
    init(config: AudioConfig): void;
    destroy(): void;
}

class AudioServiceImpl implements IAudioService {
    private _config: AudioConfig | null = null;
    private _source: AudioSource | null = null;
    private readonly _collectPool: AudioSource[] = [];
    private _collectPoolIndex: number = 0;
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;

    init(config: AudioConfig): void {
        if (!config) {
            console.warn('[AudioService] AudioConfig не передан');
            return;
        }

        this._config = config;
        this._lastHoleScale = 1;
        this._collectPoolIndex = 0;
        this._collectPool.length = 0;

        // Основной AudioSource (дыра / двери)
        this._source = config.node.getComponent(AudioSource);
        if (!this._source) {
            this._source = config.node.addComponent(AudioSource);
        }
        this._source.playOnAwake = false;

        // Пул для сбора: playOneShot не поддерживает pitch → отдельные источники + playbackRate
        for (let i = 0; i < COLLECT_SOURCE_POOL; i++) {
            const src = config.node.addComponent(AudioSource);
            src.playOnAwake = false;
            this._collectPool.push(src);
        }

        if (!this._subscribed) {
            EventBus.on(GameEvent.ITEM_COLLECTED,    this._onItemCollected,  this);
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.DOOR_OPENED,       this._onDoorOpened,     this);
            this._subscribed = true;
        }

        console.log('[AudioService] Инициализирован (ITEM_COLLECTED / HOLE_SIZE_CHANGED / DOOR_OPENED)');
    }

    destroy(): void {
        if (!this._subscribed) return;
        EventBus.off(GameEvent.ITEM_COLLECTED,    this._onItemCollected,  this);
        EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
        EventBus.off(GameEvent.DOOR_OPENED,       this._onDoorOpened,     this);
        this._subscribed = false;
        this._config = null;
        this._source = null;
        this._collectPool.length = 0;
        this._collectPoolIndex = 0;
        this._lastHoleScale = 1;
    }

    private _onItemCollected = (): void => {
        if (!this._config) return;
        this._playCollect();
    };

    private _onHoleSizeChanged = (payload: { scale: number }): void => {
        if (!this._config) return;
        if (payload.scale > this._lastHoleScale) {
            this._playOneShot(this._config.holeGrowClip, this._config.holeGrowVolume);
        }
        this._lastHoleScale = payload.scale;
    };

    private _onDoorOpened = (_payload: { type: CollectableType }): void => {
        if (!this._config) return;
        this._playOneShot(this._config.doorOpenClip, this._config.doorOpenVolume);
    };

    private _playCollect(): void {
        if (!this._config) return;
        const clip = this._config.collectClip;
        if (!clip || this._collectPool.length === 0) return;

        const min = this._config.collectPitchMin;
        const max = this._config.collectPitchMax;
        const lo = min < max ? min : max;
        const hi = min < max ? max : min;
        const pitch = lo + Math.random() * (hi - lo);

        const src = this._collectPool[this._collectPoolIndex];
        this._collectPoolIndex = (this._collectPoolIndex + 1) % this._collectPool.length;

        src.stop();
        src.clip = clip;
        src.volume = this._config.collectVolume;
        src.loop = false;
        src.playbackRate = pitch;
        src.play();
    }

    private _playOneShot(clip: AudioClip | null, volume: number): void {
        if (!clip || !this._source) return;
        this._source.playOneShot(clip, volume);
    }
}

export let AudioService: IAudioService = new AudioServiceImpl();
