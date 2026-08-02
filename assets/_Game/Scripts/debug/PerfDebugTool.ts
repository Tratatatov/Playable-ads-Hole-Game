/**
 * PerfDebugTool — runtime-профайлер затрат сцены.
 * Раз в logIntervalSec (и по кнопке Dump Now) считает активные
 * MeshRenderer / RigidBody / Collider / тени / tris / stencil и ранжирует,
 * куда уходит бюджет. Работает только при isDebugMode.
 *
 * Stencil в отчёте/bench — только по UUID HoleStencil (Mask/Floor/Interior).
 * Чтение pass.depthStencilState даёт ложные срабатывания на всех PBR.
 *
 * Stencil A/B: фаза ON → выключить stencil-тест (+ скрыть Mask) → фаза OFF →
 * лог delta ms / % frame time. Кнопка Run Stencil Bench или auto на старте.
 *
 * Optimization: кнопки Apply / Reset работают и в Edit Mode
 * (@executeInEditMode) — можно проверить culling без Play.
 *
 * Не editor-Tool из scripts/tools — это debug-компонент как DebugController.
 */

import {
    _decorator, Component, Node, director, MeshRenderer, RigidBody, Collider,
    ERigidBodyType, MeshCollider, Material, CCFloat, CCInteger, gfx,
} from 'cc';
import { EDITOR } from 'cc/env';
import { GameBootstrap } from '../GameBootstrap';
import { Collectable } from '../gameplay/Collectable';
import { OptimizationService } from '../core/OptimizationService';

const { ccclass, property, executeInEditMode } = _decorator;

/** ShadowCastingMode.ON — в части сборок enum не реэкспортируется из 'cc' */
const SHADOW_CASTING_ON = 1;

/** UUID материалов HoleStencil — только по asset uuid.
 *  НЕ читать pass.depthStencilState: Interior (builtin-standard) шарит effect
 *  с макарунами/гейтами → ложный stencil на ~всех PBR MeshRenderer. */
const STENCIL_MASK_UUID = '2322a914-23e6-4827-8d96-5703a3442669';
const STENCIL_FLOOR_UUID = '50728c20-11b1-44cc-a8fd-e631613b2393';
const STENCIL_INTERIOR_UUID = '54e59324-ad9d-4fca-9e56-3563265e5943';
const KNOWN_STENCIL_UUIDS: ReadonlySet<string> = new Set([
    STENCIL_MASK_UUID,
    STENCIL_FLOOR_UUID,
    STENCIL_INTERIOR_UUID,
]);

interface CostBucket {
    name: string;
    score: number;
    detail: string;
}

interface MeshHit {
    name: string;
    tris: number;
    shadows: boolean;
    stencil: boolean;
    node: string;
}

interface StencilSlotRestore {
    renderer: MeshRenderer;
    slot: number;
    shared: Material;
}

interface StencilMaskRestore {
    renderer: MeshRenderer;
    wasEnabled: boolean;
}

type StencilBenchPhase = 'idle' | 'on' | 'off';

@ccclass('PerfDebugTool')
@executeInEditMode
export class PerfDebugTool extends Component {
    @property({ type: GameBootstrap, tooltip: 'Ссылка на GameBootstrap (для isDebugMode / OptimizationConfig)' })
    bootstrap: GameBootstrap | null = null;

    @property({ type: CCFloat, tooltip: 'Как часто писать отчёт в консоль (сек). 0 = только по кнопке' })
    logIntervalSec: number = 2;

    @property({ type: CCInteger, tooltip: 'Сколько самых тяжёлых мешей показать в отчёте' })
    topMeshesCount: number = 8;

    @property({ type: CCFloat, tooltip: 'Длительность каждой фазы A/B stencil (сек)' })
    stencilBenchPhaseSec: number = 2;

    @property({ tooltip: 'Авто-запуск A/B stencil bench через ~1с после start' })
    autoStencilBench: boolean = false;

    @property({ tooltip: 'Нажмите, чтобы сразу вывести отчёт' })
    public get dumpNow(): boolean { return false; }
    public set dumpNow(v: boolean) {
        if (v) this._dumpReport('manual');
    }

    @property({ tooltip: 'A/B: замерить FPS со stencil ON vs OFF' })
    public get runStencilBench(): boolean { return false; }
    public set runStencilBench(v: boolean) {
        if (v) this._beginStencilBench('manual');
    }

    @property({
        group: { name: 'Optimization', id: 'opt' },
        tooltip: 'Применить OptimizationConfig (Edit Mode + Play). Soft distance culling (MR/RB/Col).',
    })
    public get applyOptimization(): boolean { return false; }
    public set applyOptimization(v: boolean) {
        if (v) this._applyOptimization();
    }

    @property({
        group: { name: 'Optimization', id: 'opt' },
        tooltip: 'Сброс: включить все Collectable из конфига (Edit Mode + Play)',
    })
    public get resetOptimization(): boolean { return false; }
    public set resetOptimization(v: boolean) {
        if (v) this._resetOptimization();
    }

    private _accumDt: number = 0;
    private _frameCount: number = 0;
    private _logTimer: number = 0;
    private _minDt: number = Number.POSITIVE_INFINITY;
    private _maxDt: number = 0;

    private readonly _buckets: CostBucket[] = [];
    private readonly _meshHits: MeshHit[] = [];
    private readonly _matSet: Set<Material> = new Set();

    private _benchPhase: StencilBenchPhase = 'idle';
    private _benchTimer: number = 0;
    private _benchAccumDt: number = 0;
    private _benchFrames: number = 0;
    private _benchOnAvgMs: number = 0;
    private _benchOnFps: number = 0;
    private _benchReason: string = '';
    private _autoBenchDelay: number = -1;

    private readonly _stencilSlotRestores: StencilSlotRestore[] = [];
    private readonly _stencilMaskRestores: StencilMaskRestore[] = [];

    start(): void {
        // Edit Mode: только кнопки Optimization; профилер не крутим
        if (EDITOR) return;

        if (!this.bootstrap || !this.bootstrap.isDebugMode) {
            this.enabled = false;
            this.node.active = false;
            return;
        }

        console.log(
            `%c[PerfDebugTool] Активен. Авто-лог каждые ${this.logIntervalSec}s. ` +
            `Stencil A/B: ${this.autoStencilBench ? 'авто' : 'кнопка Run Stencil Bench'}.`,
            'color: #0f0'
        );
        this._dumpReport('start');

        if (this.autoStencilBench) {
            this._autoBenchDelay = 1;
        }
    }

    update(dt: number): void {
        if (EDITOR) return;
        if (dt <= 0) return;

        if (this._autoBenchDelay >= 0) {
            this._autoBenchDelay -= dt;
            if (this._autoBenchDelay <= 0) {
                this._autoBenchDelay = -1;
                this._beginStencilBench('auto');
            }
        }

        if (this._benchPhase !== 'idle') {
            this._updateStencilBench(dt);
            return;
        }

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

    // ── Optimization A/B ──────────────────────────────────────────────────

    private _ensureOptimizationReady(): boolean {
        const boot = this.bootstrap;
        if (!boot) {
            console.warn('[PerfDebugTool] Optimization: нужен bootstrap');
            return false;
        }

        const cfg = boot.optimizationConfig;
        const origin = boot.mainCamera ? boot.mainCamera : null;

        if (!cfg || !cfg.isValid) {
            console.warn('[PerfDebugTool] Optimization: OptimizationConfig не назначен на GameBootstrap');
            return false;
        }
        if (!origin || !origin.isValid) {
            console.warn('[PerfDebugTool] Optimization: mainCamera не назначен на GameBootstrap');
            return false;
        }

        // Актуальные ссылки из Inspector (без reset suspend / без auto-evaluate)
        if (!OptimizationService.bind(cfg, origin)) {
            console.warn('[PerfDebugTool] Optimization: bind не удался');
            return false;
        }
        return true;
    }

    private _applyOptimization(): void {
        if (!this._ensureOptimizationReady()) return;
        const r = OptimizationService.applyNow();
        const where = EDITOR ? 'Editor' : 'Play';
        console.log(
            `%c[PerfDebugTool] Optimization APPLY (${where}) → on=${r.on} off=${r.off} total=${r.total}`,
            'color: #ffa500; font-weight: bold;'
        );
        if (!EDITOR) {
            this._dumpReport('opt-apply');
        }
    }

    private _resetOptimization(): void {
        if (!this._ensureOptimizationReady()) return;
        const r = OptimizationService.resetAll();
        const where = EDITOR ? 'Editor' : 'Play';
        console.log(
            `%c[PerfDebugTool] Optimization RESET (${where}) → on=${r.on}/${r.total}` +
            (EDITOR ? '' : ' (culling paused)'),
            'color: #ffa500; font-weight: bold;'
        );
        if (!EDITOR) {
            this._dumpReport('opt-reset');
        }
    }

    // ── Stencil A/B benchmark ─────────────────────────────────────────────

    private _beginStencilBench(reason: string): void {
        if (this._benchPhase !== 'idle') {
            console.warn('[PerfDebugTool] Stencil bench уже идёт');
            return;
        }

        const scene = director.getScene();
        if (!scene) {
            console.warn('[PerfDebugTool] Нет активной сцены для stencil bench');
            return;
        }

        const phaseSec = Math.max(0.5, this.stencilBenchPhaseSec);
        this._benchReason = reason;
        this._benchPhase = 'on';
        this._benchTimer = phaseSec;
        this._benchAccumDt = 0;
        this._benchFrames = 0;
        this._benchOnAvgMs = 0;
        this._benchOnFps = 0;

        console.log(
            `%c[PerfDebugTool] Stencil A/B START (${reason}): ` +
            `фаза ON ${phaseSec.toFixed(1)}s → OFF ${phaseSec.toFixed(1)}s`,
            'color: #0ff; font-weight: bold;'
        );
    }

    private _updateStencilBench(dt: number): void {
        this._benchAccumDt += dt;
        this._benchFrames++;
        this._benchTimer -= dt;

        if (this._benchTimer > 0) return;

        const avgDt = this._benchFrames > 0 ? this._benchAccumDt / this._benchFrames : 0;
        const avgMs = avgDt * 1000;
        const avgFps = avgDt > 0 ? 1 / avgDt : 0;

        if (this._benchPhase === 'on') {
            this._benchOnAvgMs = avgMs;
            this._benchOnFps = avgFps;
            this._applyStencilOff();

            const phaseSec = Math.max(0.5, this.stencilBenchPhaseSec);
            this._benchPhase = 'off';
            this._benchTimer = phaseSec;
            this._benchAccumDt = 0;
            this._benchFrames = 0;

            console.log(
                `%c[PerfDebugTool] Stencil ON: avg=${avgMs.toFixed(2)}ms (${avgFps.toFixed(1)} FPS) → переключаю OFF`,
                'color: #0ff'
            );
            return;
        }

        // phase === 'off'
        const offMs = avgMs;
        const offFps = avgFps;
        this._restoreStencil();
        this._benchPhase = 'idle';

        const deltaMs = Math.max(0, this._benchOnAvgMs - offMs);
        const pctOfFrame = this._benchOnAvgMs > 0 ? (deltaMs / this._benchOnAvgMs) * 100 : 0;
        const fpsGain = offFps - this._benchOnFps;

        const lines: string[] = [];
        lines.push(`════════ Stencil A/B (${this._benchReason}) ════════`);
        lines.push(`  ON  (stencil):  ${this._benchOnAvgMs.toFixed(2)} ms/frame  (${this._benchOnFps.toFixed(1)} FPS)`);
        lines.push(`  OFF (no stencil): ${offMs.toFixed(2)} ms/frame  (${offFps.toFixed(1)} FPS)`);
        lines.push(`  Δ stencil cost: ${deltaMs.toFixed(2)} ms  ≈ ${pctOfFrame.toFixed(1)}% frame time`);
        lines.push(`  FPS gain without stencil: ${fpsGain >= 0 ? '+' : ''}${fpsGain.toFixed(1)}`);
        lines.push('  (OFF = stencilTest выкл + Mask MeshRenderer.enabled=false; геометрия пола/interior остаётся)');
        lines.push(this._stencilOptimizeHints());
        lines.push('══════════════════════════════════════════');

        console.log('%c' + lines.join('\n'), 'color: #00E5FF; font-family: monospace; font-weight: bold;');
    }

    private _applyStencilOff(): void {
        this._stencilSlotRestores.length = 0;
        this._stencilMaskRestores.length = 0;

        const scene = director.getScene();
        if (!scene) return;

        const renderers = scene.getComponentsInChildren(MeshRenderer);
        for (let i = 0; i < renderers.length; i++) {
            const mr = renderers[i];
            if (!mr.node.activeInHierarchy) continue;

            const mats = mr.sharedMaterials;
            if (!mats || mats.length === 0) continue;

            let anyStencil = false;
            let allMaskOnly = true;
            let hasAnyMat = false;

            for (let s = 0; s < mats.length; s++) {
                const mat = mats[s];
                if (!mat) continue;
                hasAnyMat = true;
                const stencil = this._materialUsesStencil(mat);
                if (stencil) anyStencil = true;
                if (!stencil || !this._isStencilMaskOnly(mat)) allMaskOnly = false;
            }

            if (!anyStencil || !hasAnyMat) continue;

            // Mask-only меш: без записи stencil бесполезен — выключаем draw call
            if (allMaskOnly) {
                this._stencilMaskRestores.push({ renderer: mr, wasEnabled: mr.enabled });
                mr.enabled = false;
                continue;
            }

            for (let s = 0; s < mats.length; s++) {
                const shared = mats[s];
                if (!shared || !this._materialUsesStencil(shared)) continue;

                this._stencilSlotRestores.push({ renderer: mr, slot: s, shared });
                const inst = mr.getMaterialInstance(s);
                if (!inst) continue;

                inst.overridePipelineStates({
                    depthStencilState: {
                        stencilTestFront: false,
                        stencilTestBack: false,
                        stencilWriteMaskFront: 0,
                        stencilWriteMaskBack: 0,
                        stencilPassOpFront: gfx.StencilOp.KEEP,
                        stencilPassOpBack: gfx.StencilOp.KEEP,
                    },
                });
            }
        }
    }

    private _restoreStencil(): void {
        for (let i = 0; i < this._stencilMaskRestores.length; i++) {
            const r = this._stencilMaskRestores[i];
            if (r.renderer.isValid) r.renderer.enabled = r.wasEnabled;
        }
        this._stencilMaskRestores.length = 0;

        for (let i = 0; i < this._stencilSlotRestores.length; i++) {
            const r = this._stencilSlotRestores[i];
            if (!r.renderer.isValid) continue;
            // Вернуть shared material → сбросить MaterialInstance с override
            r.renderer.setSharedMaterial(r.shared, r.slot);
        }
        this._stencilSlotRestores.length = 0;
    }

    private _stencilOptimizeHints(): string {
        return [
            '  Hints:',
            '  • FloorPunch: маленький quad вокруг дыры, не весь пол',
            '  • Mask: low-poly диск (не Cylinder), ColorMask.NONE, без shadow',
            '  • Interior: unlit вместо standard/PBR если не нужен metallic',
            '  • Не отключай stencilTestBack на Mask/Floor — часто ломает вырез',
            '  • Альтернатива stencil: mesh с отверстием или shader discard по позиции дыры',
        ].join('\n');
    }

    // ── Regular dump ──────────────────────────────────────────────────────

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

        let stencilRenderers = 0;
        let stencilTris = 0;
        let stencilMaskDraws = 0;
        let stencilFloorTris = 0;
        let stencilInteriorTris = 0;
        let stencilPbrInterior = 0;

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
            let meshUsesStencil = false;
            let meshMaskOnly = true;
            let meshHasMat = false;
            let meshHasFloorPunch = false;
            let meshHasInterior = false;

            if (mats) {
                for (let m = 0; m < mats.length; m++) {
                    const mat = mats[m];
                    if (!mat) continue;
                    meshHasMat = true;
                    this._matSet.add(mat);

                    if (this._materialUsesStencil(mat)) {
                        meshUsesStencil = true;
                        if (this._isStencilMaskOnly(mat)) {
                            // mask slot
                        } else {
                            meshMaskOnly = false;
                            if (this._looksLikeFloorPunch(mat)) {
                                meshHasFloorPunch = true;
                            } else {
                                meshHasInterior = true;
                                if (this._isPbrLike(mat)) stencilPbrInterior++;
                            }
                        }
                    } else {
                        meshMaskOnly = false;
                    }
                }
            }

            const tris = this._estimateTris(mr);
            totalTris += tris;
            this._meshHits.push({
                name: mr.mesh?.name || mr.node.name,
                tris,
                shadows: castsShadow,
                stencil: meshUsesStencil,
                node: this._nodePath(mr.node),
            });

            if (meshUsesStencil && meshHasMat) {
                stencilRenderers++;
                stencilTris += tris;
                if (meshMaskOnly) {
                    stencilMaskDraws++;
                } else if (meshHasFloorPunch) {
                    stencilFloorTris += tris;
                } else if (meshHasInterior) {
                    stencilInteriorTris += tris;
                }
            }
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
        // Только known HoleStencil UUID. Floor fill дороже; Mask = лишний draw.
        this._pushBucket(
            'Stencil Hole',
            stencilFloorTris / 800 + stencilMaskDraws * 4 + stencilInteriorTris / 1500 + stencilPbrInterior * 3,
            `${stencilRenderers} MR, ~${stencilTris.toLocaleString()} tris ` +
            `(floor≈${stencilFloorTris}, maskDraws=${stencilMaskDraws}, interior≈${stencilInteriorTris}` +
            `${stencilPbrInterior > 0 ? `, PBR×${stencilPbrInterior}` : ''})`
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
        lines.push(
            `Stencil: renderers=${stencilRenderers}  tris≈${stencilTris.toLocaleString()}  ` +
            `floorTris≈${stencilFloorTris}  maskDraws=${stencilMaskDraws}  interiorTris≈${stencilInteriorTris}` +
            (stencilPbrInterior > 0 ? `  ⚠ PBR interior×${stencilPbrInterior}` : '')
        );
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
            const st = h.stencil ? ' STENCIL' : '';
            lines.push(`  ${String(h.tris).padStart(6)} tris${sh}${st}  ${h.name}  (${h.node})`);
        }

        const top = this._buckets[0];
        if (top && top.score > 0) {
            lines.push(`▶ Главный подозреваемый: ${top.name} — ${top.detail}`);
            const hint = this._hintFor(top.name);
            if (hint) lines.push(hint);
        }
        if (stencilRenderers > 0) {
            lines.push('▶ Stencil: для точного % запусти Run Stencil Bench (или autoStencilBench)');
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
                return '  Hint: OptimizationService soft-cull (MR/RB/Col) + собранные node.active=false';
            case 'Stencil Hole':
                return '  Hint: A/B bench для точного %; большой floorPunch-меш = stencil test на каждый пиксель';
            default:
                return '';
        }
    }

    /** Только asset UUID HoleStencil — не pass.depthStencilState (ложные PBR). */
    private _materialUsesStencil(mat: Material): boolean {
        return KNOWN_STENCIL_UUIDS.has(mat.uuid);
    }

    private _isStencilMaskOnly(mat: Material): boolean {
        return mat.uuid === STENCIL_MASK_UUID;
    }

    private _looksLikeFloorPunch(mat: Material): boolean {
        return mat.uuid === STENCIL_FLOOR_UUID;
    }

    private _isPbrLike(mat: Material): boolean {
        // builtin-standard uuid
        const effect = (mat as unknown as { effectAsset?: { uuid?: string; name?: string } }).effectAsset;
        if (effect?.uuid === 'c8f66d17-351a-48da-a12c-0212d28575c4') return true;
        if (effect?.name && /standard|pbr/i.test(effect.name)) return true;
        return (mat.passes?.length ?? 0) > 3;
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
