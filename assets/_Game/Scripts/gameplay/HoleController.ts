/**
 * HoleController — главный компонент игрока (дыры).
 * Механики:
 *   - HoleMovement → движение по арене
 *   - Trigger-коллизии с Collectable → поглощение
 *   - Рост: HoleGrowthService твинит scale (см. сервис)
 *
 * RULES §2.1: Все scratch-переменные преаллоцированы, нет new Vec3() в update().
 */

import {
    _decorator, Component, ITriggerEvent, RigidBody, Collider
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

    /** Текущая скорость дыры (|v|). */
    get currentSpeed(): number {
        return this._movement.currentSpeed;
    }

    init(): void {
        this._movement.reset(this.rigidBody);
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);

        const collider = this.absorbTrigger || this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onTriggerEnter, this);
        } else {
            console.warn('[HoleController] Нет компонента Collider! Сбор предметов работать не будет.');
        }
    }

    onDestroy(): void {
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
        const collider = this.absorbTrigger || this.getComponent(Collider);
        if (collider) {
            collider.off('onTriggerEnter', this.onTriggerEnter, this);
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

        const gates = other.getComponent(Gates);
        if (gates) {
            EventBus.emit(GameEvent.GATE_TOUCHED, null);
            return;
        }

        const collectable = other.getComponent(Collectable);
        if (collectable) {
            collectable.collect(event.selfCollider.node);
        }
    }
}
