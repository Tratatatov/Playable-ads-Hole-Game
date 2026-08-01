/**
 * HoleController — главный компонент игрока (дыры).
 * Аналог Unity HoleController.cs.
 * Механики:
 *   - Читает InputService → движение по арене
 *   - Trigger-коллизии с Collectable → поглощение
 *   - Рост: HoleGrowthService → HOLE_SIZE_CHANGED → целевой scale; здесь Lerp к нему
 *
 * RULES §2.1: Все scratch-переменные преаллоцированы, нет new Vec3() в update().
 */

import {
    _decorator, Component, Vec3, ITriggerEvent, RigidBody, Collider, view
} from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { InputService } from '../core/InputService';
import { LEVEL_CONFIG } from './LevelConfig';
import { Collectable } from './Collectable';

const { ccclass, property } = _decorator;

@ccclass('HoleController')
export class HoleController extends Component {
    // ── Scratch переменные (RULES §2.1 — нет new в update()) ─────────────
    private readonly _currentVel: Vec3 = new Vec3();   // текущая скорость (сглаженная)
    private readonly _targetVel: Vec3 = new Vec3();    // целевая скорость из инпута
    private readonly _newPos: Vec3 = new Vec3();
    private readonly _targetScale: Vec3 = new Vec3();
    private readonly _currentScale: Vec3 = new Vec3();
    private readonly _initialScale: Vec3 = new Vec3(); // Исходный масштаб из префаба

    // ── Состояние ────────────────────────────────────────────────────────
    @property({ type: RigidBody, tooltip: 'Ссылка на RigidBody дыры' })
    rigidBody: RigidBody | null = null;

    @property({ type: Collider, tooltip: 'Коллайдер-триггер для поглощения предметов (если не указан, ищется на текущем узле)' })
    absorbTrigger: Collider | null = null;

    init(): void {
        // Запоминаем исходный масштаб из префаба
        this._initialScale.set(this.node.scale);
        this._targetScale.set(this.node.scale);
        this._currentScale.set(this.node.scale);

        // Подписываемся на события коллизий (В Cocos Creator это обязательно!)
        const collider = this.absorbTrigger || this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
        } else {
            console.warn('[HoleController] Нет компонента Collider! Сбор предметов работать не будет.');
        }

        EventBus.on(GameEvent.HOLE_SIZE_CHANGED, this._onSizeChanged, this);
    }

    onDestroy(): void {
        const collider = this.absorbTrigger || this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
        }
        EventBus.off(GameEvent.HOLE_SIZE_CHANGED, this._onSizeChanged, this);
    }

    // ── Update (ZERO-GC: используем только scratch vars) ─────────────────

    update(dt: number): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        if (dt <= 0) return;

        const offset = InputService.touchOffset;
        const lerpT  = Math.min(1, dt * LEVEL_CONFIG.velocityLerpSpeed);

        // Смещение от точки касания → доля короткой стороны экрана (0..1+)
        const size = view.getVisibleSize();
        const screenRef = Math.max(1, Math.min(size.width, size.height));
        const ox = offset.x / screenRef;
        const oz = -offset.y / screenRef;
        const offsetMag = Math.sqrt(ox * ox + oz * oz);

        const minPct = LEVEL_CONFIG.inputMinSwipePct;
        const maxPct = LEVEL_CONFIG.inputMaxSwipePct;

        if (!InputService.isTouching || offsetMag < minPct) {
            this._targetVel.set(0, 0, 0);
        } else {
            // t: 0 на minPct → holeMinSpeed; 1 на maxPct → holeMaxSpeed
            const range = Math.max(1e-6, maxPct - minPct);
            const t = Math.min(1, Math.max(0, (offsetMag - minPct) / range));

            const minSpeed = LEVEL_CONFIG.holeMinSpeed;
            const maxSpeed = Math.max(minSpeed, LEVEL_CONFIG.holeMaxSpeed);
            const speed = minSpeed + (maxSpeed - minSpeed) * t;

            const inv = 1 / offsetMag;
            this._targetVel.set(
                ox * inv * speed,
                0,
                oz * inv * speed
            );
        }

        // Плавная смена направления и скорости через lerp
        Vec3.lerp(this._currentVel, this._currentVel, this._targetVel, lerpT);
        if (this._currentVel.lengthSqr() < 0.0001) {
            this._currentVel.set(0, 0, 0);
        }

        if (this.rigidBody) {
            this.rigidBody.setLinearVelocity(this._currentVel);
        } else {
            console.warn('[HoleController] ВНИМАНИЕ: RigidBody не назначен в инспекторе!');
            const p = this.node.position;
            this._newPos.set(
                p.x + this._currentVel.x * dt,
                p.y,
                p.z + this._currentVel.z * dt
            );
            this.node.setPosition(this._newPos);
        }

        // LERP-сглаживание масштаба дыры (между скачками порогов)
        if (!this.node.scale.equals(this._targetScale, 0.0001)) {
            Vec3.lerp(this._currentScale, this.node.scale, this._targetScale, Math.min(1, dt * LEVEL_CONFIG.holeScaleLerpSpeed));
            this.node.setScale(this._currentScale);
        }
    }

    // ── Trigger-коллизия (поглощение предмета) ────────────────────────────

    onTriggerEnter(event: ITriggerEvent): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        const other = event.otherCollider.node;
        const collectable = other.getComponent(Collectable);
        if (collectable) {
            collectable.collect(event.selfCollider.node);
        }
    }

    // ── EventBus handlers ─────────────────────────────────────────────────

    private _onSizeChanged(payload: { scale: number }): void {
        // Увеличиваем размер относительно исходного размера префаба
        this._targetScale.set(
            this._initialScale.x * payload.scale,
            this._initialScale.y,
            this._initialScale.z * payload.scale
        );
    }
}
