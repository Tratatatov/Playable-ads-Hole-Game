import { _decorator, Component, input, Input, EventKeyboard, KeyCode, director, RichText } from 'cc';
import { GameBootstrap } from '../GameBootstrap';
import { HoleController } from '../gameplay/HoleController';
import { Collectable, CollectableType } from '../gameplay/Collectable';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

const { ccclass, property } = _decorator;

/** Хоткеи мгновенного сбора по цвету (только debug). */
const DEBUG_COLLECT_HOTKEYS: ReadonlyArray<{ key: KeyCode; numpad: KeyCode; type: CollectableType }> = [
    { key: KeyCode.DIGIT_1, numpad: KeyCode.NUM_1, type: CollectableType.Blue },
    { key: KeyCode.DIGIT_2, numpad: KeyCode.NUM_2, type: CollectableType.Red },
    { key: KeyCode.DIGIT_3, numpad: KeyCode.NUM_3, type: CollectableType.Teal },
    { key: KeyCode.DIGIT_4, numpad: KeyCode.NUM_4, type: CollectableType.Green },
];

@ccclass('DebugController')
export class DebugController extends Component {
    @property({ type: HoleController, tooltip: 'Ссылка на дыру' })
    holeController: HoleController | null = null;

    @property({ type: GameBootstrap, tooltip: 'Ссылка на GameBootstrap (для проверки isDebugMode)' })
    bootstrap: GameBootstrap | null = null;

    @property({ type: RichText, tooltip: 'RichText для вывода текущей скорости Hole' })
    speedRichText: RichText | null = null;

    start() {
        if (!this.bootstrap || !this.bootstrap.isDebugMode) {
            this._disableSelf();
            return;
        }

        this._log('Режим отладки: 1/2/3/4 — collect all Blue/Red/Teal/Green.');

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
        for (let i = 0; i < DEBUG_COLLECT_HOTKEYS.length; i++) {
            const bind = DEBUG_COLLECT_HOTKEYS[i];
            if (e.keyCode === bind.key || e.keyCode === bind.numpad) {
                this._debugCollectAllOfType(bind.type);
                return;
            }
        }
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
        const maxSpeed = LEVEL_CONFIG ? LEVEL_CONFIG.holeMaxSpeed : 0;
        this.speedRichText.string = `Speed: ${holeSpeed.toFixed(2)} / ${maxSpeed.toFixed(2)}`;
    }
}
