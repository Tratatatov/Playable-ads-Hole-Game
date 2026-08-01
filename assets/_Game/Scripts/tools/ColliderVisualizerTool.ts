import {
    _decorator, Component, Node, Color, Vec3, Mat4, Quat, director,
    Collider, BoxCollider, SphereCollider, CapsuleCollider, CylinderCollider,
    ConeCollider, MeshCollider, geometry, EAxisDirection,
} from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, executeInEditMode, disallowMultiple, menu } = _decorator;

type GeoRenderer = NonNullable<
    NonNullable<typeof director.root>['cameraList'][number]['geometryRenderer']
>;

/**
 * Рисует формы всех Collider в Scene View редактора.
 * Повесь на любую ноду сцены (например Systems) и включи Show All Colliders.
 * В билде компонент удаляется сам.
 */
@ccclass('ColliderVisualizerTool')
@executeInEditMode(true)
@disallowMultiple
@menu('Tools/Collider Visualizer')
export class ColliderVisualizerTool extends Component {

    @property({ tooltip: 'Рисовать формы всех коллайдеров в редакторе' })
    public showAllColliders = true;

    @property({ tooltip: 'Рисовать только включённые коллайдеры на активных нодах' })
    public onlyEnabled = true;

    @property({ tooltip: 'Цвет обычных коллайдеров' })
    public solidColor: Color = new Color(0, 220, 80, 255);

    @property({ tooltip: 'Цвет trigger-коллайдеров' })
    public triggerColor: Color = new Color(80, 180, 255, 255);

    @property({ tooltip: 'Учитывать depth test (части за геометрией приглушаются)' })
    public depthTest = false;

    @property({ tooltip: 'Сегменты для цилиндра / сферы / капсулы' })
    public segments = 20;

    @property({ type: Node, tooltip: 'Корень поиска (пусто = вся сцена)' })
    public searchRoot: Node | null = null;

    private readonly _tmpMat = new Mat4();
    private readonly _tmpQuat = new Quat();
    private readonly _aabb = new geometry.AABB();
    private _warnedMissingRenderer = false;

    onLoad(): void {
        if (!EDITOR) {
            this.destroy();
        }
    }

    update(): void {
        if (!EDITOR || !this.showAllColliders) {
            return;
        }
        this._drawAll();
    }

    private _drawAll(): void {
        const root = director.root;
        if (!root?.cameraList?.length) {
            return;
        }

        const searchFrom = this.searchRoot ?? director.getScene();
        if (!searchFrom) {
            return;
        }

        const colliders = searchFrom.getComponentsInChildren(Collider);
        let drew = false;

        for (const cam of root.cameraList) {
            if (!cam.geometryRenderer) {
                cam.initGeometryRenderer();
            }
            const gr = cam.geometryRenderer;
            if (!gr) {
                continue;
            }
            drew = true;
            for (const collider of colliders) {
                if (!this._shouldDraw(collider)) {
                    continue;
                }
                this._drawCollider(gr, collider);
            }
        }

        if (!drew && !this._warnedMissingRenderer) {
            this._warnedMissingRenderer = true;
            console.warn(
                '[ColliderVisualizerTool] GeometryRenderer недоступен. '
                + 'Включи Project Settings → Feature Cropping → Geometry Renderer и перезапусти редактор.',
            );
        }
    }

    private _shouldDraw(collider: Collider): boolean {
        if (!collider.node?.isValid) {
            return false;
        }
        if (this.onlyEnabled) {
            if (!collider.enabledInHierarchy || !collider.node.activeInHierarchy) {
                return false;
            }
        }
        return true;
    }

    private _drawCollider(gr: GeoRenderer, collider: Collider): void {
        const color = collider.isTrigger ? this.triggerColor : this.solidColor;
        const node = collider.node;
        const segs = Math.max(8, this.segments | 0);

        if (collider instanceof BoxCollider) {
            this._aabb.center.set(collider.center);
            this._aabb.halfExtents.set(
                collider.size.x * 0.5,
                collider.size.y * 0.5,
                collider.size.z * 0.5,
            );
            gr.addBoundingBox(this._aabb, color, true, this.depthTest, true, true, node.worldMatrix);
            return;
        }

        if (collider instanceof SphereCollider) {
            this._buildShapeMatrix(node, collider.center);
            gr.addSphere(Vec3.ZERO, collider.radius, color, segs, Math.max(4, (segs / 2) | 0), true, this.depthTest, true, true, this._tmpMat);
            return;
        }

        if (collider instanceof CapsuleCollider) {
            this._buildShapeMatrix(node, collider.center, collider.direction);
            gr.addCapsule(
                Vec3.ZERO,
                collider.radius,
                collider.cylinderHeight,
                color,
                segs,
                Math.max(4, (segs / 4) | 0),
                true,
                this.depthTest,
                true,
                true,
                this._tmpMat,
            );
            return;
        }

        if (collider instanceof CylinderCollider) {
            this._buildShapeMatrix(node, collider.center, collider.direction);
            gr.addCylinder(Vec3.ZERO, collider.radius, collider.height, color, segs, true, this.depthTest, true, true, this._tmpMat);
            return;
        }

        if (collider instanceof ConeCollider) {
            this._buildShapeMatrix(node, collider.center, collider.direction);
            gr.addCone(Vec3.ZERO, collider.radius, collider.height, color, segs, true, this.depthTest, true, true, this._tmpMat);
            return;
        }

        if (collider instanceof MeshCollider) {
            const bounds = (collider as MeshCollider & { worldBounds?: geometry.AABB }).worldBounds;
            if (bounds) {
                gr.addBoundingBox(bounds, color, true, this.depthTest, true, false);
            } else {
                this._aabb.center.set(collider.center);
                this._aabb.halfExtents.set(0.5, 0.5, 0.5);
                gr.addBoundingBox(this._aabb, color, true, this.depthTest, true, true, node.worldMatrix);
            }
            return;
        }

        this._aabb.center.set(collider.center);
        this._aabb.halfExtents.set(0.25, 0.25, 0.25);
        gr.addBoundingBox(this._aabb, color, true, this.depthTest, true, true, node.worldMatrix);
    }

    /** worldMatrix * T(center) * R(axis) */
    private _buildShapeMatrix(node: Node, center: Vec3, direction?: EAxisDirection): void {
        if (direction === EAxisDirection.X_AXIS) {
            Quat.fromEuler(this._tmpQuat, 0, 0, 90);
        } else if (direction === EAxisDirection.Z_AXIS) {
            Quat.fromEuler(this._tmpQuat, 90, 0, 0);
        } else {
            Quat.identity(this._tmpQuat);
        }
        Mat4.fromRT(this._tmpMat, this._tmpQuat, center);
        Mat4.multiply(this._tmpMat, node.worldMatrix, this._tmpMat);
    }
}
