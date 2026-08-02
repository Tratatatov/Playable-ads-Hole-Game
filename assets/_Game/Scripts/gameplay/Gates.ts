/**
 * Gates — маркер ворот для триггер-коллизии с дырой.
 * При касании HoleController эмитит GameEvent.GATE_TOUCHED.
 * Ссылки на View назначаются в Inspector (как Card).
 */

import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Gates')
export class Gates extends Component {
    @property({ type: Node, tooltip: 'Визуал ворот (jump↑ → fall↓ при DOOR_OPENED)' })
    view: Node = null!;
}
