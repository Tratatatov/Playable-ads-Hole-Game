/**
 * ParticleService — одноразовый запуск VFX на сцене.
 * Ссылки на ParticleSystem берутся из LevelConfig (узлы уже на сцене).
 */

import { ParticleSystem } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface IParticleService {
    init(): void;
    destroy(): void;
    playConfetti(): void;
    playSparkles(): void;
}

class ParticleServiceImpl implements IParticleService {
    private _confetti: ParticleSystem | null = null;
    private _sparkles: ParticleSystem | null = null;

    init(): void {
        if (!LEVEL_CONFIG) {
            console.warn('[ParticleService] LEVEL_CONFIG не задан');
            return;
        }

        this._confetti = LEVEL_CONFIG.particleConfetti ?? null;
        this._sparkles = LEVEL_CONFIG.particleSparkles ?? null;

        this._prepare(this._confetti);
        this._prepare(this._sparkles);

        console.log(
            `[ParticleService] Инициализирован` +
            ` confetti=${this._confetti ? this._confetti.node.name : 'null'}` +
            ` sparkles=${this._sparkles ? this._sparkles.node.name : 'null'}`
        );
    }

    destroy(): void {
        this._confetti = null;
        this._sparkles = null;
    }

    playConfetti(): void {
        this._playOnce(this._confetti, 'Confetti');
    }

    playSparkles(): void {
        this._playOnce(this._sparkles, 'Sparkles');
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
            console.warn(`[ParticleService] ${label} не назначен в LevelConfig`);
            return;
        }
        ps.stop();
        ps.clear();
        ps.play();
    }
}

export let ParticleService: IParticleService = new ParticleServiceImpl();
