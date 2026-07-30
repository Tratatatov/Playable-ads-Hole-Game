/**
 * CameraControlService — сервис управления камерой.
 * Плавно следует за целью (дырой) используя lerp и параметры из LevelConfig.
 */

import { Node, Vec3 } from 'cc';
import { LEVEL_CONFIG } from '../gameplay/LevelConfig';

export interface ICameraControlService {
    init(camera: Node, target: Node): void;
    update(dt: number): void;
}

class CameraControlServiceImpl implements ICameraControlService {
    private _camera: Node | null = null;
    private _target: Node | null = null;
    
    // Scratch переменные (RULES §2.1: никаких выделений памяти в update)
    private readonly _targetPos: Vec3 = new Vec3();
    private readonly _currentPos: Vec3 = new Vec3();
    private readonly _cameraOffset: Vec3 = new Vec3();

    /**
     * Инициализирует сервис ссылками на объекты и устанавливает камеру в стартовую позицию
     */
    init(camera: Node, target: Node): void {
        this._camera = camera;
        this._target = target;
        
        if (this._camera && this._target && LEVEL_CONFIG) {
            // Вычисляем стартовый оффсет на основе текущего положения камеры и цели в сцене
            const cp = this._camera.position;
            const tp = this._target.position;
            this._cameraOffset.set(
                cp.x - tp.x,
                cp.y - tp.y,
                cp.z - tp.z
            );
            
            // Камера уже стоит там, где нужно, поэтому двигать ее мгновенно никуда не надо,
            // просто запомнили оффсет.
            
            // Если камера должна смотреть на цель, можно добавить _camera.lookAt(tp),
            // но в Cocos это часто настраивается жестким поворотом через редактор.
        } else {
            console.warn('[CameraControlService] Камера или цель не переданы в init!');
        }
    }

    /**
     * Плавное следование за целью (вызывается в lateUpdate из GameBootstrap)
     */
    update(dt: number): void {
        if (!this._camera || !this._target || !LEVEL_CONFIG) return;

        const tp = this._target.position;
        
        // Целевая позиция с учетом вычисленного смещения
        this._targetPos.set(
            tp.x + this._cameraOffset.x,
            tp.y + this._cameraOffset.y,
            tp.z + this._cameraOffset.z
        );

        // Текущая позиция
        this._currentPos.set(this._camera.position);

        // Линейная интерполяция
        this._currentPos.lerp(this._targetPos, dt * LEVEL_CONFIG.cameraLerpSpeed);

        this._camera.setPosition(this._currentPos);
    }
}

export let CameraControlService: ICameraControlService = new CameraControlServiceImpl();
