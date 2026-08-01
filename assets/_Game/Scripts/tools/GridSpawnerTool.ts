import { _decorator, Component, Node, Prefab, Vec2, Vec3, instantiate, MeshRenderer } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('GridSpawnerTool')
@executeInEditMode
export class GridSpawnerTool extends Component {

    @property({ type: Prefab, tooltip: 'Префаб для спавна' })
    public prefabToSpawn: Prefab = null;

    @property({ type: Node, tooltip: 'Родительский объект для заспавненных префабов' })
    public parentNode: Node = null;

    @property({ type: Vec2, tooltip: 'Размеры области спавна (ширина X, длина Z)' })
    public spawnBounds: Vec2 = new Vec2(10, 10);

    @property({ tooltip: 'Количество слоев (уровней) вверх' })
    public layersCount: number = 1;

    @property({ tooltip: 'Максимальное количество объектов, которое мы можем заспавнить' })
    public maxTotalObjects: number = 50;

    @property({ type: MeshRenderer, tooltip: 'Перетащите сюда MeshRenderer, чтобы автоматически получить размеры модели' })
    public referenceMesh: MeshRenderer = null;

    @property({ tooltip: 'Размеры одного объекта (X, Y, Z). Можно нажать кнопку ниже, чтобы вычислить их на основе referenceMesh' })
    public objectSize: Vec3 = new Vec3(1, 1, 1);

    @property({ tooltip: 'Нажмите, чтобы рассчитать objectSize на основе referenceMesh' })
    public get calcSizeFromMeshButton(): boolean {
        return false;
    }
    public set calcSizeFromMeshButton(v: boolean) {
        if (v && EDITOR) {
            this.calculateSizeFromMesh();
        }
    }

    @property({ tooltip: 'Минимальное расстояние (padding) между объектами по осям X и Z' })
    public padding: number = 0.5;

    @property({ tooltip: 'Минимальное расстояние (padding) между слоями (по оси Y)' })
    public layerPadding: number = 0.5;

    @property({ tooltip: 'Мин. и Макс. случайное отклонение позиции (Jitter) по X и Z' })
    public positionJitter: Vec2 = new Vec2(0, 0.1);

    @property({ tooltip: 'Нажмите, чтобы заспавнить префабы' })
    public get spawnButton(): boolean {
        return false;
    }
    public set spawnButton(v: boolean) {
        if (v && EDITOR) {
            this.spawnObjects();
        }
    }

    @property({ tooltip: 'Нажмите, чтобы очистить заспавненные объекты' })
    public get clearButton(): boolean {
        return false;
    }
    public set clearButton(v: boolean) {
        if (v && EDITOR) {
            this.clearObjects();
        }
    }

    @property({ hideInInspector: true })
    private _spawnedUUIDs: string[] = [];

    /**
     * Backup позиций: Cocos часто сбрасывает overrides у префабов,
     * заспавненных из скрипта — при Play все съезжают в (0,0,0).
     */
    @property({ type: [Vec3], hideInInspector: true })
    private _savedPositions: Vec3[] = [];

    onLoad() {
        if (!EDITOR) {
            // One-shot: вернуть позиции до старта геймплея, затем убрать tool
            this._applySavedPositions();
            this.destroy();
            return;
        }
        this._restorePositionsIfCollapsed();
    }

    update() {
        if (!EDITOR) return;
        this._restorePositionsIfCollapsed();
    }

    calculateSizeFromMesh() {
        if (!this.referenceMesh) {
            console.warn('[GridSpawner] Пожалуйста, укажите referenceMesh.');
            return;
        }

        let width = this.objectSize.x;
        let height = this.objectSize.y;
        let length = this.objectSize.z;

        if (this.referenceMesh.model && this.referenceMesh.model.worldBounds) {
            const extents = this.referenceMesh.model.worldBounds.halfExtents;
            width = extents.x * 2;
            height = extents.y * 2;
            length = extents.z * 2;
        } else if (this.referenceMesh.mesh) {
            const mesh = this.referenceMesh.mesh;
            if (mesh.struct && mesh.struct.maxPosition && mesh.struct.minPosition) {
                const max = mesh.struct.maxPosition;
                const min = mesh.struct.minPosition;
                width = (max.x - min.x) * Math.abs(this.referenceMesh.node.scale.x);
                height = (max.y - min.y) * Math.abs(this.referenceMesh.node.scale.y);
                length = (max.z - min.z) * Math.abs(this.referenceMesh.node.scale.z);
            }
        } else {
            console.warn('[GridSpawner] Не удалось получить размеры. Убедитесь, что меш назначен и загружен.');
            return;
        }

        this.objectSize = new Vec3(width, height, length);
        console.log(`[GridSpawner] Размеры рассчитаны: X=${width.toFixed(2)}, Y=${height.toFixed(2)}, Z=${length.toFixed(2)}`);
    }

    spawnObjects() {
        if (!this.prefabToSpawn || !this.parentNode) {
            console.warn('[GridSpawner] Пожалуйста, укажите prefabToSpawn и parentNode.');
            return;
        }

        this.clearObjects();

        const minStepX = this.objectSize.x + this.padding;
        const stepY = this.objectSize.y + this.layerPadding;
        const minStepZ = this.objectSize.z + this.padding;

        if (minStepX <= 0 || stepY <= 0 || minStepZ <= 0) {
            console.error('[GridSpawner] Размеры объекта + padding должны быть больше 0.');
            return;
        }

        const objectsPerLayer = Math.ceil(this.maxTotalObjects / Math.max(1, this.layersCount));

        const ratio = this.spawnBounds.x / this.spawnBounds.y;
        let countX = Math.round(Math.sqrt(objectsPerLayer * ratio));
        if (countX < 1) countX = 1;
        let countZ = Math.ceil(objectsPerLayer / countX);

        const maxFitX = Math.floor(this.spawnBounds.x / minStepX);
        const maxFitZ = Math.floor(this.spawnBounds.y / minStepZ);

        countX = Math.min(countX, Math.max(1, maxFitX));
        countZ = Math.min(countZ, Math.max(1, maxFitZ));

        if (countX * countZ === 0) {
            console.warn('[GridSpawner] Область спавна слишком мала для размещения хотя бы одного объекта.');
            return;
        }

        const stepX = this.spawnBounds.x / countX;
        const stepZ = this.spawnBounds.y / countZ;

        const startX = -this.spawnBounds.x / 2 + stepX / 2;
        const startZ = -this.spawnBounds.y / 2 + stepZ / 2;

        let totalSpawned = 0;
        this._savedPositions = [];

        for (let layer = 0; layer < this.layersCount; layer++) {
            const posY = layer * stepY;

            for (let ix = 0; ix < countX; ix++) {
                for (let iz = 0; iz < countZ; iz++) {
                    if (totalSpawned >= this.maxTotalObjects) {
                        break;
                    }

                    const node = instantiate(this.prefabToSpawn);

                    let posX = startX + ix * stepX;
                    let posZ = startZ + iz * stepZ;

                    const jitterRange = this.positionJitter.y - this.positionJitter.x;
                    const jitterDistX = this.positionJitter.x + Math.random() * jitterRange;
                    const jitterDistZ = this.positionJitter.x + Math.random() * jitterRange;

                    posX += (Math.random() > 0.5 ? 1 : -1) * jitterDistX;
                    posZ += (Math.random() > 0.5 ? 1 : -1) * jitterDistZ;

                    // Сначала parent, потом позиция
                    this.parentNode.addChild(node);
                    node.setPosition(posX, posY, posZ);

                    this._spawnedUUIDs.push(node.uuid);
                    this._savedPositions.push(new Vec3(posX, posY, posZ));
                    totalSpawned++;
                }
                if (totalSpawned >= this.maxTotalObjects) {
                    break;
                }
            }
        }

        console.log(
            `[GridSpawner] Успешно заспавнено ${this._spawnedUUIDs.length} объектов` +
            ` на ${this.layersCount} слоях.`
        );
    }

    clearObjects() {
        if (!this.parentNode) return;

        const children = [...this.parentNode.children];
        let clearedCount = 0;

        for (const child of children) {
            if (child && child.isValid) {
                child.destroy();
                clearedCount++;
            }
        }

        this._spawnedUUIDs = [];
        this._savedPositions = [];

        if (clearedCount > 0) {
            console.log(`[GridSpawner] Очищено ${clearedCount} объектов.`);
        }
    }

    /** Принудительно применить backup (нужно на Play — Cocos теряет overrides) */
    private _applySavedPositions(): void {
        if (!this.parentNode || this._savedPositions.length === 0) return;

        const children = this.parentNode.children;
        const count = Math.min(children.length, this._savedPositions.length);
        for (let i = 0; i < count; i++) {
            children[i].setPosition(this._savedPositions[i]);
        }
    }

    /** В редакторе: если все съехали в одну точку — восстановить */
    private _restorePositionsIfCollapsed(): void {
        if (!this.parentNode || this._savedPositions.length === 0) return;

        const children = this.parentNode.children;
        if (children.length === 0 || children.length !== this._savedPositions.length) return;
        if (!this._looksCollapsed(children)) return;

        this._applySavedPositions();
        console.warn('[GridSpawner] Позиции сбросились — восстановлены из backup. Сохраните сцену (Ctrl+S).');
    }

    private _looksCollapsed(children: readonly Node[]): boolean {
        if (children.length < 2) {
            return Vec3.distance(children[0].position, this._savedPositions[0]) > 0.5;
        }

        const a = children[0].position;
        let clustered = true;
        for (let i = 1; i < children.length; i++) {
            if (Vec3.distance(a, children[i].position) > 0.25) {
                clustered = false;
                break;
            }
        }
        if (clustered) return true;

        let mismatch = 0;
        for (let i = 0; i < children.length; i++) {
            if (Vec3.distance(children[i].position, this._savedPositions[i]) > 0.5) {
                mismatch++;
            }
        }
        return mismatch > children.length * 0.5;
    }
}
