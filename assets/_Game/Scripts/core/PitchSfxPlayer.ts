/**
 * PitchSfxPlayer — one-shot SFX с pitch через Web Audio API.
 * Cocos 3.8 AudioSource не поддерживает playbackRate; playOneShot тоже.
 */

import { AudioClip } from 'cc';

type WinAudio = typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
};

type AudioMeta = { url?: string };

export class PitchSfxPlayer {
    private _ctx: AudioContext | null = null;
    private readonly _buffers = new Map<string, AudioBuffer>();
    private readonly _loading = new Map<string, Promise<AudioBuffer | null>>();
    private _collectActive: number = 0;

    get collectActive(): number {
        return this._collectActive;
    }

    /** Resume нашего AudioContext (autoplay / tab return). */
    resume(): void {
        const ctx = this._ctx;
        if (!ctx || ctx.state !== 'suspended') return;
        try {
            const ret = ctx.resume();
            if (ret && typeof ret.catch === 'function') {
                ret.catch(() => { /* ignore */ });
            }
        } catch {
            /* ignore */
        }
    }

    /** Silent buffer tick внутри user-gesture — unlock WebAudio timeline. */
    unlock(): void {
        const ctx = this._ensureCtx();
        if (!ctx) return;
        this.resume();
        try {
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch {
            /* ignore */
        }
    }

    warm(clip: AudioClip | null | undefined): void {
        if (!clip) return;
        void this._getBuffer(clip);
    }

    play(clip: AudioClip | null | undefined, volume: number, pitch: number): void {
        if (!clip) return;
        const cached = this._buffers.get(this._key(clip));
        if (cached) {
            this._playBuffer(cached, volume, pitch, false);
            return;
        }
        void this._getBuffer(clip).then((buf) => {
            if (buf) this._playBuffer(buf, volume, pitch, false);
        });
    }

    /** Collect-голос: учитывается в collectActive до ended. */
    playCollect(clip: AudioClip | null | undefined, volume: number, pitch: number): boolean {
        if (!clip) return false;
        const cached = this._buffers.get(this._key(clip));
        if (cached) {
            this._playBuffer(cached, volume, pitch, true);
            return true;
        }
        void this._getBuffer(clip).then((buf) => {
            if (buf) this._playBuffer(buf, volume, pitch, true);
        });
        return true;
    }

    destroy(): void {
        this._buffers.clear();
        this._loading.clear();
        this._collectActive = 0;
        if (this._ctx) {
            try {
                void this._ctx.close();
            } catch {
                /* ignore */
            }
            this._ctx = null;
        }
    }

    private _playBuffer(
        buffer: AudioBuffer,
        volume: number,
        pitch: number,
        trackCollect: boolean
    ): void {
        const ctx = this._ensureCtx();
        if (!ctx) return;
        this.resume();

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = Math.max(0.1, pitch);

        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, volume));
        src.connect(gain);
        gain.connect(ctx.destination);

        if (trackCollect) {
            this._collectActive++;
            src.onended = (): void => {
                this._collectActive = Math.max(0, this._collectActive - 1);
            };
        }

        try {
            src.start(0);
        } catch {
            if (trackCollect) {
                this._collectActive = Math.max(0, this._collectActive - 1);
            }
        }
    }

    private _key(clip: AudioClip): string {
        return clip.uuid || this._resolveUrl(clip) || clip.name;
    }

    private _resolveUrl(clip: AudioClip): string {
        const meta = (clip as unknown as { _nativeAsset?: AudioMeta | null })._nativeAsset;
        if (meta?.url) return meta.url;
        return clip.nativeUrl || '';
    }

    private _getBuffer(clip: AudioClip): Promise<AudioBuffer | null> {
        const key = this._key(clip);
        const hit = this._buffers.get(key);
        if (hit) return Promise.resolve(hit);

        const inflight = this._loading.get(key);
        if (inflight) return inflight;

        const url = this._resolveUrl(clip);
        if (!url) {
            console.warn('[PitchSfxPlayer] clip без url:', clip.name);
            return Promise.resolve(null);
        }

        const promise = this._fetchDecode(url).then((buf) => {
            this._loading.delete(key);
            if (buf) {
                this._buffers.set(key, buf);
            } else {
                console.warn('[PitchSfxPlayer] decode failed:', url);
            }
            return buf;
        });
        this._loading.set(key, promise);
        return promise;
    }

    private async _fetchDecode(url: string): Promise<AudioBuffer | null> {
        const ctx = this._ensureCtx();
        if (!ctx) return null;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn('[PitchSfxPlayer] fetch failed:', url, res.status);
                return null;
            }
            const data = await res.arrayBuffer();
            return await new Promise<AudioBuffer | null>((resolve) => {
                const ret = ctx.decodeAudioData(
                    data.slice(0),
                    (buf) => resolve(buf),
                    () => resolve(null)
                );
                if (ret && typeof (ret as Promise<AudioBuffer>).then === 'function') {
                    (ret as Promise<AudioBuffer>).then(resolve).catch(() => resolve(null));
                }
            });
        } catch (e) {
            console.warn('[PitchSfxPlayer] fetch/decode error:', url, e);
            return null;
        }
    }

    private _ensureCtx(): AudioContext | null {
        if (this._ctx) return this._ctx;
        const w = globalThis as WinAudio;
        const AC = w.AudioContext || w.webkitAudioContext;
        if (!AC) {
            console.warn('[PitchSfxPlayer] Web Audio API недоступен');
            return null;
        }
        try {
            this._ctx = new AC();
            return this._ctx;
        } catch {
            return null;
        }
    }
}
