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
        tooltip:
            'Радиус (XZ) от mainCamera: ближе — soft-uncull MeshRenderer. ' +
            'На CameraIntro все включены (resetAll), после пролёта — applyNow.',
        min: 0.1,
    })
    public activationDistance: number = 35;

    @property({
        type: CCFloat,
        tooltip:
            'Запас к радиусу выключения (гистерезис). Выкл. при dist > activation + padding. ' +
            'Убирает мигание на границе.',
        min: 0,
    })
    public deactivationPadding: number = 8;

    @property({
        type: CCInteger,
        tooltip: 'Как часто пересчитывать дистанцию (в кадрах). 1 = каждый кадр.',
        min: 1,
    })
    public updateIntervalFrames: number = 2;

    @property({
        type: CCInteger,
        tooltip:
            'Макс. soft-cull переключений за один проход (размазывает hitch). ' +
            'applyNow/init — без лимита.',
        min: 1,
    })
    public maxTogglesPerPass: number = 48;

    @property({
        type: [Node],
        tooltip:
            'Ноды collectables (с компонентом Collectable). ' +
            'Заполняет CollectablesCollectorTool → Fetch.',
    })
    public collectables: Node[] = [];
}
