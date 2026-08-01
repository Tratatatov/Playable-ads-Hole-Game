/**
 * HoleController — главный компонент игрока (дыры).
 * Механики:
 *   - HoleMovement → движение по арене
 *   - Trigger-коллизии с Collectable → поглощение
 *   - Рост: HoleGrowthService → HOLE_SIZE_CHANGED → целевой scale; здесь Lerp к нему
 *
 * RULES §2.1: Все scratch-переменные преаллоцированы, нет new Vec3() в update().
 */

import {
    _decorator, Component, Vec3, ITriggerEvent, RigidBody, Collider
} from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { HoleMovement } from '../core/HoleMovement';
import { LEVEL_CONFIG } from './LevelConfig';
import { Collectable } from './Collectable';

const { ccclass, property } = _decorator;

@ccclass('HoleController')
export class HoleController extends Component {
    private readonly _movement: HoleMovement = new HoleMovement();
    private readonly _targetScale: Vec3 = new Vec3();
    private readonly _currentScale: Vec3 = new Vec3();
    private readonly _initialScale: Vec3 = new Vec3();

    @property({ type: RigidBody, tooltip: 'Ссылка на RigidBody дыры' })
    rigidBody: RigidBody | null = null;

    @property({ type: Collider, tooltip: 'Коллайдер-триггер для поглощения предметов (если не указан, ищется на текущем узле)' })
    absorbTrigger: Collider | null = null;

    init(): void {
        this._initialScale.set(this.node.scale);
        this._targetScale.set(this.node.scale);
        this._currentScale.set(this.node.scale);
        this._movement.reset();

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

    update(dt: number): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        if (dt <= 0) return;

        this._movement.update(dt, this.rigidBody, this.node);

        if (!this.node.scale.equals(this._targetScale, 0.0001)) {
            Vec3.lerp(this._currentScale, this.node.scale, this._targetScale, Math.min(1, dt * LEVEL_CONFIG.holeScaleLerpSpeed));
            this.node.setScale(this._currentScale);
        }
    }

    onTriggerEnter(event: ITriggerEvent): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        const other = event.otherCollider.node;
        const collectable = other.getComponent(Collectable);
        if (collectable) {
            collectable.collect(event.selfCollider.node);
        }
    }

    private _onSizeChanged(payload: { scale: number }): void {
        this._targetScale.set(
            this._initialScale.x * payload.scale,
            this._initialScale.y,
            this._initialScale.z * payload.scale
        );
    }
}
