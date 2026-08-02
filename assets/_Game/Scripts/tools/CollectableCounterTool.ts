/**
 * CollectableCounterTool — editor-only инструмент заполнения CollectableContainer.
 * Fetch counts / RigidBody / Collider, выставление типа RB.
 * Runtime: уничтожается (не участвует в геймплее).
 */

import { _decorator, Component, RigidBody, Collider, ERigidBodyType, Enum } from 'cc';
import { EDITOR } from 'cc/env';
import { Collectable, CollectableType } from '../gameplay/Collectable';
import { CollectableContainer } from '../gameplay/CollectableContainer';

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CollectableCounterTool')
@executeInEditMode
export class CollectableCounterTool extends Component {

    @property({
        type: CollectableContainer,
        tooltip: 'Контейнер данных. Если пусто — берётся CollectableContainer на этом же узле.',
    })
    public container: CollectableContainer = null!;

    @property({ type: Enum(ERigidBodyType), tooltip: 'Тип RigidBody, который пишется в container при set*Button' })
    public rigidBodyTypeOnPlay: ERigidBodyType = ERigidBodyType.STATIC;

    @property({ tooltip: 'Нажмите, чтобы пересчитать Collectable по типам' })
    public get fetchButton(): boolean {
        return false;
    }
    public set fetchButton(v: boolean) {
        if (v && EDITOR) {
            this.fetchCollectables();
        }
    }

    @property({ tooltip: 'Нажмите, чтобы собрать child RigidBody и Collider в кэш контейнера' })
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

    @property({ tooltip: 'Нажмите, чтобы выставить Static всем RigidBody' })
    public get setStaticButton(): boolean {
        return false;
    }
    public set setStaticButton(v: boolean) {
        if (v && EDITOR) {
            this.rigidBodyTypeOnPlay = ERigidBodyType.STATIC;
            this.setChildrenRigidBodiesType(ERigidBodyType.STATIC);
        }
    }

    @property({ tooltip: 'Нажмите, чтобы выставить Dynamic всем RigidBody' })
    public get setDynamicButton(): boolean {
        return false;
    }
    public set setDynamicButton(v: boolean) {
        if (v && EDITOR) {
            this.rigidBodyTypeOnPlay = ERigidBodyType.DYNAMIC;
            this.setChildrenRigidBodiesType(ERigidBodyType.DYNAMIC);
        }
    }

    @property({ tooltip: 'Нажмите, чтобы выставить Kinematic всем RigidBody' })
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
            this.destroy();
            return;
        }
    }

    private _resolveContainer(): CollectableContainer | null {
        if (this.container && this.container.isValid) {
            return this.container;
        }
        const local = this.getComponent(CollectableContainer);
        if (local) {
            this.container = local;
            return local;
        }
        console.warn('[CollectableCounterTool] Не найден CollectableContainer (свойство container или на этом узле)');
        return null;
    }

    public fetchCollectables(): void {
        const c = this._resolveContainer();
        if (!c) return;

        if (!c.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode на CollectableContainer!');
            return;
        }

        const collectables = c.parentNode.getComponentsInChildren(Collectable);
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

        c.blueCount = blue;
        c.redCount = red;
        c.greenCount = green;
        c.tealCount = teal;
        c.totalCount = collectables.length;

        console.log(
            `[CollectableCounterTool] Найдено: total=${c.totalCount}` +
            ` Blue=${blue} Red=${red} Green=${green} Teal=${teal}`
        );
    }

    public fetchPhysicsComponents(): void {
        const c = this._resolveContainer();
        if (!c) return;

        if (!c.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode на CollectableContainer!');
            return;
        }

        const bodies = c.parentNode.getComponentsInChildren(RigidBody);
        const cols = c.parentNode.getComponentsInChildren(Collider);

        c.rigidBodies = bodies.slice();
        c.colliders = cols.slice();

        console.log(
            `[CollectableCounterTool] Physics cache: RigidBody=${c.rigidBodies.length}, Collider=${c.colliders.length}`
        );
    }

    public setChildrenRigidBodiesType(type: ERigidBodyType): void {
        const c = this._resolveContainer();
        if (!c) return;

        if (!c.parentNode) {
            console.warn('[CollectableCounterTool] Укажите parentNode на CollectableContainer!');
            return;
        }

        c.rigidBodyTypeOnPlay = type;

        const bodies = c.rigidBodies.length > 0
            ? c.rigidBodies
            : c.parentNode.getComponentsInChildren(RigidBody);

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
