/**
 * HoleMovement — логика передвижения дыры.
 * Читает InputService + LevelConfig → целевая velocity → lerp → RigidBody.
 * |v| hard-clamp по holeMaxSpeed.
 *
 * Plain TS class (не Component). RULES §2.1: нет аллокаций в update().
 */

import { Node, RigidBody, Vec3, view } from 'cc';
import { InputService } from './InputService';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export class HoleMovement {
    private readonly _currentVel: Vec3 = new Vec3();
    private readonly _targetVel: Vec3 = new Vec3();
    private readonly _newPos: Vec3 = new Vec3();

    /** Сбросить сглаженную скорость (стоп). */
    reset(): void {
        this._currentVel.set(0, 0, 0);
        this._targetVel.set(0, 0, 0);
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

    /** Целевая velocity из инпута + hard clamp |v| ≤ holeMaxSpeed. */
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

        const minSpeed = LEVEL_CONFIG.holeMinSpeed;
        const maxSpeed = Math.max(minSpeed, LEVEL_CONFIG.holeMaxSpeed);
        const speed = Math.min(maxSpeed, minSpeed + (maxSpeed - minSpeed) * t);

        const inv = 1 / offsetMag;
        out.set(ox * inv * speed, 0, oz * inv * speed);

        // Hard clamp velocity
        const lenSq = out.lengthSqr();
        const maxSq = maxSpeed * maxSpeed;
        if (lenSq > maxSq) {
            const s = maxSpeed / Math.sqrt(lenSq);
            out.x *= s;
            out.y = 0;
            out.z *= s;
        }
    }
}
