import {
    _decorator, Component, Material, MeshRenderer, Color, gfx, assetManager,
} from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, executeInEditMode, menu, disallowMultiple } = _decorator;

declare const Editor: {
    Message: {
        request(name: string, message: string, ...args: unknown[]): Promise<unknown>;
    };
};

/** UUID встроенного effect `builtin-unlit` (Cocos Creator 3.8). */
const BUILTIN_UNLIT_UUID = 'a3cd009f-0ab0-420d-9278-b9fdab939bbc';

interface AssetInfo {
    uuid: string;
    url?: string;
}

/**
 * HoleStencilMaterialTool — создаёт набор материалов для «дыры» через stencil buffer.
 *
 * Порядок рендера (priority):
 *   1. Mask      — пишет stencil, без цвета / depth
 *   2. Floor     — рисуется где stencil != ref (вырезает отверстие + depth)
 *   3. Interior  — рисуется где stencil == ref (чёрная бездна / ободок)
 *
 * Иерархия сцены:
 *   Hole
 *   ├── Mask (Quad/Circle в плоскости пола)  → M_*_Mask
 *   ├── Interior (стенки + дно)              → M_*_Interior
 *   Floor (отдельный меш)                   → M_*_FloorPunch (+ текстура)
 */
@ccclass('HoleStencilMaterialTool')
@executeInEditMode(true)
@disallowMultiple
@menu('Tools/Hole Stencil Materials')
export class HoleStencilMaterialTool extends Component {

    @property({ tooltip: 'Папка для .mtl (db:// путь)' })
    public outputFolder = 'db://assets/_Game/Materials';

    @property({ tooltip: 'Префикс имён файлов (например M_Hole → M_Hole_Mask.mtl)' })
    public namePrefix = 'M_HoleStencil';

    @property({ tooltip: 'Значение stencil ref (одинаковое на всех трёх материалах)' })
    public stencilRef = 1;

    @property({ tooltip: 'Priority Mask (должен быть < floor / opaque 128)' })
    public maskPriority = 100;

    @property({ tooltip: 'Priority Interior (после пола)' })
    public interiorPriority = 130;

    @property({ tooltip: 'Цвет бездны / стенок (Interior)' })
    public interiorColor: Color = new Color(0, 0, 0, 255);

    @property({ type: MeshRenderer, tooltip: 'Опционально: назначить Mask-материал' })
    public maskRenderer: MeshRenderer | null = null;

    @property({ type: MeshRenderer, tooltip: 'Опционально: назначить Interior-материал' })
    public interiorRenderer: MeshRenderer | null = null;

    @property({ type: MeshRenderer, tooltip: 'Опционально: назначить FloorPunch-материал' })
    public floorRenderer: MeshRenderer | null = null;

    @property({ tooltip: 'Создать Mask + Interior + FloorPunch и назначить на рендереры' })
    public get createAllButton(): boolean {
        return false;
    }
    public set createAllButton(v: boolean) {
        if (v && EDITOR) {
            void this.createAll();
        }
    }

    @property({ tooltip: 'Только Mask-материал' })
    public get createMaskButton(): boolean {
        return false;
    }
    public set createMaskButton(v: boolean) {
        if (v && EDITOR) {
            void this._createAndAssign('Mask', () => this._buildMaskJson(), this.maskRenderer);
        }
    }

    @property({ tooltip: 'Только Interior-материал' })
    public get createInteriorButton(): boolean {
        return false;
    }
    public set createInteriorButton(v: boolean) {
        if (v && EDITOR) {
            void this._createAndAssign('Interior', () => this._buildInteriorJson(), this.interiorRenderer);
        }
    }

    @property({ tooltip: 'Только FloorPunch-материал (stencil NOT_EQUAL)' })
    public get createFloorPunchButton(): boolean {
        return false;
    }
    public set createFloorPunchButton(v: boolean) {
        if (v && EDITOR) {
            void this._createAndAssign('FloorPunch', () => this._buildFloorPunchJson(), this.floorRenderer);
        }
    }

    onLoad(): void {
        if (!EDITOR) {
            this.destroy();
        }
    }

    // ── Public ────────────────────────────────────────────────────────────

    public async createAll(): Promise<void> {
        const mask = await this._createAndAssign('Mask', () => this._buildMaskJson(), this.maskRenderer);
        const interior = await this._createAndAssign('Interior', () => this._buildInteriorJson(), this.interiorRenderer);
        const floor = await this._createAndAssign('FloorPunch', () => this._buildFloorPunchJson(), this.floorRenderer);

        console.log(
            `[HoleStencil] Готово.\n` +
            `  Mask:      ${mask ?? '—'}\n` +
            `  Interior:  ${interior ?? '—'}\n` +
            `  FloorPunch:${floor ?? '—'}\n` +
            `Stencil ref=${this.stencilRef}. ` +
            `Mask → диск дыры; Interior → стенки/дно; FloorPunch → пол ` +
            `(текстура копируется с floorRenderer, если назначен).`
        );
    }

    // ── Asset creation ────────────────────────────────────────────────────

    private async _createAndAssign(
        suffix: string,
        buildJson: () => string,
        renderer: MeshRenderer | null,
    ): Promise<string | null> {
        const folder = this.outputFolder.replace(/\/$/, '');
        const fileName = `${this.namePrefix}_${suffix}.mtl`;
        let url = `${folder}/${fileName}`;

        try {
            url = await Editor.Message.request(
                'asset-db',
                'generate-available-url',
                url,
            ) as string;

            const info = await Editor.Message.request(
                'asset-db',
                'create-asset',
                url,
                buildJson(),
                { overwrite: true },
            ) as AssetInfo | null;

            if (!info?.uuid) {
                console.error(`[HoleStencil] Не удалось создать ${url}`);
                return null;
            }

            await Editor.Message.request('asset-db', 'refresh-asset', url);

            if (renderer) {
                const mat = await this._loadMaterial(info.uuid);
                if (mat) {
                    renderer.setSharedMaterial(mat, 0);
                    console.log(`[HoleStencil] ${suffix} назначен на ${renderer.node.name}`);
                }
            }

            console.log(`[HoleStencil] Создан ${url}`);
            return url;
        } catch (err) {
            console.error(`[HoleStencil] Ошибка создания ${suffix}:`, err);
            return null;
        }
    }

    private _loadMaterial(uuid: string): Promise<Material | null> {
        return new Promise((resolve) => {
            assetManager.loadAny({ uuid }, (err: Error | null, asset: Material) => {
                if (err || !asset) {
                    console.warn(`[HoleStencil] Не удалось загрузить материал ${uuid}`, err);
                    resolve(null);
                    return;
                }
                resolve(asset);
            });
        });
    }

    // ── Material JSON builders ────────────────────────────────────────────

    private _buildMaskJson(): string {
        // Пишет stencil = ref, не трогает цвет и depth.
        const ref = this._clampRef(this.stencilRef);
        return this._serializeUnlit({
            priority: this.maskPriority,
            depthStencilState: {
                depthTest: true,
                depthWrite: false,
                stencilTestFront: true,
                stencilTestBack: true,
                stencilFuncFront: gfx.ComparisonFunc.ALWAYS,
                stencilFuncBack: gfx.ComparisonFunc.ALWAYS,
                stencilPassOpFront: gfx.StencilOp.REPLACE,
                stencilPassOpBack: gfx.StencilOp.REPLACE,
                stencilFailOpFront: gfx.StencilOp.KEEP,
                stencilFailOpBack: gfx.StencilOp.KEEP,
                stencilZFailOpFront: gfx.StencilOp.KEEP,
                stencilZFailOpBack: gfx.StencilOp.KEEP,
                stencilRefFront: ref,
                stencilRefBack: ref,
                stencilReadMaskFront: 0xff,
                stencilWriteMaskFront: 0xff,
                stencilReadMaskBack: 0xff,
                stencilWriteMaskBack: 0xff,
            },
            blendColorMask: gfx.ColorMask.NONE,
            props: {},
            defines: {},
        });
    }

    private _buildInteriorJson(): string {
        // Рисует только там, где stencil == ref (бездна / ободок).
        const ref = this._clampRef(this.stencilRef);
        const c = this.interiorColor;
        return this._serializeUnlit({
            priority: this.interiorPriority,
            depthStencilState: {
                depthTest: true,
                depthWrite: true,
                stencilTestFront: true,
                stencilTestBack: true,
                stencilFuncFront: gfx.ComparisonFunc.EQUAL,
                stencilFuncBack: gfx.ComparisonFunc.EQUAL,
                stencilPassOpFront: gfx.StencilOp.KEEP,
                stencilPassOpBack: gfx.StencilOp.KEEP,
                stencilFailOpFront: gfx.StencilOp.KEEP,
                stencilFailOpBack: gfx.StencilOp.KEEP,
                stencilZFailOpFront: gfx.StencilOp.KEEP,
                stencilZFailOpBack: gfx.StencilOp.KEEP,
                stencilRefFront: ref,
                stencilRefBack: ref,
                stencilReadMaskFront: 0xff,
                stencilWriteMaskFront: 0,
                stencilReadMaskBack: 0xff,
                stencilWriteMaskBack: 0,
            },
            blendColorMask: gfx.ColorMask.ALL,
            props: {
                mainColor: {
                    __type__: 'cc.Color',
                    r: c.r,
                    g: c.g,
                    b: c.b,
                    a: c.a,
                },
            },
            defines: {},
        });
    }

    private _buildFloorPunchJson(): string {
        // Пол: не рисуется (и не пишет depth) внутри дыры.
        const ref = this._clampRef(this.stencilRef);
        const { defines, props } = this._extractFloorAppearance();

        return this._serializeUnlit({
            priority: 128,
            depthStencilState: {
                depthTest: true,
                depthWrite: true,
                stencilTestFront: true,
                stencilTestBack: true,
                stencilFuncFront: gfx.ComparisonFunc.NOT_EQUAL,
                stencilFuncBack: gfx.ComparisonFunc.NOT_EQUAL,
                stencilPassOpFront: gfx.StencilOp.KEEP,
                stencilPassOpBack: gfx.StencilOp.KEEP,
                stencilFailOpFront: gfx.StencilOp.KEEP,
                stencilFailOpBack: gfx.StencilOp.KEEP,
                stencilZFailOpFront: gfx.StencilOp.KEEP,
                stencilZFailOpBack: gfx.StencilOp.KEEP,
                stencilRefFront: ref,
                stencilRefBack: ref,
                stencilReadMaskFront: 0xff,
                stencilWriteMaskFront: 0,
                stencilReadMaskBack: 0xff,
                stencilWriteMaskBack: 0,
            },
            blendColorMask: gfx.ColorMask.ALL,
            props,
            defines,
        });
    }

    /** Если на floorRenderer уже есть материал — копируем цвет / текстуру / tiling. */
    private _extractFloorAppearance(): {
        defines: Record<string, unknown>;
        props: Record<string, unknown>;
    } {
        const fallbackProps: Record<string, unknown> = {
            mainColor: {
                __type__: 'cc.Color',
                r: 200,
                g: 180,
                b: 140,
                a: 255,
            },
        };

        const src = this.floorRenderer?.getSharedMaterial(0);
        if (!src) {
            return { defines: {}, props: fallbackProps };
        }

        const props: Record<string, unknown> = {};
        const defines: Record<string, unknown> = {};

        const mainColor = src.getProperty('mainColor');
        if (mainColor instanceof Color) {
            props.mainColor = {
                __type__: 'cc.Color',
                r: mainColor.r,
                g: mainColor.g,
                b: mainColor.b,
                a: mainColor.a,
            };
        } else {
            props.mainColor = fallbackProps.mainColor;
        }

        const mainTexture = src.getProperty('mainTexture') as { uuid?: string } | null;
        if (mainTexture?.uuid) {
            defines.USE_TEXTURE = true;
            props.mainTexture = {
                __uuid__: mainTexture.uuid,
                __expectedType__: 'cc.Texture2D',
            };
        }

        const tilingOffset = src.getProperty('tilingOffset') as {
            x: number; y: number; z: number; w: number;
        } | null;
        if (tilingOffset && typeof tilingOffset.x === 'number') {
            props.tilingOffset = {
                __type__: 'cc.Vec4',
                x: tilingOffset.x,
                y: tilingOffset.y,
                z: tilingOffset.z,
                w: tilingOffset.w,
            };
        }

        return { defines, props };
    }

    private _serializeUnlit(opts: {
        priority: number;
        depthStencilState: Record<string, unknown>;
        blendColorMask: number;
        props: Record<string, unknown>;
        defines: Record<string, unknown>;
    }): string {
        const material = {
            __type__: 'cc.Material',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            _native: '',
            _effectAsset: {
                __uuid__: BUILTIN_UNLIT_UUID,
                __expectedType__: 'cc.EffectAsset',
            },
            _techIdx: 0,
            _defines: [
                opts.defines,
                {},
                {},
            ],
            _states: [
                {
                    priority: opts.priority,
                    rasterizerState: {},
                    depthStencilState: opts.depthStencilState,
                    blendState: {
                        targets: [
                            {
                                blendColorMask: opts.blendColorMask,
                            },
                        ],
                    },
                },
                {
                    rasterizerState: {},
                    depthStencilState: {},
                    blendState: { targets: [{}] },
                },
                {
                    rasterizerState: {},
                    depthStencilState: {},
                    blendState: { targets: [{}] },
                },
            ],
            _props: [
                opts.props,
                {},
                {},
            ],
        };

        return `${JSON.stringify(material, null, 2)}\n`;
    }

    private _clampRef(v: number): number {
        return Math.max(0, Math.min(255, Math.floor(v)));
    }
}
