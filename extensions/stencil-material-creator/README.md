# Stencil Material Creator

Editor Extension + standalone скрипт для создания двух настроенных материалов  
эффекта **Stencil Buffer Hole** в Cocos Creator 3.x.

---

## Структура файлов

```
extensions/stencil-material-creator/
├── create-stencil-materials.js   ← Standalone скрипт (запускать напрямую)
├── package.json                  ← Манифест Editor Extension
├── npm-package.json              ← npm зависимости для TS сборки
├── tsconfig.json                 ← TypeScript конфиг
└── src/
    └── main.ts                   ← Исходник Extension (для редактора Cocos)
```

---

## Быстрый запуск (Node.js скрипт)

```bash
# Из корня проекта:
node extensions/stencil-material-creator/create-stencil-materials.js
```

Создаёт два файла в `assets/_Game/Materials/`:
- `M_StencilMask.mtl`
- `M_StencilContent.mtl`

После запуска — **Right Click → Refresh** в Asset Browser редактора Cocos Creator.

---

## Использование как Editor Extension

1. Откройте **Extension Manager** (`Extension > Extension Manager`)
2. Нажмите **Import Extension** и выберите папку `stencil-material-creator`
3. После активации: меню `Extension > Stencil Buffer > Create Stencil Materials`

---

## Как работает эффект

```
Camera
  │
  ▼
[PASS 1] HoleDisc Mesh + M_StencilMask (priority=200)
  • stencilFuncFront = ALWAYS
  • stencilPassOpFront = REPLACE, ref=1
  • ColorMask = 0  ← невидим!
  → Пишет "1" в Stencil Buffer в области дыры
  │
  ▼
[PASS 2] HoleBottom Mesh + M_StencilContent (priority=201)
  • stencilFuncFront = EQUAL, ref=1
  • Рендерится ТОЛЬКО там, где Stencil == 1
  • Цвет: чёрный (#000000) = "бездна"
  │
  ▼
[PASS 3+] Все остальные объекты (rim, floor, macaroons...)
  • Обычный рендер без stencil
```

### Иерархия нодов в сцене

```
Hole (Node)
├── HoleDisc    [MeshRenderer → M_StencilMask]     ← невидимый, пишет маску
├── HoleBottom  [MeshRenderer → M_StencilContent]  ← тёмная бездна
└── HoleRim     [MeshRenderer → M_Hole.mtl]        ← серое кольцо края
```

---

## Настройки материалов

### M_StencilMask.mtl

| Параметр | Значение | Объяснение |
|---|---|---|
| `priority` | `200` | Рендерится первым |
| `depthWrite` | `false` | Не засоряет Z-Buffer |
| `stencilFuncFront` | `7` (ALWAYS) | Всегда проходит тест |
| `stencilPassOpFront` | `2` (REPLACE) | Пишет ref в буфер |
| `stencilRefFront` | `1` | Записываемое значение |
| `blendColorMask` | `0` | **Невидим** |

### M_StencilContent.mtl

| Параметр | Значение | Объяснение |
|---|---|---|
| `priority` | `201` | Рендерится после маски |
| `stencilFuncFront` | `2` (EQUAL) | Только где stencil==ref |
| `stencilRefFront` | `1` | Сравниваем с 1 |
| `stencilWriteMaskFront` | `0` | Не изменяет буфер |
| `mainColor` | `#000000` | Цвет «бездны» |

---

## Константы Stencil (WebGL/WebGPU)

**ComparisonFunc:**
`NEVER=0  LESS=1  EQUAL=2  LESS_EQUAL=3  GREATER=4  NOT_EQUAL=5  GREATER_EQUAL=6  ALWAYS=7`

**StencilOp:**
`ZERO=0  KEEP=1  REPLACE=2  INC_SAT=3  DEC_SAT=4  INVERT=5  INC_WRAP=6  DEC_WRAP=7`
