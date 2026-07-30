/**
 * create-stencil-materials.js
 *
 * Standalone Node.js скрипт — создаёт два .mtl файла для Stencil Buffer эффекта.
 * Запуск: node create-stencil-materials.js
 *
 * НЕ требует компиляции, работает напрямую в Node.js.
 * Запускать из корня проекта Cocos Creator.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * КАК РАБОТАЕТ ЭФФЕКТ (Stencil Buffer Hole):
 *
 *  ШАГ 1 — M_StencilMask применяется на меш-диск дыры (HoleDisc)
 *    • Рендерится ПЕРВЫМ (priority=200)
 *    • ALWAYS проходит stencil тест → записывает 1 в stencil buffer
 *    • ColorMask=0 → НЕВИДИМ (не пишет в color buffer)
 *    • depthWrite=false → не мешает Z-buffer
 *    → На экране дыра НЕ видна, но в stencil buffer помечена область "1"
 *
 *  ШАГ 2 — M_StencilContent применяется на тёмный диск (HoleBottom)
 *    • Рендерится ВТОРЫМ (priority=201)
 *    • EQUAL(ref=1) → рендерится ТОЛЬКО там, где stencil==1
 *    • Показывает тёмный цвет (#000000) — имитация глубины дыры
 *    → Визуально: видна чёрная "бездна" только внутри области маски
 *
 *  ИТОГ: Кольцо дыры (rim) рендерится обычным материалом поверх всего.
 *        Объекты падающие "внутрь" исчезают за маской.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Генерируем UUID v4 без внешних зависимостей ──────────────────────────────
function uuidv4() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
}

// ── UUID стандартного builtin-standard эффекта Cocos Creator 3.x ─────────────
//    (одинаков для всех проектов Cocos Creator 3.x)
const BUILTIN_STANDARD_UUID = 'a3cd009f-0ab0-420d-9278-b9fdab939bbc';

// ── Константы Stencil (WebGL/WebGPU) ─────────────────────────────────────────
//    ComparisonFunc: NEVER=0 LESS=1 EQUAL=2 LESS_EQUAL=3
//                   GREATER=4 NOT_EQUAL=5 GREATER_EQUAL=6 ALWAYS=7
//    StencilOp:     ZERO=0 KEEP=1 REPLACE=2 INC_SAT=3 DEC_SAT=4
//                   INVERT=5 INC_WRAP=6 DEC_WRAP=7

// ── Материал 1: M_StencilMask — Пишет маску в Stencil Buffer ─────────────────
const STENCIL_MASK = {
    __type__: 'cc.Material',
    _name: 'StencilMask',
    _objFlags: 0,
    __editorExtras__: {},
    _native: '',
    _effectAsset: {
        __uuid__: BUILTIN_STANDARD_UUID,
        __expectedType__: 'cc.EffectAsset',
    },
    _techIdx: 0,
    _defines: [{}, {}, {}],
    _states: [
        {
            priority: 200,   // Рендерится ДО обычных объектов сцены
            rasterizerState: {},
            depthStencilState: {
                depthTest: true,
                depthWrite: false,               // НЕ пишем в Z-Buffer
                // ── Front face ──────────────────────────────────────────
                stencilTestFront:     true,
                stencilFuncFront:     7,         // ALWAYS — всегда пишем маску
                stencilReadMaskFront: 255,
                stencilWriteMaskFront:255,
                stencilFailOpFront:   1,         // KEEP
                stencilZFailOpFront:  1,         // KEEP
                stencilPassOpFront:   2,         // REPLACE → пишем ref в буфер
                stencilRefFront:      1,         // Пишем значение 1
                // ── Back face (зеркально для двусторонних мешей) ────────
                stencilTestBack:      true,
                stencilFuncBack:      7,
                stencilReadMaskBack:  255,
                stencilWriteMaskBack: 255,
                stencilFailOpBack:    1,
                stencilZFailOpBack:   1,
                stencilPassOpBack:    2,
                stencilRefBack:       1,
            },
            blendState: {
                targets: [
                    {
                        blendColorMask: 0,       // НЕ пишем ни один цветовой канал
                    },
                ],
            },
        },
        { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
        { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
    ],
    _props: [
        {
            // Цвет не важен (ColorMask=0), но задаём для инспектора
            mainColor: { __type__: 'cc.Color', r: 10, g: 10, b: 10, a: 255 },
        },
        {},
        {},
    ],
};

// ── Материал 2: M_StencilContent — Рендерится только внутри маски ─────────────
const STENCIL_CONTENT = {
    __type__: 'cc.Material',
    _name: 'StencilContent',
    _objFlags: 0,
    __editorExtras__: {},
    _native: '',
    _effectAsset: {
        __uuid__: BUILTIN_STANDARD_UUID,
        __expectedType__: 'cc.EffectAsset',
    },
    _techIdx: 0,
    _defines: [{}, {}, {}],
    _states: [
        {
            priority: 201,   // Рендерится сразу ПОСЛЕ маски
            rasterizerState: {},
            depthStencilState: {
                depthTest: true,
                depthWrite: true,
                // ── Front face ──────────────────────────────────────────
                stencilTestFront:     true,
                stencilFuncFront:     2,         // EQUAL — только где stencil==1
                stencilReadMaskFront: 255,
                stencilWriteMaskFront:0,         // НЕ изменяем stencil buffer
                stencilFailOpFront:   1,         // KEEP
                stencilZFailOpFront:  1,         // KEEP
                stencilPassOpFront:   1,         // KEEP
                stencilRefFront:      1,         // Сравниваем с 1
                // ── Back face ──────────────────────────────────────────
                stencilTestBack:      true,
                stencilFuncBack:      2,
                stencilReadMaskBack:  255,
                stencilWriteMaskBack: 0,
                stencilFailOpBack:    1,
                stencilZFailOpBack:   1,
                stencilPassOpBack:    1,
                stencilRefBack:       1,
            },
            blendState: {
                targets: [{}],   // Обычный непрозрачный рендер
            },
        },
        { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
        { rasterizerState: {}, depthStencilState: {}, blendState: { targets: [{}] } },
    ],
    _props: [
        {
            // Чёрный = тёмная бездна дыры
            mainColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
        },
        {},
        {},
    ],
};

// ── Генерация meta-файла ──────────────────────────────────────────────────────
function buildMeta(uuid) {
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

// ── MAIN ──────────────────────────────────────────────────────────────────────
function main() {
    // Определяем папку Materials (скрипт запускается из корня проекта)
    const projectRoot  = process.cwd();
    const materialsDir = path.join(projectRoot, 'assets', '_Game', 'Materials');

    if (!fs.existsSync(materialsDir)) {
        fs.mkdirSync(materialsDir, { recursive: true });
        console.log(`📁 Created directory: ${materialsDir}`);
    }

    const materials = [
        { filename: 'M_StencilMask',    data: STENCIL_MASK    },
        { filename: 'M_StencilContent', data: STENCIL_CONTENT },
    ];

    console.log('\n🎭 Stencil Material Creator\n' + '─'.repeat(50));

    for (const mat of materials) {
        const mtlPath  = path.join(materialsDir, `${mat.filename}.mtl`);
        const metaPath = path.join(materialsDir, `${mat.filename}.mtl.meta`);

        if (fs.existsSync(mtlPath)) {
            console.log(`⚠️  SKIP  ${mat.filename}.mtl  (already exists)`);
            continue;
        }

        const uuid = uuidv4();
        fs.writeFileSync(mtlPath,  JSON.stringify(mat.data, null, 2), 'utf-8');
        fs.writeFileSync(metaPath, JSON.stringify(buildMeta(uuid), null, 2), 'utf-8');
        console.log(`✅ CREATED  ${mat.filename}.mtl  [uuid: ${uuid}]`);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('📌 Usage in scene:');
    console.log('   HoleDisc   mesh  →  M_StencilMask.mtl    (invisible stencil writer)');
    console.log('   HoleBottom mesh  →  M_StencilContent.mtl (dark void, stencil reader)');
    console.log('   HoleRim    mesh  →  any opaque material   (visible rim/edge)');
    console.log('\n✨ Refresh Asset Database in Cocos Creator to see the new materials.\n');
}

main();
