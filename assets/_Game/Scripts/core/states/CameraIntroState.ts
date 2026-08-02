/**
 * CameraIntroState — пролёт камеры A → B при старте.
 * Управление отключено; по завершении → TutorialState.
 */
import { Vec3 } from 'cc';
import { CameraConfig } from '../CameraConfig';
import { CameraControlService } from '../CameraControlService';
import { EventBus, GameEvent } from '../EventBus';
import { IGamePhase } from './IGamePhase';

export class CameraIntroState implements IGamePhase {
    private readonly _from: Vec3 = new Vec3();
    private readonly _to: Vec3 = new Vec3();
    private _completed: boolean = false;

    constructor(private readonly _config: CameraConfig | null) {}

    enter(): void {
        this._completed = false;
        CameraControlService.setFollowEnabled(false);

        const cfg = this._config;
        const pointA = cfg?.introPointA ?? null;
        const pointB = cfg?.introPointB ?? null;
        const enabled = cfg ? cfg.introEnabled : false;

        if (!enabled || !pointA || !pointB) {
            this._finish();
            return;
        }

        pointA.getWorldPosition(this._from);
        pointB.getWorldPosition(this._to);
        CameraControlService.moveTo(this._from, this._to, undefined, () => {
            this._finish();
        });
    }

    exit(): void {
        // Follow включаем после прилёта — offset пересчитается от текущей позиции B
        CameraControlService.setFollowEnabled(true);
    }

    private _finish(): void {
        if (this._completed) return;
        this._completed = true;
        EventBus.emit(GameEvent.CAMERA_INTRO_COMPLETE, null);
    }
}
