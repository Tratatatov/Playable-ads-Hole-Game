/**
 * HoleController — главный компонент игрока (дыры).
 * Аналог Unity HoleController.cs.
 * Механики:
 *   - Читает InputService → движение по арене
 *   - Trigger-коллизии с Collectable → поглощение
 *   - Масштаб пересчитывается по GameStore.holeScale (через EventBus)
 *
 * RULES §2.1: Все scratch-переменные преаллоцированы, нет new Vec3() в update().
 */

import {
    _decorator, Component, Node, Vec3, ITriggerEvent, tween, Tween, RigidBody, Collider
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
    private readonly _moveDir: Vec3 = new Vec3();
    private readonly _newPos: Vec3 = new Vec3();
    private readonly _targetScale: Vec3 = new Vec3();
    private readonly _currentScale: Vec3 = new Vec3();
    private readonly _initialScale: Vec3 = new Vec3(); // Исходный масштаб из префаба

    // ── Состояние ────────────────────────────────────────────────────────
    @property({ type: RigidBody, tooltip: 'Ссылка на RigidBody дыры' })
    rigidBody: RigidBody | null = null;

    @property({ type: Collider, tooltip: 'Коллайдер-триггер для поглощения предметов (если не указан, ищется на текущем узле)' })
    absorbTrigger: Collider | null = null;

    private _currentSpeed: number = 0;
    private _scaleTween: Tween<Node> | null = null;

    // ── Размеры арены ────────────────────────────────────────────────────
    private _half: number = 0;

    init(): void {
        this._currentSpeed = LEVEL_CONFIG.holeDefaultSpeed;
        this._half = LEVEL_CONFIG.arenaHalfSize;

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

        // Если нет касания, inputDelta будет (0,0), и мы сбросим скорость ниже
        const inputDelta = InputService.consumeDelta();
        if (!InputService.isTouching || (inputDelta.x === 0 && inputDelta.y === 0)) {
            if (this.rigidBody) {
                this._moveDir.set(0, 0, 0);
                this.rigidBody.setLinearVelocity(this._moveDir);
            }
            return;
        }

        if (!this.rigidBody) {
            console.warn('[HoleController] ВНИМАНИЕ: RigidBody не назначен в инспекторе! Падение в фолбэк setPosition (может не работать с физикой).');
        }

        if (this.rigidBody) {
            // Виртуальный джойстик дает постоянный вектор направления [-1, 1]
            // Поэтому просто умножаем его на скорость
            this._moveDir.set(
                inputDelta.x * this._currentSpeed,
                0,
                -inputDelta.y * this._currentSpeed
            );
            this.rigidBody.setLinearVelocity(this._moveDir);
        } else {
            // Фолбэк: Кинематическое движение без RigidBody
            this._moveDir.set(
                inputDelta.x * this._currentSpeed,
                0,
                -inputDelta.y * this._currentSpeed
            );

            const p = this.node.position;
            const hs = this._half - this.node.scale.x * 0.5;
            this._newPos.set(
                Math.max(-hs, Math.min(hs, p.x + this._moveDir.x)),
                p.y,
                Math.max(-hs, Math.min(hs, p.z + this._moveDir.z)),
            );
            this.node.setPosition(this._newPos);
        }

        // LERP-сглаживание масштаба дыры к целевому значению _targetScale
        if (!this.node.scale.equals(this._targetScale, 0.0001)) {
            Vec3.lerp(this._currentScale, this.node.scale, this._targetScale, Math.min(1, dt * LEVEL_CONFIG.holeScaleLerpSpeed));
            this.node.setScale(this._currentScale);
        }
    }

    // ── Trigger-коллизия (поглощение предмета) ────────────────────────────

    onTriggerEnter(event: ITriggerEvent): void {
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

        // Скорость растёт пропорционально размеру (RULES §5.2)
        const raw = LEVEL_CONFIG.holeDefaultSpeed * (1 + (payload.scale - 1) * LEVEL_CONFIG.speedScaleMult);
        this._currentSpeed = Math.max(
            LEVEL_CONFIG.holeMinSpeed,
            Math.min(LEVEL_CONFIG.holeMaxSpeed, raw),
        );
    }
}
