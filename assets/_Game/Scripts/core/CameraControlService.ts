/**
 * CameraControlService — управление камерой.
 * Follow за дырой (world-space hard-lock / smooth damp) + cinematic через tween.
 * Параметры — из CameraConfig.
 *
 *   DOOR_OPENED       → dollyLocalZ (+ опционально) + shake (сильнее).
 *   HOLE_SIZE_CHANGED → лёгкий shake при росте.
 *   PERFECT_MESSAGE   → слабый shake.
 *   Dolly твинит offset и не паузит follow — камера продолжает следовать за целью.
 */

import { Node, Vec3, Quat, Camera, tween, Tween } from 'cc';
import { CameraConfig } from './CameraConfig';
import { EventBus, GameEvent } from './EventBus';
import { CollectableType } from '../gameplay/Collectable';

export interface ICameraControlService {
    init(camera: Node, target: Node, config: CameraConfig | null): void;
    update(dt: number): void;
    destroy(): void;

    setFollowEnabled(enabled: boolean): void;
    isFollowEnabled(): boolean;

    /** Тряска камеры. Без аргументов — значения из CameraConfig. */
    shake(intensity?: number, duration?: number): void;
    stopShake(): void;

    /**
     * Смещение вдоль локальной оси Z камеры (+ опционально orthoHeight / fov).
     * Follow не паузится: твинится offset относительно цели.
     * Без аргументов — CameraConfig.dollyOffsetZ / dollyZoom / dollyFov / dollyDuration.
     * Положительный deltaZ = назад вдоль взгляда.
     */
    dollyLocalZ(deltaZ?: number, duration?: number, zoomDelta?: number, fovDelta?: number): void;

    /**
     * Перемещение из точки A в точку B с ускорением (easing из CameraConfig).
     * На время твина follow паузится; после move follow остаётся выключенным
     * (включите снова через setFollowEnabled(true)).
     */
    moveTo(from: Readonly<Vec3>, to: Readonly<Vec3>, duration?: number, onComplete?: () => void): void;

    /** Перемещение из текущей базовой позиции в точку B. */
    moveToPosition(to: Readonly<Vec3>, duration?: number, onComplete?: () => void): void;

    stopAllTweens(): void;
}

class CameraControlServiceImpl implements ICameraControlService {
    private _camera: Node | null = null;
    private _cameraComp: Camera | null = null;
    private _target: Node | null = null;
    private _config: CameraConfig | null = null;

    private _followEnabled: boolean = true;
    private _cinematicActive: boolean = false;
    private _subscribed: boolean = false;
    private _lastHoleScale: number = 1;

    private readonly _cameraOffset: Vec3 = new Vec3();
    private readonly _basePosition: Vec3 = new Vec3();
    private readonly _targetWorld: Vec3 = new Vec3();
    private readonly _desiredPos: Vec3 = new Vec3();
    private readonly _shakeOffset: Vec3 = new Vec3();
    private readonly _finalPos: Vec3 = new Vec3();

    private readonly _moveFrom: Vec3 = new Vec3();
    private readonly _moveTo: Vec3 = new Vec3();
    private readonly _dollyEnd: Vec3 = new Vec3();
    private readonly _localZDir: Vec3 = new Vec3();
    private readonly _worldRot: Quat = new Quat();
    private readonly _shakeProxy: { strength: number } = { strength: 0 };
    private readonly _orthoProxy: { height: number } = { height: 0 };
    private readonly _fovProxy: { fov: number } = { fov: 0 };

    private _shakeTween: Tween<{ strength: number }> | null = null;
    private _dollyTween: Tween<Vec3> | null = null;
    private _orthoTween: Tween<{ height: number }> | null = null;
    private _fovTween: Tween<{ fov: number }> | null = null;
    private _moveTween: Tween<Vec3> | null = null;
    private _moveOnComplete: (() => void) | null = null;

    init(camera: Node, target: Node, config: CameraConfig | null): void {
        this._camera = camera;
        this._target = target;
        this._config = config;
        this._cameraComp = camera ? camera.getComponent(Camera) : null;

        if (!this._camera || !this._target) {
            console.warn('[CameraControlService] Камера или цель не переданы в init!');
            return;
        }

        if (!config) {
            console.warn('[CameraControlService] CameraConfig не передан — используем дефолты сервиса');
        }

        this._followEnabled = config ? config.followEnabledOnStart : true;
        this._cinematicActive = false;
        this._lastHoleScale = 1;

        this._camera.getWorldPosition(this._basePosition);
        this._target.getWorldPosition(this._targetWorld);
        this._cameraOffset.set(
            this._basePosition.x - this._targetWorld.x,
            this._basePosition.y - this._targetWorld.y,
            this._basePosition.z - this._targetWorld.z
        );
        this._shakeOffset.set(0, 0, 0);

        if (!this._subscribed) {
            EventBus.on(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.on(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            this._subscribed = true;
        }
    }

    destroy(): void {
        if (this._subscribed) {
            EventBus.off(GameEvent.DOOR_OPENED, this._onDoorOpened, this);
            EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onHoleSizeChanged, this);
            EventBus.off(GameEvent.PERFECT_MESSAGE, this._onPerfectMessage, this);
            this._subscribed = false;
        }
        this.stopAllTweens();
        this._camera = null;
        this._cameraComp = null;
        this._target = null;
        this._config = null;
        this._lastHoleScale = 1;
    }

    private _onDoorOpened = (_payload: { type: CollectableType }): void => {
        const cfg = this._config;
        if (!cfg || cfg.dollyOnDoorOpen) {
            this.dollyLocalZ();
        }
        if (!cfg || cfg.shakeOnDoorOpen) {
            this.shake(
                cfg?.doorOpenShakeIntensity ?? 0.18,
                cfg?.doorOpenShakeDuration ?? 0.35
            );
        }
    };

    private _onHoleSizeChanged = (payload: { scale: number }): void => {
        if (payload.scale > this._lastHoleScale) {
            const cfg = this._config;
            if (!cfg || cfg.shakeOnHoleGrow) {
                this.shake(
                    cfg?.holeGrowShakeIntensity ?? 0.1,
                    cfg?.holeGrowShakeDuration ?? 0.28
                );
            }
        }
        this._lastHoleScale = payload.scale;
    };

    private _onPerfectMessage = (): void => {
        const cfg = this._config;
        if (!cfg || cfg.shakeOnPerfectMessage) {
            this.shake(
                cfg?.perfectShakeIntensity ?? 0.05,
                cfg?.perfectShakeDuration ?? 0.2
            );
        }
    };

    setFollowEnabled(enabled: boolean): void {
        this._followEnabled = enabled;
        if (enabled && this._camera && this._target) {
            this._refreshOffsetFromTarget();
        }
    }

    isFollowEnabled(): boolean {
        return this._followEnabled;
    }

    update(dt: number): void {
        if (!this._camera) return;

        if (this._followEnabled && !this._cinematicActive && this._target) {
            this._target.getWorldPosition(this._targetWorld);
            this._desiredPos.set(
                this._targetWorld.x + this._cameraOffset.x,
                this._targetWorld.y + this._cameraOffset.y,
                this._targetWorld.z + this._cameraOffset.z
            );

            const hardLock = this._config ? this._config.followHardLock : true;
            if (hardLock || dt <= 0) {
                this._basePosition.set(this._desiredPos);
            } else {
                // Frame-independent smooth damp: 1 - e^(-k*dt)
                const speed = this._config ? this._config.followLerpSpeed : 8;
                const t = 1 - Math.exp(-Math.max(0, speed) * dt);
                this._basePosition.lerp(this._desiredPos, t);
            }
        }

        this._finalPos.set(
            this._basePosition.x + this._shakeOffset.x,
            this._basePosition.y + this._shakeOffset.y,
            this._basePosition.z + this._shakeOffset.z
        );
        this._camera.setWorldPosition(this._finalPos);
    }

    shake(intensity?: number, duration?: number): void {
        if (!this._camera) return;

        const amp = intensity ?? this._config?.shakeIntensity ?? 0.2;
        const dur = Math.max(0.01, duration ?? this._config?.shakeDuration ?? 0.35);
        const easing = (this._config?.shakeEasing ?? 'sineOut') as any;

        this.stopShake();
        this._shakeProxy.strength = amp;

        this._shakeTween = tween(this._shakeProxy)
            .to(dur, { strength: 0 }, {
                easing,
                onUpdate: () => {
                    const s = this._shakeProxy.strength;
                    this._shakeOffset.set(
                        (Math.random() * 2 - 1) * s,
                        (Math.random() * 2 - 1) * s,
                        (Math.random() * 2 - 1) * s
                    );
                },
            })
            .call(() => {
                this._shakeOffset.set(0, 0, 0);
                this._shakeTween = null;
            })
            .start();
    }

    stopShake(): void {
        if (this._shakeTween) {
            this._shakeTween.stop();
            this._shakeTween = null;
        }
        this._shakeProxy.strength = 0;
        this._shakeOffset.set(0, 0, 0);
    }

    dollyLocalZ(deltaZ?: number, duration?: number, zoomDelta?: number, fovDelta?: number): void {
        if (!this._camera) return;

        const delta = deltaZ ?? this._config?.dollyOffsetZ ?? 2;
        const zoom = zoomDelta ?? this._config?.dollyZoom ?? 0;
        const fov = fovDelta ?? this._config?.dollyFov ?? 0;
        const dur = Math.max(0.01, duration ?? this._config?.dollyDuration ?? 0.5);
        const easing = (this._config?.dollyEasing ?? 'quadOut') as any;

        this._stopDollyTween();
        this._stopOrthoTween();
        this._stopFovTween();
        // moveTo паузит follow через _cinematicActive — при dolly follow остаётся активным
        this._stopMoveTween();
        this._cinematicActive = false;

        this._camera.getWorldRotation(this._worldRot);
        this._localZDir.set(0, 0, delta);
        Vec3.transformQuat(this._localZDir, this._localZDir, this._worldRot);
        // Твиним offset: follow продолжает ставить base = target + offset
        Vec3.add(this._dollyEnd, this._cameraOffset, this._localZDir);

        this._dollyTween = tween(this._cameraOffset)
            .to(dur, { x: this._dollyEnd.x, y: this._dollyEnd.y, z: this._dollyEnd.z }, { easing })
            .call(() => {
                this._dollyTween = null;
            })
            .start();

        if (zoom !== 0 && this._cameraComp) {
            this._orthoProxy.height = this._cameraComp.orthoHeight;
            const targetHeight = this._orthoProxy.height + zoom;
            this._orthoTween = tween(this._orthoProxy)
                .to(dur, { height: targetHeight }, {
                    easing,
                    onUpdate: () => {
                        if (this._cameraComp) {
                            this._cameraComp.orthoHeight = this._orthoProxy.height;
                        }
                    },
                })
                .call(() => {
                    this._orthoTween = null;
                })
                .start();
        }

        if (fov !== 0 && this._cameraComp) {
            this._fovProxy.fov = this._cameraComp.fov;
            const targetFov = this._fovProxy.fov + fov;
            this._fovTween = tween(this._fovProxy)
                .to(dur, { fov: targetFov }, {
                    easing,
                    onUpdate: () => {
                        if (this._cameraComp) {
                            this._cameraComp.fov = this._fovProxy.fov;
                        }
                    },
                })
                .call(() => {
                    this._fovTween = null;
                })
                .start();
        }
    }

    moveTo(from: Readonly<Vec3>, to: Readonly<Vec3>, duration?: number, onComplete?: () => void): void {
        if (!this._camera) {
            onComplete?.();
            return;
        }

        const dur = Math.max(0.01, duration ?? this._config?.moveDuration ?? 1);
        const easing = (this._config?.moveEasing ?? 'quadIn') as any;

        this._moveFrom.set(from.x, from.y, from.z);
        this._moveTo.set(to.x, to.y, to.z);

        this._stopDollyTween();
        this._stopOrthoTween();
        this._stopFovTween();
        this._stopMoveTween();
        this._cinematicActive = true;
        this._followEnabled = false;
        this._moveOnComplete = onComplete ?? null;

        this._basePosition.set(this._moveFrom);

        this._moveTween = tween(this._basePosition)
            .to(dur, { x: this._moveTo.x, y: this._moveTo.y, z: this._moveTo.z }, { easing })
            .call(() => {
                this._moveTween = null;
                this._cinematicActive = false;
                const cb = this._moveOnComplete;
                this._moveOnComplete = null;
                cb?.();
            })
            .start();
    }

    moveToPosition(to: Readonly<Vec3>, duration?: number, onComplete?: () => void): void {
        this._moveFrom.set(this._basePosition);
        this.moveTo(this._moveFrom, to, duration, onComplete);
    }

    stopAllTweens(): void {
        this.stopShake();
        this._stopDollyTween();
        this._stopOrthoTween();
        this._stopFovTween();
        this._stopMoveTween();
        this._cinematicActive = false;
    }

    private _refreshOffsetFromTarget(): void {
        if (!this._target) return;
        this._target.getWorldPosition(this._targetWorld);
        this._cameraOffset.set(
            this._basePosition.x - this._targetWorld.x,
            this._basePosition.y - this._targetWorld.y,
            this._basePosition.z - this._targetWorld.z
        );
    }

    private _stopDollyTween(): void {
        if (this._dollyTween) {
            this._dollyTween.stop();
            this._dollyTween = null;
        }
    }

    private _stopOrthoTween(): void {
        if (this._orthoTween) {
            this._orthoTween.stop();
            this._orthoTween = null;
        }
    }

    private _stopFovTween(): void {
        if (this._fovTween) {
            this._fovTween.stop();
            this._fovTween = null;
        }
    }

    private _stopMoveTween(): void {
        if (this._moveTween) {
            this._moveTween.stop();
            this._moveTween = null;
        }
        this._moveOnComplete = null;
    }
}

export let CameraControlService: ICameraControlService = new CameraControlServiceImpl();
