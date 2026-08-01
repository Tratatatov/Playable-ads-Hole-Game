import { _decorator, Component, Node, RigidBody, Collider, ERigidBodyType, Enum } from 'cc';
import { EDITOR } from 'cc/env';
import { Collectable, CollectableType } from '../gameplay/Collectable';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * CollectableCounterTool — editor + runtime коллекция одного цвета.
 * Editor: fetch counts / RigidBody / Collider, выставление типа RB.
 * Runtime: НЕ уничтожается — сервис включает/выключает кэшированные RB и Collider.
 */
@ccclass('CollectableCounterTool')
@executeInEditMode
export class CollectableCounterTool extends Component {

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

    @property({ type: Node, tooltip: 'Узел, в котором искать Collectable / физику' })
    public parentNode: Node = null!;

    /**
     * Prefab-инстансы при Play сбрасывают type к ассету.
     * Значение сериализуется на tool и заново применяется в onLoad.
     */
    @property({ type: Enum(ERigidBodyType), tooltip: 'Тип RigidBody, который применяется при Play' })
    public rigidBodyTypeOnPlay: ERigidBodyType = ERigidBodyType.STATIC;

    @property({ type: [RigidBody], tooltip: 'Кэш RigidBody (Fetch Physics). Используется сервисом в runtime.' })
    public rigidBodies: RigidBody[] = [];

    @property({ type: [Collider], tooltip: 'Кэш Collider (Fetch Physics). Используется сервисом в runtime.' })
    public colliders: Collider[] = [];

    private _physicsActive: boolean = true;

    /** Текущее состояние физики коллекции (после activate/deactivate) */
    public get isPhysicsActive(): boolean {
        return this._physicsActive;
    }

    @property({ tooltip: 'Нажмите, чтобы пересчитать Collectable по типам' })
    public get fetchButton(): boolean {
        return false;
    }
    public set fetchButton(v: boolean) {
        if (v && EDITOR) {
            this.fetchCollectables();
        }
    }

    @property({ tooltip: 'Нажмите, чтобы собрать child RigidBody и Collider в кэш' })
    public get fetchPhysicsButton(): boolean {
        return false;
    }
    public set fetchPhysicsButton(v: boolean) {
        if (v && EDITOR) {
            this.fetchPhysicsComponents();
        }
    }

    @property({ tooltip: 'Нажмите: Collectable counts + RigidBody/Collider кэш' })
    public get fetchAllButton(): boolean {
        return false;
    }
    public set fetchAllButton(v: boolean) {
        if (v && EDITOR) {
            this.fetchCollectables();
            this.fetchPhysicsComponents();
        }
    }

    @property({ tooltip: 'Нажмите, чтобы выставить Static всем RigidBody в дочерних объектах' })
    public get setStaticButton(): boolean {
        return false;
    }
    public set setStaticButton(v: boolean) {
        if (v && EDITOR) {
            this.rigidBodyTypeOnPlay = ERigidBodyType.STATIC;
            this.setChildrenRigidBodiesType(ERigidBodyType.STATIC);
        }
    }

    @property({ tooltip: 'Нажмите, чтобы выставить Dynamic всем RigidBody в дочерних объектах' })
    public get setDynamicButton(): boolean {
        return false;
    }
    public set setDynamicButton(v: boolean) {
        if (v && EDITOR) {
            this.rigidBodyTypeOnPlay = ERigidBodyType.DYNAMIC;
            this.setChildrenRigidBodiesType(ERigidBodyType.DYNAMIC);
        }
    }

    @property({ tooltip: 'Нажмите, чтобы выставить Kinematic всем RigidBody в дочерних объектах' })
    public get setKinematicButton(): boolean {
        return false;
    }
    public set setKinematicButton(v: boolean) {
        if (v && EDITOR) {
            this.rigidBodyTypeOnPlay = ERigidBodyType.KINEMATIC;
            this.setChildrenRigidBodiesType(ERigidBodyType.KINEMATIC);
        }
    }

    onLoad(): void {
        if (!EDITOR) {
            // Prefab overrides сбрасывают type — применяем сохранённый
            this.setChildrenRigidBodiesType(this.rigidBodyTypeOnPlay);
            // Если дизайнер забыл Fetch Physics — добрать на старте
            if (this.rigidBodies.length === 0 || this.colliders.length === 0) {
                this.fetchPhysicsComponents();
            }
            // По умолчанию выключены; CollectableCollectionService включит initialActive
            this.setPhysicsActive(false);
            // НЕ destroy: runtime-сервис держит ссылки на этот tool
        }
    }

    /** Счётчики по типам (для синхронизации в LevelConfig) */
    public getCounts(): Record<CollectableType, number> {
        return {
            [CollectableType.Blue]: this.blueCount,
            [CollectableType.Red]: this.redCount,
            [CollectableType.Green]: this.greenCount,
            [CollectableType.Teal]: this.tealCount,
        };
    }

    public fetchCollectables(): void {
        if (!this.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode для поиска!');
            return;
        }

        const collectables = this.parentNode.getComponentsInChildren(Collectable);
        let blue = 0;
        let red = 0;
        let green = 0;
        let teal = 0;

        for (let i = 0; i < collectables.length; i++) {
            switch (collectables[i].type) {
                case CollectableType.Blue: blue++; break;
                case CollectableType.Red: red++; break;
                case CollectableType.Green: green++; break;
                case CollectableType.Teal: teal++; break;
            }
        }

        this.blueCount = blue;
        this.redCount = red;
        this.greenCount = green;
        this.tealCount = teal;
        this.totalCount = collectables.length;

        console.log(
            `[CollectableCounterTool] Найдено: total=${this.totalCount}` +
            ` Blue=${blue} Red=${red} Green=${green} Teal=${teal}`
        );
    }

    /** Собирает RigidBody и Collider из parentNode (editor / runtime fallback) */
    public fetchPhysicsComponents(): void {
        if (!this.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode для поиска!');
            return;
        }

        const bodies = this.parentNode.getComponentsInChildren(RigidBody);
        const cols = this.parentNode.getComponentsInChildren(Collider);

        this.rigidBodies = bodies.slice();
        this.colliders = cols.slice();

        console.log(
            `[CollectableCounterTool] Physics cache: RigidBody=${this.rigidBodies.length}, Collider=${this.colliders.length}`
        );
    }

    /**
     * Включает/выключает все закэшированные RigidBody и Collider.
     * Вызывается CollectableCollectionService.
     */
    public setPhysicsActive(active: boolean): void {
        this._physicsActive = active;

        const bodies = this.rigidBodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body && body.isValid) {
                body.enabled = active;
            }
        }

        const cols = this.colliders;
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (col && col.isValid) {
                col.enabled = active;
            }
        }
    }

    /** Обходит дочерние узлы parentNode и ставит RigidBody.type */
    public setChildrenRigidBodiesType(type: ERigidBodyType): void {
        if (!this.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode для поиска!');
            return;
        }

        const bodies = this.rigidBodies.length > 0
            ? this.rigidBodies
            : this.parentNode.getComponentsInChildren(RigidBody);

        let changed = 0;
        const typeName =
            type === ERigidBodyType.STATIC ? 'Static' :
            type === ERigidBodyType.KINEMATIC ? 'Kinematic' : 'Dynamic';

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (!body || !body.isValid) continue;
            if (body.type !== type) {
                body.type = type;
                changed++;
            }
        }

        console.log(
            `[CollectableCounterTool] RigidBody: найдено=${bodies.length}, переведено в ${typeName}=${changed}`
        );
    }
}
