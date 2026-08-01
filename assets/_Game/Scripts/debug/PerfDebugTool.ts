/**
 * PerfDebugTool — runtime-профайлер затрат сцены.
 * Раз в logIntervalSec (и по кнопке Dump Now) считает активные
 * MeshRenderer / RigidBody / Collider / тени / tris и ранжирует,
 * куда уходит бюджет. Работает только при isDebugMode.
 *
 * Не editor-Tool из scripts/tools — это debug-компонент как DebugController.
 */

import {
    _decorator, Component, Node, director, MeshRenderer, RigidBody, Collider,
    ERigidBodyType, MeshCollider, Material, CCFloat, CCInteger,
} from 'cc';
import { GameBootstrap } from '../GameBootstrap';
import { Collectable } from '../gameplay/Collectable';

const { ccclass, property } = _decorator;

/** ShadowCastingMode.ON — в части сборок enum не реэкспортируется из 'cc' */
const SHADOW_CASTING_ON = 1;

interface CostBucket {
    name: string;
    score: number;
    detail: string;
}

interface MeshHit {
    name: string;
    tris: number;
    shadows: boolean;
    node: string;
}

@ccclass('PerfDebugTool')
export class PerfDebugTool extends Component {
    @property({ type: GameBootstrap, tooltip: 'Ссылка на GameBootstrap (для isDebugMode)' })
    bootstrap: GameBootstrap | null = null;

    @property({ type: CCFloat, tooltip: 'Как часто писать отчёт в консоль (сек). 0 = только по кнопке' })
    logIntervalSec: number = 2;

    @property({ type: CCInteger, tooltip: 'Сколько самых тяжёлых мешей показать в отчёте' })
    topMeshesCount: number = 8;

    @property({ tooltip: 'Нажмите, чтобы сразу вывести отчёт' })
    public get dumpNow(): boolean { return false; }
    public set dumpNow(v: boolean) {
        if (v) this._dumpReport('manual');
    }

    private _accumDt: number = 0;
    private _frameCount: number = 0;
    private _logTimer: number = 0;
    private _minDt: number = Number.POSITIVE_INFINITY;
    private _maxDt: number = 0;

    private readonly _buckets: CostBucket[] = [];
    private readonly _meshHits: MeshHit[] = [];
    private readonly _matSet: Set<Material> = new Set();

    start(): void {
        if (!this.bootstrap || !this.bootstrap.isDebugMode) {
            this.enabled = false;
            this.node.active = false;
            return;
        }

        console.log(
            `%c[PerfDebugTool] Активен. Авто-лог каждые ${this.logIntervalSec}s (или Dump Now в Inspector).`,
            'color: #0f0'
        );
        this._dumpReport('start');
    }

    update(dt: number): void {
        if (dt <= 0) return;

        this._accumDt += dt;
        this._frameCount++;
        if (dt < this._minDt) this._minDt = dt;
        if (dt > this._maxDt) this._maxDt = dt;

        if (this.logIntervalSec <= 0) return;

        this._logTimer += dt;
        if (this._logTimer >= this.logIntervalSec) {
            this._logTimer = 0;
            this._dumpReport('interval');
        }
    }

    private _dumpReport(reason: string): void {
        const scene = director.getScene();
        if (!scene) {
            console.warn('[PerfDebugTool] Нет активной сцены');
            return;
        }

        const avgDt = this._frameCount > 0 ? this._accumDt / this._frameCount : 0;
        const avgFps = avgDt > 0 ? 1 / avgDt : 0;
        const minFps = this._maxDt > 0 ? 1 / this._maxDt : 0;
        const maxFps = this._minDt < Number.POSITIVE_INFINITY && this._minDt > 0 ? 1 / this._minDt : 0;

        let activeNodes = 0;
        let meshRenderers = 0;
        let shadowCasters = 0;
        let totalTris = 0;
        let rigidStatic = 0;
        let rigidDynamic = 0;
        let rigidKinematic = 0;
        let colliders = 0;
        let meshColliders = 0;
        let triggers = 0;

        this._matSet.clear();
        this._meshHits.length = 0;

        this._countActiveNodes(scene, (n) => { activeNodes++; });

        const bodies = scene.getComponentsInChildren(RigidBody);
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (!body.node.activeInHierarchy || !body.enabled) continue;
            const t = body.type;
            if (t === ERigidBodyType.STATIC) rigidStatic++;
            else if (t === ERigidBodyType.DYNAMIC) rigidDynamic++;
            else rigidKinematic++;
        }

        const cols = scene.getComponentsInChildren(Collider);
        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            if (!col.node.activeInHierarchy || !col.enabled) continue;
            colliders++;
            if (col.isTrigger) triggers++;
            if (col instanceof MeshCollider) meshColliders++;
        }

        const renderers = scene.getComponentsInChildren(MeshRenderer);
        for (let i = 0; i < renderers.length; i++) {
            const mr = renderers[i];
            if (!mr.node.activeInHierarchy || !mr.enabled) continue;
            meshRenderers++;

            const castsShadow = mr.shadowCastingMode === SHADOW_CASTING_ON;
            if (castsShadow) shadowCasters++;

            const mats = mr.sharedMaterials;
            if (mats) {
                for (let m = 0; m < mats.length; m++) {
                    const mat = mats[m];
                    if (mat) this._matSet.add(mat);
                }
            }

            const tris = this._estimateTris(mr);
            totalTris += tris;
            this._meshHits.push({
                name: mr.mesh?.name || mr.node.name,
                tris,
                shadows: castsShadow,
                node: this._nodePath(mr.node),
            });
        }

        const allCollectables = scene.getComponentsInChildren(Collectable);
        let collectablesActive = 0;
        for (let i = 0; i < allCollectables.length; i++) {
            if (allCollectables[i].node.activeInHierarchy) collectablesActive++;
        }
        const collectablesTotal = allCollectables.length;
        const materialsUnique = this._matSet.size;

        this._buckets.length = 0;
        this._pushBucket('Physics Dynamic', rigidDynamic * 8, `${rigidDynamic} bodies`);
        this._pushBucket('Physics Kinematic', rigidKinematic * 3, `${rigidKinematic} bodies`);
        this._pushBucket('Physics Static', rigidStatic * 0.5, `${rigidStatic} bodies`);
        this._pushBucket(
            'Colliders',
            colliders * 1.5 + meshColliders * 10,
            `${colliders} total, ${meshColliders} mesh, ${triggers} triggers`
        );
        this._pushBucket('Shadow Casters', shadowCasters * 6, `${shadowCasters} / ${meshRenderers} meshes`);
        this._pushBucket(
            'Triangles',
            totalTris / 2000,
            `${totalTris.toLocaleString()} tris, ${meshRenderers} MeshRenderers`
        );
        this._pushBucket('Materials (batch breaks)', materialsUnique * 2, `${materialsUnique} unique materials`);
        this._pushBucket(
            'Active Collectables',
            collectablesActive * 1,
            `${collectablesActive} active / ${collectablesTotal} with component`
        );

        this._buckets.sort((a, b) => b.score - a.score);
        let totalScore = 0;
        for (let i = 0; i < this._buckets.length; i++) totalScore += this._buckets[i].score;
        if (totalScore <= 0) totalScore = 1;

        this._meshHits.sort((a, b) => b.tris - a.tris);
        const topN = Math.max(1, this.topMeshesCount);
        const topMeshesEnd = Math.min(topN, this._meshHits.length);

        const lines: string[] = [];
        lines.push(`════════ PerfDebugTool (${reason}) ════════`);
        lines.push(
            `FPS avg=${avgFps.toFixed(1)}  min=${minFps.toFixed(1)}  max=${maxFps.toFixed(1)}  frames=${this._frameCount}`
        );
        lines.push(
            `Scene: activeNodes=${activeNodes}  meshRenderers=${meshRenderers}  tris≈${totalTris.toLocaleString()}`
        );
        lines.push(
            `Physics: static=${rigidStatic}  dynamic=${rigidDynamic}  kinematic=${rigidKinematic}`
        );
        lines.push(
            `Colliders=${colliders} (mesh=${meshColliders}, triggers=${triggers})  shadows=${shadowCasters}  materials=${materialsUnique}`
        );
        lines.push(`Collectables: active=${collectablesActive} / total=${collectablesTotal}`);
        lines.push('── Куда уходит бюджет (эвристика) ──');

        for (let i = 0; i < this._buckets.length; i++) {
            const b = this._buckets[i];
            if (b.score <= 0) continue;
            const pct = (b.score / totalScore) * 100;
            const barLen = Math.max(1, Math.round(pct / 5));
            let bar = '';
            for (let c = 0; c < barLen; c++) bar += '█';
            lines.push(`  ${pct.toFixed(0).padStart(3)}% ${bar}  ${b.name}: ${b.detail}`);
        }

        lines.push(`── Top ${topMeshesEnd} meshes by tris ──`);
        for (let i = 0; i < topMeshesEnd; i++) {
            const h = this._meshHits[i];
            const sh = h.shadows ? ' SHADOW' : '';
            lines.push(`  ${String(h.tris).padStart(6)} tris${sh}  ${h.name}  (${h.node})`);
        }

        const top = this._buckets[0];
        if (top && top.score > 0) {
            lines.push(`▶ Главный подозреваемый: ${top.name} — ${top.detail}`);
            const hint = this._hintFor(top.name);
            if (hint) lines.push(hint);
        }
        lines.push('══════════════════════════════════════');

        console.log('%c' + lines.join('\n'), 'color: #7CFC00; font-family: monospace;');

        this._accumDt = 0;
        this._frameCount = 0;
        this._minDt = Number.POSITIVE_INFINITY;
        this._maxDt = 0;
    }

    private _hintFor(bucket: string): string {
        switch (bucket) {
            case 'Shadow Casters':
                return '  Hint: выключи Shadow Casting на Collectable MeshRenderer';
            case 'Physics Dynamic':
                return '  Hint: Dynamic только рядом с дырой; остальным Static/Kinematic + collision matrix';
            case 'Physics Kinematic':
                return '  Hint: много kinematic всё ещё в physics world — убери RigidBody где не нужен';
            case 'Colliders':
                return '  Hint: Sphere/Box вместо MeshCollider; collectables не сталкиваются друг с другом';
            case 'Triangles':
                return '  Hint: Decimate меш / меньше одновременных инстансов';
            case 'Materials (batch breaks)':
                return '  Hint: один shared material на цвет + USE_INSTANCING';
            case 'Active Collectables':
                return '  Hint: пул + active=false для далёких / уже собранных';
            default:
                return '';
        }
    }

    private _pushBucket(name: string, score: number, detail: string): void {
        // Аллокации только в dump (раз в N сек), не в update
        this._buckets.push({ name, score: Math.max(0, score), detail });
    }

    private _estimateTris(mr: MeshRenderer): number {
        const mesh = mr.mesh;
        if (!mesh) return 0;

        const struct = (mesh as unknown as {
            struct?: { primitives?: { indexView?: { count?: number }; vertexCount?: number }[] };
        }).struct;

        if (struct?.primitives?.length) {
            let tris = 0;
            for (let i = 0; i < struct.primitives.length; i++) {
                const p = struct.primitives[i];
                const idx = p.indexView?.count;
                if (idx !== undefined && idx > 0) {
                    tris += (idx / 3) | 0;
                } else if (p.vertexCount) {
                    tris += (p.vertexCount / 3) | 0;
                }
            }
            if (tris > 0) return tris;
        }

        const subs = (mesh as unknown as {
            renderingSubMeshes?: { geometricInfo?: { indices?: ArrayLike<number> } }[];
        }).renderingSubMeshes;
        if (subs?.length) {
            let tris = 0;
            for (let i = 0; i < subs.length; i++) {
                const indices = subs[i].geometricInfo?.indices;
                if (indices) tris += (indices.length / 3) | 0;
            }
            if (tris > 0) return tris;
        }

        return 0;
    }

    private _countActiveNodes(node: Node, onActive: (n: Node) => void): void {
        if (!node.activeInHierarchy) return;
        onActive(node);
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
            this._countActiveNodes(children[i], onActive);
        }
    }

    private _nodePath(node: Node): string {
        const parts: string[] = [];
        let cur: Node | null = node;
        while (cur) {
            parts.push(cur.name);
            cur = cur.parent;
        }
        parts.reverse();
        return parts.join('/');
    }
}
