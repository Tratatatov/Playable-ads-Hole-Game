/**
 * OptimizationConfig — параметры дистанционной активации объектов.
 * Назначается в Inspector на GameBootstrap; список нод заполняет CollectablesCollectorTool
 * (ищет Collectable, сохраняет node — ссылки на PrefabInstance так сериализуются).
 */

import { _decorator, Component, Node, CCFloat, CCInteger } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('OptimizationConfig')
export class OptimizationConfig extends Component {
    @property({
        tooltip: 'Включить дистанционную активацию (OptimizationService)',
    })
    public cullingEnabled: boolean = true;

    @property({
        type: CCFloat,
        tooltip: 'Радиус (XZ) от игрока: ближе — объект включается (node.active = true)',
        min: 0.1,
    })
    public activationDistance: number = 25;

    @property({
        type: CCFloat,
        tooltip:
            'Запас к радиусу выключения (гистерезис). Выкл. при dist > activation + padding. ' +
            'Убирает мигание на границе.',
        min: 0,
    })
    public deactivationPadding: number = 5;

    @property({
        type: CCInteger,
        tooltip: 'Как часто пересчитывать дистанцию (в кадрах). 1 = каждый кадр.',
        min: 1,
    })
    public updateIntervalFrames: number = 3;

    @property({
        type: [Node],
        tooltip:
            'Ноды collectables (с компонентом Collectable). ' +
            'Заполняет CollectablesCollectorTool → Fetch.',
    })
    public collectables: Node[] = [];
}
