/**
 * CollectableContainer — хранилище данных коллекции + батчевая активация физики.
 * Счётчики / кэш — CollectableCounterTool; старт цепочки — CollectableCollectionService.
 * Активация: по Z ↓, параметры батча — из BATCHING_CONFIG (GameBootstrap).
 */

import { _decorator, Component, Node, RigidBody, Collider, ERigidBodyType, Enum } from 'cc';
import { CollectableType } from './Collectable';
import { BATCHING_CONFIG } from './BatchingConfig';

const { ccclass, property } = _decorator;

const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_INTERVAL_FRAMES = 1;

@ccclass('CollectableContainer')
export class CollectableContainer extends Component {
    @property({ tooltip: 'Всего Collectable в parentNode' })
    public totalCount: number = 0;

    @property({ tooltip: 'Blue' })
    public blueCount: number = 0;

    @property({ tooltip: 'Red' })
    public redCount: number = 0;

    @property({ tooltip: 'Green' })
    public greenCount: number = 0;

    @property({ tooltip: 'Teal' })
    public tealCount: number = 0;

    @property({ type: Node, tooltip: 'Узел, в котором лежат Collectable / физика' })
    public parentNode: Node = null!;

    @property({ type: Enum(ERigidBodyType), tooltip: 'Тип RigidBody, применяемый сервисом при init' })
    public rigidBodyTypeOnPlay: ERigidBodyType = ERigidBodyType.STATIC;

    @property({ type: [RigidBody], tooltip: 'Кэш RigidBody (заполняет CollectableCounterTool)' })
    public rigidBodies: RigidBody[] = [];

    @property({ type: [Collider], tooltip: 'Кэш Collider (заполняет CollectableCounterTool)' })
    public colliders: Collider[] = [];

    private _activating: boolean = false;
    private _bodyQueue: RigidBody[] = [];
    private _colQueue: Collider[] = [];
    private _bodyIndex: number = 0;
    private _colIndex: number = 0;
    private _wakeBudget: number = 0;
    private _woken: number = 0;
    private _framesUntilBatch: number = 0;
    /** Фокус для nearest-first (камера / дыра). NaN = fallback Z ↓ */
    private static _sortFocusX: number = NaN;
    private static _sortFocusZ: number = NaN;

    /** Счётчики по типам */
    public getCounts(): Record<CollectableType, number> {
        return {
            [CollectableType.Blue]: this.blueCount,
            [CollectableType.Red]: this.redCount,
            [CollectableType.Green]: this.greenCount,
            [CollectableType.Teal]: this.tealCount,
        };
    }

    private _getBatchSize(): number {
        return BATCHING_CONFIG?.batchSize ?? DEFAULT_BATCH_SIZE;
    }

    private _getIntervalFrames(): number {
        return BATCHING_CONFIG?.intervalFrames ?? DEFAULT_INTERVAL_FRAMES;
    }

    /**
     * Асинхронная активация батчами по BatchingConfig.
     * @param wakeUpPercent доля RB (0..100), у которых вызвать wakeUp
     * @param focusX/focusZ — nearest-first от этой точки (обычно камера); иначе Z ↓
     */
    public activate(
        wakeUpPercent: number = 33,
        focusX: number = Number.NaN,
        focusZ: number = Number.NaN
    ): void {
        this._cancelActivation();
        this.ensurePhysicsCache();

        this._bodyQueue.length = 0;
        this._colQueue.length = 0;

        CollectableContainer._sortFocusX = focusX;
        CollectableContainer._sortFocusZ = focusZ;
        const useFocus = Number.isFinite(focusX) && Number.isFinite(focusZ);
        const cmp = useFocus
            ? CollectableContainer._compareByDistAsc
            : CollectableContainer._compareByZDesc;

        const bodies = this.rigidBodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body && body.isValid) {
                this._bodyQueue.push(body);
            }
        }
        this._bodyQueue.sort(cmp);

        const cols = this.colliders;
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (col && col.isValid) {
                this._colQueue.push(col);
            }
        }
        this._colQueue.sort(cmp);

        const pct = Math.max(0, Math.min(100, wakeUpPercent));
        this._wakeBudget = Math.ceil(this._bodyQueue.length * (pct / 100));
        this._woken = 0;
        this._bodyIndex = 0;
        this._colIndex = 0;
        this._framesUntilBatch = 0;
        this._activating = this._bodyQueue.length > 0 || this._colQueue.length > 0;

        console.log(
            `[CollectableContainer] ACTIVATE "${this.node.name}": ` +
            `RB=${this._bodyQueue.length}, Col=${this._colQueue.length}, ` +
            `batch=${this._getBatchSize()} every ${this._getIntervalFrames()}f, ` +
            `wakeUp=${this._wakeBudget}, sort=${useFocus ? 'nearest' : 'Z↓'}`
        );

        if (!this._activating) {
            console.warn(
                `[CollectableContainer] ACTIVATE "${this.node.name}": ` +
                `0 компонентов! Проверь parentNode и Fetch Physics.`
            );
        }
    }

    /** Мгновенное выключение всей физики + отмена батча */
    public deactivate(): void {
        this._cancelActivation();
        this.ensurePhysicsCache();

        let bodiesOn = 0;
        const bodies = this.rigidBodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body && body.isValid) {
                body.enabled = false;
                bodiesOn++;
            }
        }

        let colsOn = 0;
        const cols = this.colliders;
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (col && col.isValid) {
                col.enabled = false;
                colsOn++;
            }
        }

        console.log(
            `[CollectableContainer] DEACTIVATE "${this.node.name}": ` +
            `RB=${bodiesOn}/${bodies.length}, Col=${colsOn}/${cols.length}`
        );
    }

    public ensurePhysicsCache(): void {
        if (!this.parentNode) {
            console.warn(
                `[CollectableContainer] "${this.node.name}": parentNode=null — кэш физики пуст`
            );
            return;
        }

        const needBodies = this.rigidBodies.length === 0
            || this.rigidBodies.every((b) => !b || !b.isValid);
        const needCols = this.colliders.length === 0
            || this.colliders.every((c) => !c || !c.isValid);

        if (needBodies) {
            this.rigidBodies = this.parentNode.getComponentsInChildren(RigidBody);
            console.log(
                `[CollectableContainer] "${this.node.name}": refetch RigidBody → ${this.rigidBodies.length}`
            );
        }
        if (needCols) {
            this.colliders = this.parentNode.getComponentsInChildren(Collider);
            console.log(
                `[CollectableContainer] "${this.node.name}": refetch Collider → ${this.colliders.length}`
            );
        }
    }

    public applyRigidBodyType(type: ERigidBodyType): void {
        const bodies = this.rigidBodies;
        let changed = 0;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (!body || !body.isValid) continue;
            if (body.type !== type) {
                body.type = type;
                changed++;
            }
        }
        if (changed > 0) {
            console.log(
                `[CollectableContainer] "${this.node.name}": RB type → ${type}, changed=${changed}`
            );
        }
    }

    update(_dt: number): void {
        if (!this._activating) return;

        if (this._framesUntilBatch > 0) {
            this._framesUntilBatch--;
            return;
        }

        const batch = Math.max(1, this._getBatchSize() | 0);
        const bodyEnd = Math.min(this._bodyIndex + batch, this._bodyQueue.length);
        for (let i = this._bodyIndex; i < bodyEnd; i++) {
            const body = this._bodyQueue[i];
            if (!body || !body.isValid) continue;
            if (body.type !== ERigidBodyType.DYNAMIC) {
                body.type = ERigidBodyType.DYNAMIC;
            }
            body.enabled = true;
            if (this._woken < this._wakeBudget) {
                body.wakeUp();
                this._woken++;
            }
        }
        this._bodyIndex = bodyEnd;

        const colEnd = Math.min(this._colIndex + batch, this._colQueue.length);
        for (let i = this._colIndex; i < colEnd; i++) {
            const col = this._colQueue[i];
            if (!col || !col.isValid) continue;
            col.enabled = true;
        }
        this._colIndex = colEnd;

        if (this._bodyIndex >= this._bodyQueue.length && this._colIndex >= this._colQueue.length) {
            this._activating = false;
            console.log(
                `[CollectableContainer] ACTIVATE done "${this.node.name}": ` +
                `wakeUp=${this._woken}/${this._bodyQueue.length}`
            );
            this._bodyQueue.length = 0;
            this._colQueue.length = 0;
            return;
        }

        // Пауза N-1 кадров до следующего батча (N=1 → сразу на следующем update)
        this._framesUntilBatch = Math.max(1, this._getIntervalFrames() | 0) - 1;
    }

    private _cancelActivation(): void {
        this._activating = false;
        this._bodyQueue.length = 0;
        this._colQueue.length = 0;
        this._bodyIndex = 0;
        this._colIndex = 0;
        this._wakeBudget = 0;
        this._woken = 0;
        this._framesUntilBatch = 0;
    }

    private static _compareByZDesc(a: { node: Node }, b: { node: Node }): number {
        return b.node.worldPosition.z - a.node.worldPosition.z;
    }

    private static _compareByDistAsc(a: { node: Node }, b: { node: Node }): number {
        const fx = CollectableContainer._sortFocusX;
        const fz = CollectableContainer._sortFocusZ;
        const ap = a.node.worldPosition;
        const bp = b.node.worldPosition;
        const adx = ap.x - fx;
        const adz = ap.z - fz;
        const bdx = bp.x - fx;
        const bdz = bp.z - fz;
        return (adx * adx + adz * adz) - (bdx * bdx + bdz * bdz);
    }
}
