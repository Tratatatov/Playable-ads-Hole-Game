import { _decorator, Component, input, Input, EventKeyboard, KeyCode, director, RichText } from 'cc';
import { GameBootstrap } from '../GameBootstrap';
import { HoleController } from '../gameplay/HoleController';
import { Collectable, CollectableType } from '../gameplay/Collectable';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameStore } from '../core/GameStore';
import { GameState, GameStateMachine } from '../core/GameStateMachine';
import { HoleGrowthService } from '../core/HoleGrowthService';
import { UIMessagesService } from '../ui/UIMessagesService';

const { ccclass, property } = _decorator;

/** Хоткеи мгновенного сбора по цвету (только debug). */
const DEBUG_COLLECT_HOTKEYS: ReadonlyArray<{ key: KeyCode; numpad: KeyCode; type: CollectableType }> = [
    { key: KeyCode.DIGIT_1, numpad: KeyCode.NUM_1, type: CollectableType.Blue },
    { key: KeyCode.DIGIT_2, numpad: KeyCode.NUM_2, type: CollectableType.Red },
    { key: KeyCode.DIGIT_3, numpad: KeyCode.NUM_3, type: CollectableType.Teal },
    { key: KeyCode.DIGIT_4, numpad: KeyCode.NUM_4, type: CollectableType.Green },
];

/** Цикл открытия дверей по ZXC-хоткею X. */
const DEBUG_DOOR_CLEARED_EVENTS: ReadonlyArray<{
    type: CollectableType;
    event: GameEvent.TYPE_BLUE_CLEARED | GameEvent.TYPE_RED_CLEARED | GameEvent.TYPE_GREEN_CLEARED | GameEvent.TYPE_TEAL_CLEARED;
}> = [
    { type: CollectableType.Blue, event: GameEvent.TYPE_BLUE_CLEARED },
    { type: CollectableType.Red, event: GameEvent.TYPE_RED_CLEARED },
    { type: CollectableType.Green, event: GameEvent.TYPE_GREEN_CLEARED },
    { type: CollectableType.Teal, event: GameEvent.TYPE_TEAL_CLEARED },
];

@ccclass('DebugController')
export class DebugController extends Component {
    @property({ type: HoleController, tooltip: 'Ссылка на дыру' })
    holeController: HoleController | null = null;

    @property({ type: GameBootstrap, tooltip: 'Ссылка на GameBootstrap (для проверки isDebugMode)' })
    bootstrap: GameBootstrap | null = null;

    @property({ type: RichText, tooltip: 'RichText для вывода текущей скорости Hole' })
    speedRichText: RichText | null = null;

    private _doorCycleIndex: number = 0;

    start() {
        if (!this.bootstrap || !this.bootstrap.isDebugMode) {
            this._disableSelf();
            return;
        }

        this._log(
            'Режим отладки: 1/2/3/4 — collect Blue/Red/Teal/Green; ' +
            'Z — рост дыры; X — открыть дверь; C — PerfectMessage; V — EndGame.'
        );

        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    update(_dt: number) {
        this._updateSpeedLabel();
    }

    private _log(msg: string) {
        console.log(`%c[Debug] ${msg}`, 'color: yellow;');
    }

    private _disableSelf() {
        this.node.active = false;
        this.enabled = false;
    }

    private _onKeyDown(e: EventKeyboard) {
        if (e.keyCode === KeyCode.KEY_Z) {
            this._debugForceHoleGrowth();
            return;
        }
        if (e.keyCode === KeyCode.KEY_X) {
            this._debugOpenNextDoor();
            return;
        }
        if (e.keyCode === KeyCode.KEY_C) {
            this._debugPerfectMessage();
            return;
        }
        if (e.keyCode === KeyCode.KEY_V) {
            this._debugEndGame();
            return;
        }

        for (let i = 0; i < DEBUG_COLLECT_HOTKEYS.length; i++) {
            const bind = DEBUG_COLLECT_HOTKEYS[i];
            if (e.keyCode === bind.key || e.keyCode === bind.numpad) {
                this._debugCollectAllOfType(bind.type);
                return;
            }
        }
    }

    /** Z — следующий порог роста дыры (HoleGrowthService → HOLE_SIZE_CHANGED). */
    private _debugForceHoleGrowth(): void {
        const ok = HoleGrowthService.forceNextGrowth();
        this._log(ok ? `Hole growth → scale=${GameStore.holeScale}` : 'Hole growth: max threshold already');
    }

    /** X — TYPE_*_CLEARED → DoorService открывает следующую дверь по циклу. */
    private _debugOpenNextDoor(): void {
        const bind = DEBUG_DOOR_CLEARED_EVENTS[this._doorCycleIndex % DEBUG_DOOR_CLEARED_EVENTS.length];
        this._doorCycleIndex++;
        EventBus.emit(bind.event, null);
        this._log(`Door open → ${CollectableType[bind.type]} (TYPE_*_CLEARED)`);
    }

    /** C — PerfectMessage (как каждые 20–40 ITEM_COLLECTED). */
    private _debugPerfectMessage(): void {
        const count = GameStore.collectedCount;
        UIMessagesService.showPerfectMessage();
        EventBus.emit(GameEvent.PERFECT_MESSAGE, { collectedCount: count });
        this._log(`PerfectMessage (collected=${count})`);
    }

    /** V — EndGame (как TIMER_EXPIRED). Работает только из Gameplay. */
    private _debugEndGame(): void {
        if (!GameStateMachine.is(GameState.Gameplay)) {
            this._log(`EndGame: сейчас ${GameStateMachine.current}, нужен Gameplay`);
            return;
        }
        EventBus.emit(GameEvent.TIMER_EXPIRED, null);
        this._log('EndGame (TIMER_EXPIRED)');
    }

    /** Debug: Collectable.collect() для всех активных предметов типа. */
    private _debugCollectAllOfType(type: CollectableType): void {
        const scene = director.getScene();
        if (!scene) return;

        const items = scene.getComponentsInChildren(Collectable);
        const holeNode = this.holeController?.node;
        let collected = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || !item.isValid || !item.node.active) continue;
            if (item.type !== type) continue;
            item.collect(holeNode);
            collected++;
        }

        this._log(`Collect ${CollectableType[type]} × ${collected}`);
    }

    private _updateSpeedLabel(): void {
        if (!this.speedRichText) return;

        const holeSpeed = this.holeController ? this.holeController.currentSpeed : 0;
        const maxSpeed = GameStore.holeMaxSpeed;
        this.speedRichText.string = `Speed: ${holeSpeed.toFixed(2)} / ${maxSpeed.toFixed(2)}`;
    }
}
