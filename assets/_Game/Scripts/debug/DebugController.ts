import { _decorator, Component, input, Input, EventKeyboard, KeyCode, Vec3, RigidBody, director, Vec2 } from 'cc';
import { GameBootstrap } from '../GameBootstrap';
import { HoleController } from '../gameplay/HoleController';

const { ccclass, property } = _decorator;

@ccclass('DebugController')
export class DebugController extends Component {
    @property({ type: HoleController, tooltip: 'Ссылка на дыру' })
    holeController: HoleController | null = null;

    @property({ type: RigidBody, tooltip: 'Ссылка на RigidBody дыры (для движения через физику)' })
    rigidBody: RigidBody | null = null;

    @property({ type: GameBootstrap, tooltip: 'Ссылка на GameBootstrap (для проверки isDebugMode)' })
    bootstrap: GameBootstrap | null = null;

    @property({ tooltip: 'Скорость WASD управления' })
    speed: number = 10;

    private _keys: Set<KeyCode> = new Set();
    private _scratchVel: Vec3 = new Vec3();

    // ── Переменные для тестового тача ──
    private _isDragging: boolean = false;
    private _touchStart: Vec2 = new Vec2();
    private _touchDir: Vec2 = new Vec2();

    start() {
        if (!this.bootstrap || !this.bootstrap.isDebugMode) {
            this._disableSelf();
            return;
        }

        this._log('Режим отладки активирован! WASD управление включено.');

        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        // Логирование кликов/тачей для отладки + старт перетаскивания
        input.on(Input.EventType.TOUCH_START, this._onTouchLog, this);
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseLog, this);

        // Управление через тач в дебаге
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.MOUSE_UP, this._onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this._onTouchLog, this);
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseLog, this);

        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.MOUSE_UP, this._onTouchEnd, this);
    }

    private _log(msg: string) {
        console.log(`%c[Debug] ${msg}`, 'color: yellow;');
    }

    private _onTouchLog(e: any) {
        this._log(`Touch Start зарегистрирован. Координаты: ${e.getLocation()}`);
        this._startDrag(e.getLocation());
    }

    private _onMouseLog(e: any) {
        this._log(`Mouse Down зарегистрирован. Координаты: ${e.getLocation()}`);
        this._startDrag(e.getLocation());
    }

    private _startDrag(loc: any) {
        this._isDragging = true;
        this._touchStart.set(loc);
        this._touchDir.set(0, 0);
    }

    private _onTouchMove(e: any) {
        if (!this._isDragging) return;
        const loc = e.getLocation();
        const sens = 100; // Чувствительность
        this._touchDir.set(
            Math.max(-1, Math.min(1, (loc.x - this._touchStart.x) / sens)),
            Math.max(-1, Math.min(1, (loc.y - this._touchStart.y) / sens))
        );
    }

    private _onTouchEnd() {
        this._isDragging = false;
        this._touchDir.set(0, 0);
    }

    private _disableSelf() {
        this.node.active = false;
        this.enabled = false;
    }

    private _onKeyDown(e: EventKeyboard) {
        this._keys.add(e.keyCode);
    }

    private _onKeyUp(e: EventKeyboard) {
        this._keys.delete(e.keyCode);
    }

    update(dt: number) {
        if (!this.holeController) return;

        let x = 0;
        let z = 0;

        if (this._keys.has(KeyCode.KEY_W)) z -= 1;
        if (this._keys.has(KeyCode.KEY_S)) z += 1;
        if (this._keys.has(KeyCode.KEY_A)) x -= 1;
        if (this._keys.has(KeyCode.KEY_D)) x += 1;

        if (x !== 0 || z !== 0) {
            this._scratchVel.set(x, 0, z);
            this._scratchVel.normalize().multiplyScalar(this.speed);
        } else if (this._isDragging) {
            this._scratchVel.set(
                this._touchDir.x * this.speed,
                0,
                -this._touchDir.y * this.speed
            );
        } else {
            // Если нет ввода, жестко обнуляем скорость для чистоты теста
            if (this.rigidBody) {
                this._scratchVel.set(0, 0, 0);
                this.rigidBody.setLinearVelocity(this._scratchVel);
            }
            return;
        }

        if (this.rigidBody) {
            // Движение "через физику" (установка скорости)
            this.rigidBody.setLinearVelocity(this._scratchVel);
        } else {
            // Кинематическое движение, если RigidBody не используется для передвижения дыры
            const p = this.holeController.node.position;
            this._scratchVel.multiplyScalar(dt);
            this.holeController.node.setPosition(p.x + this._scratchVel.x, p.y, p.z + this._scratchVel.z);
        }
    }
}
