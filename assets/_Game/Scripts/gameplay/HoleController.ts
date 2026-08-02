/**
 * HoleController — главный компонент игрока (дыры).
 * Механики:
 *   - HoleMovement → движение по арене
 *   - Trigger-коллизии с Collectable → поглощение
 *   - Collision с Gates (solid) → GATE_TOUCHED → CrossSprite
 *   - Рост: HoleGrowthService твинит scale (см. сервис)
 *
 * RULES §2.1: Все scratch-переменные преаллоцированы, нет new Vec3() в update().
 */

import {
    _decorator, Component, Node as CCNode, ITriggerEvent, ICollisionEvent, RigidBody, Collider
} from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { HoleMovement } from '../core/HoleMovement';
import { Collectable } from './Collectable';
import { Gates } from './Gates';

const { ccclass, property } = _decorator;

@ccclass('HoleController')
export class HoleController extends Component {
    private readonly _movement: HoleMovement = new HoleMovement();

    @property({ type: RigidBody, tooltip: 'Ссылка на RigidBody дыры' })
    rigidBody: RigidBody | null = null;

    @property({ type: Collider, tooltip: 'Коллайдер-триггер для поглощения предметов (если не указан, ищется на текущем узле)' })
    absorbTrigger: Collider | null = null;

    /** Солидный коллайдер дыры (не trigger) — для удара о закрытые ворота. */
    private _solidCollider: Collider | null = null;

    /** Текущая скорость дыры (|v|). */
    get currentSpeed(): number {
        return this._movement.currentSpeed;
    }

    init(): void {
        this._movement.reset(this.rigidBody);
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);

        const trigger = this.absorbTrigger || this.getComponent(Collider);
        if (trigger) {
            trigger.on('onTriggerEnter', this.onTriggerEnter, this);
        } else {
            console.warn('[HoleController] Нет компонента Collider! Сбор предметов работать не будет.');
        }

        // Gates — solid (isTrigger=false). Absorb-trigger меньше тела дыры,
        // поэтому onTriggerEnter до ворот не доходит — слушаем collision на solid.
        this._solidCollider = this._findSolidCollider(trigger);
        if (this._solidCollider) {
            this._solidCollider.on('onCollisionEnter', this.onCollisionEnter, this);
        }
    }

    onDestroy(): void {
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
        const trigger = this.absorbTrigger || this.getComponent(Collider);
        if (trigger) {
            trigger.off('onTriggerEnter', this.onTriggerEnter, this);
        }
        if (this._solidCollider) {
            this._solidCollider.off('onCollisionEnter', this.onCollisionEnter, this);
            this._solidCollider = null;
        }
    }

    update(dt: number): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        if (dt <= 0) return;

        this._movement.update(dt, this.rigidBody, this.node);
    }

    /** EndGame: мгновенно гасим скорость (сглаженную + RigidBody). */
    private _onGameEnd = (): void => {
        this._movement.reset(this.rigidBody);
    };

    onTriggerEnter(event: ITriggerEvent): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        const other = event.otherCollider.node;

        if (this._tryEmitGateTouched(other)) return;

        const collectable = other.getComponent(Collectable);
        if (collectable) {
            collectable.collect(event.selfCollider.node);
        }
    }

    onCollisionEnter(event: ICollisionEvent): void {
        if (!GameStateMachine.is(GameState.Gameplay)) return;
        this._tryEmitGateTouched(event.otherCollider.node);
    }

    private _tryEmitGateTouched(other: CCNode): boolean {
        let node: CCNode | null = other;
        while (node) {
            const gates = node.getComponent(Gates);
            if (gates) {
                EventBus.emit(GameEvent.GATE_TOUCHED, null);
                return true;
            }
            node = node.parent;
        }
        return false;
    }

    private _findSolidCollider(trigger: Collider | null): Collider | null {
        const colliders = this.getComponents(Collider);
        for (let i = 0; i < colliders.length; i++) {
            const c = colliders[i];
            if (c !== trigger && !c.isTrigger) return c;
        }
        if (trigger && !trigger.isTrigger) return trigger;
        return null;
    }
}
