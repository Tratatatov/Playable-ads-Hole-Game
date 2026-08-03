/**
 * HoleMovement — логика передвижения дыры.
 * Читает InputService + LevelConfig (свайп) + GameStore (min/max speed) → velocity → RigidBody.
 * |v| hard-clamp по GameStore.holeMaxSpeed.
 *
 * Plain TS class (не Component). RULES §2.1: нет аллокаций в update().
 */

import { Node, RigidBody, Vec3, view } from 'cc';
import { InputService } from './InputService';
import { GameStore } from './GameStore';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export class HoleMovement {
    private readonly _currentVel: Vec3 = new Vec3();
    private readonly _targetVel: Vec3 = new Vec3();
    private readonly _newPos: Vec3 = new Vec3();

    /** Текущая сглаженная скорость (|v|). */
    get currentSpeed(): number {
        return this._currentVel.length();
    }

    /**
     * Сбросить сглаженную скорость (стоп).
     * Если передан rigidBody — сразу обнуляет и физическую velocity.
     */
    reset(rigidBody: RigidBody | null = null): void {
        this._currentVel.set(0, 0, 0);
        this._targetVel.set(0, 0, 0);
        rigidBody?.setLinearVelocity(this._currentVel);
    }

    /**
     * Один кадр движения.
     * @param dt delta time
     * @param rigidBody физическое тело дыры (если null — кинематический fallback по node)
     * @param node узел дыры (для fallback без RigidBody)
     */
    update(dt: number, rigidBody: RigidBody | null, node: Node): void {
        if (dt <= 0 || !LEVEL_CONFIG) return;

        this._computeTargetVelocity(this._targetVel);

        const lerpT = Math.min(1, dt * LEVEL_CONFIG.velocityLerpSpeed);
        Vec3.lerp(this._currentVel, this._currentVel, this._targetVel, lerpT);
        if (this._currentVel.lengthSqr() < 0.0001) {
            this._currentVel.set(0, 0, 0);
        }

        if (rigidBody) {
            rigidBody.setLinearVelocity(this._currentVel);
        } else {
            const p = node.position;
            this._newPos.set(
                p.x + this._currentVel.x * dt,
                p.y,
                p.z + this._currentVel.z * dt
            );
            node.setPosition(this._newPos);
        }
    }

    /**
     * Целевая velocity из инпута.
     * Направление — normalized (как Vector3.normalized в Unity): |dir| = 1,
     * затем * speed. По диагонали скорость не больше, чем по оси.
     * |v| hard-clamp по holeMaxSpeed.
     */
    private _computeTargetVelocity(out: Vec3): void {
        if (!InputService.isTouching) {
            out.set(0, 0, 0);
            return;
        }

        const size = view.getVisibleSize();
        const screenRef = Math.max(1, Math.min(size.width, size.height));
        const offset = InputService.touchOffset;
        const ox = offset.x / screenRef;
        const oz = -offset.y / screenRef;
        const offsetMag = Math.sqrt(ox * ox + oz * oz);

        const minPct = InputService.isMouseInput
            ? LEVEL_CONFIG.mouseMinSwipePct
            : LEVEL_CONFIG.inputMinSwipePct;
        const maxPct = InputService.isMouseInput
            ? LEVEL_CONFIG.mouseMaxSwipePct
            : LEVEL_CONFIG.inputMaxSwipePct;

        if (offsetMag < minPct) {
            out.set(0, 0, 0);
            return;
        }

        // t: 0 на minPct → holeMinSpeed; 1 на maxPct → holeMaxSpeed
        const range = Math.max(1e-6, maxPct - minPct);
        const t = Math.min(1, Math.max(0, (offsetMag - minPct) / range));

        const minSpeed = GameStore.holeMinSpeed;
        const maxSpeed = Math.max(minSpeed, GameStore.holeMaxSpeed);
        const speed = Math.min(maxSpeed, minSpeed + (maxSpeed - minSpeed) * t);

        // Unity-style: dir.normalized * speed  →  |v| === speed (и на диагонали тоже)
        const inv = 1 / offsetMag;
        out.set(ox * inv * speed, 0, oz * inv * speed);
    }
}
