import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ──────────────────────────────────────────────────────────────────────────────
// Stencil Material Creator — Cocos Creator 3.x Editor Extension
//
// Создаёт два материала для эффекта «дыры в полу» через Stencil Buffer:
//
//  M_StencilMask.mtl    — Маска дыры (Stencil Writer)
//    ● stencilFuncFront  = ALWAYS (7)   → всегда проходит тест
//    ● stencilPassOpFront = REPLACE (2) → записывает ref=1 в Stencil Buffer
//    ● blendColorMask = 0               → НЕ пишет в Color Buffer (невидим)
//    ● depthWrite = false               → не засоряет Z-Buffer
//    ● priority = 200                   → рендерится ДО обычных объектов
//
//  M_StencilContent.mtl — Контент внутри дыры (Stencil Reader)
//    ● stencilFuncFront  = EQUAL (2)    → проходит только там, где stencil == 1
//    ● stencilWriteMask  = 0            → не изменяет Stencil Buffer
//    ● priority = 201                   → рендерится сразу ПОСЛЕ маски
//    ● mainColor = #000000              → чёрная «бездна» дыры
//
// Stencil-константы (WebGL/WebGPU/Cocos):
//   ComparisonFunc: NEVER=0 LESS=1 EQUAL=2 LESS_EQUAL=3
//                  GREATER=4 NOT_EQUAL=5 GREATER_EQUAL=6 ALWAYS=7
//   StencilOp:     ZERO=0 KEEP=1 REPLACE=2 INC_SAT=3 DEC_SAT=4
//                  INVERT=5 INC_WRAP=6 DEC_WRAP=7
// ──────────────────────────────────────────────────────────────────────────────

// UUID стандартного builtin-standard эффекта Cocos Creator 3.x (глобальный)
const BUILTIN_STANDARD_EFFECT_UUID = 'a3cd009f-0ab0-420d-9278-b9fdab939bbc';

// Объявляем Editor API (предоставляется Cocos Editor runtime)
declare const Editor: {
    Project: { path: string };
    Message: { send: (channel: string, event: string, ...args: unknown[]) => void };
    Dialog: {
        info: (msg: string, opts?: { title?: string; buttons?: string[] }) => Promise<void>;
        warn: (msg: string, opts?: { title?: string; buttons?: string[] }) => Promise<void>;
    };
};

// ── Материал 1: Stencil Writer (Mask) ────────────────────────────────────────
function buildMaskMaterial(): object {
    return {
        __type__: 'cc.Material',
        _name: 'StencilMask',
        _objFlags: 0,
        __editorExtras__: {},
        _native: '',
        _effectAsset: {
            __uuid__: BUILTIN_STANDARD_EFFECT_UUID,
            __expectedType__: 'cc.EffectAsset',
        },
        _techIdx: 0,
        _defines: [{}, {}, {}],
        _states: [
            {
                priority: 200,          // Рендерится ДО обычной геометрии
                rasterizerState: {},
                depthStencilState: {
                    depthTest: true,
                    depthWrite: false,  // Не засоряем Z-Buffer — объект невидим
                    // ── Front face ─────────────────────────────────────────
                    stencilTestFront:      true,
                    stencilFuncFront:      7,   // ALWAYS — всегда проходим тест
                    stencilReadMaskFront:  255,
                    stencilWriteMaskFront: 255,
                    stencilFailOpFront:    1,   // KEEP
                    stencilZFailOpFront:   1,   // KEEP
                    stencilPassOpFront:    2,   // REPLACE — пишем ref в буфер
                    stencilRefFront:       1,   // Пишем значение 1
                    // ── Back face (для двусторонних мешей) ─────────────────
                    stencilTestBack:       true,
                    stencilFuncBack:       7,
                    stencilReadMaskBack:   255,
                    stencilWriteMaskBack:  255,
                    stencilFailOpBack:     1,
                    stencilZFailOpBack:    1,
                    stencilPassOpBack:     2,
                    stencilRefBack:        1,
                },
                blendState: {
                    targets: [
                        {
                            blendColorMask: 0,  // НЕВИДИМ: не пишем ни один цветовой канал
                        },
                    ],
                },
            },
            // Техники 1 и 2 — дефолтные (transparent / shadow)
            { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
            { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
        ],
        _props: [
            {
                // Цвет не отображается (ColorMask=0), но задаём для удобства в инспекторе
                mainColor: { __type__: 'cc.Color', r: 10, g: 10, b: 10, a: 255 },
            },
            {},
            {},
        ],
    };
}

// ── Материал 2: Stencil Reader (Content) ─────────────────────────────────────
function buildContentMaterial(): object {
    return {
        __type__: 'cc.Material',
        _name: 'StencilContent',
        _objFlags: 0,
        __editorExtras__: {},
        _native: '',
        _effectAsset: {
            __uuid__: BUILTIN_STANDARD_EFFECT_UUID,
            __expectedType__: 'cc.EffectAsset',
        },
        _techIdx: 0,
        _defines: [{}, {}, {}],
        _states: [
            {
                priority: 201,          // Рендерится сразу ПОСЛЕ маски
                rasterizerState: {},
                depthStencilState: {
                    depthTest: true,
                    depthWrite: true,
                    // ── Front face ─────────────────────────────────────────
                    stencilTestFront:      true,
                    stencilFuncFront:      2,   // EQUAL — только где stencil == 1
                    stencilReadMaskFront:  255,
                    stencilWriteMaskFront: 0,   // Не изменяем Stencil Buffer
                    stencilFailOpFront:    1,   // KEEP
                    stencilZFailOpFront:   1,   // KEEP
                    stencilPassOpFront:    1,   // KEEP
                    stencilRefFront:       1,   // Сравниваем с 1
                    // ── Back face ──────────────────────────────────────────
                    stencilTestBack:       true,
                    stencilFuncBack:       2,
                    stencilReadMaskBack:   255,
                    stencilWriteMaskBack:  0,
                    stencilFailOpBack:     1,
                    stencilZFailOpBack:    1,
                    stencilPassOpBack:     1,
                    stencilRefBack:        1,
                },
                blendState: {
                    targets: [{}],      // Обычный непрозрачный рендер
                },
            },
            { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
            { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
        ],
        _props: [
            {
                mainColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },  // Чёрный = бездна
            },
            {},
            {},
        ],
    };
}

// ── Генерация .meta файла ─────────────────────────────────────────────────────
function buildMeta(uuid: string): object {
    return {
        ver: '1.0.21',
        importer: 'material',
        imported: true,
        uuid,
        files: ['.json'],
        subMetas: {},
        userData: {},
    };
}

// ── Точка входа (вызывается через меню Editor) ────────────────────────────────
export function createStencilMaterials(): void {
    const projectPath: string = Editor.Project.path;
    const materialsDir: string = path.join(projectPath, 'assets', '_Game', 'Materials');

    if (!fs.existsSync(materialsDir)) {
        fs.mkdirSync(materialsDir, { recursive: true });
    }

    const targets: Array<{ name: string; data: object }> = [
        { name: 'M_StencilMask',    data: buildMaskMaterial()    },
        { name: 'M_StencilContent', data: buildContentMaterial() },
    ];

    const created: string[] = [];
    const skipped: string[] = [];

    for (const target of targets) {
        const mtlPath  = path.join(materialsDir, `${target.name}.mtl`);
        const metaPath = path.join(materialsDir, `${target.name}.mtl.meta`);

        if (fs.existsSync(mtlPath)) {
            skipped.push(target.name);
            continue;
        }

        const uuid = crypto.randomUUID();
        fs.writeFileSync(mtlPath,  JSON.stringify(target.data, null, 2), 'utf-8');
        fs.writeFileSync(metaPath, JSON.stringify(buildMeta(uuid), null, 2), 'utf-8');
        created.push(target.name);
    }

    // Обновляем Asset Database редактора
    Editor.Message.send('asset-db', 'refresh-asset', 'db://assets/_Game/Materials');

    const createdList = created.map(n => `  • ${n}.mtl`).join('\n');
    const skippedList = skipped.length > 0
        ? `\nSkipped (already exist):\n${skipped.map(n => `  • ${n}.mtl`).join('\n')}\n`
        : '';

    if (created.length > 0) {
        void Editor.Dialog.info(
            `✅ Stencil Materials Created!\n\n` +
            `Created:\n${createdList}\n${skippedList}\n` +
            `Path: assets/_Game/Materials/\n\n` +
            `──────────────────────────────\n` +
            `Usage:\n` +
            `  HoleDisc   mesh → M_StencilMask.mtl    (invisible stencil writer)\n` +
            `  HoleBottom mesh → M_StencilContent.mtl (dark void inside the hole)\n` +
            `  HoleRim    mesh → any opaque material  (visible grey rim)`,
            { title: 'Stencil Material Creator', buttons: ['OK'] },
        );
    } else {
        void Editor.Dialog.warn(
            `All Stencil materials already exist.\nDelete them manually to recreate.`,
            { title: 'Stencil Material Creator', buttons: ['OK'] },
        );
    }
}
