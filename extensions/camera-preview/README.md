# Camera Preview — Cocos Creator 3.x Editor Extension

Расширение добавляет в редактор **плавающую dock-панель** с живым превью с любой камеры сцены. Панель остаётся видна независимо от того, выбрана ли камера в иерархии или нет.

---

## Функции

| Функция | Описание |
|---|---|
| **Live preview** | Превью обновляется с выбранным FPS (1 / 5 / 10 / 20 / 30) |
| **Выбор камеры** | Выпадающий список всех активных `Camera`-компонентов в сцене |
| **Соотношение сторон** | Free / 16:9 / 4:3 / 1:1 / 9:16 / Custom (своё W:H) |
| **Resize** | Окно dock-ится или плавает; при изменении размера превью масштабируется пропорционально |
| **FPS-счётчик** | Отображает реальную частоту обновления в правом нижнем углу статус-бара |

---

## Установка

1. Папка `camera-preview` уже находится в `extensions/`.
2. В Cocos Creator откройте **Extension → Extension Manager → Project**.
3. Расширение `Camera Preview` появится в списке — включите его.
4. Откройте панель через меню **Panel → Camera Preview**.

---

## Сборка (при изменении исходников)

```bash
cd extensions/camera-preview
npm install
npm run build
```

Или в режиме watch:
```bash
npm run watch
```

---

## Архитектура

```
extensions/camera-preview/
├── src/
│   ├── main.ts      ← main process: открытие панели, мост IPC
│   ├── scene.ts     ← scene process: RenderTexture capture → base64
│   └── (panel.js — ручной, не TS)
├── dist/
│   ├── main.js      ← скомпилирован из src/main.ts
│   ├── scene.js     ← скомпилирован из src/scene.ts
│   └── panel.js     ← ручной CommonJS, HTML + логика UI
└── package.json
```

### Поток данных

```
Panel (HTML)
  │  Editor.Message.send('capture-frame', camName, w, h)
  ▼
main.js
  │  Editor.Message.request('scene', 'execute-scene-script', {method:'captureCamera'})
  ▼
scene.js (движок)
  │  RenderTexture → copyFramebufferToBuffer → base64 JPEG
  ▼
main.js
  │  Editor.Message.send('camera-preview', 'frame-data', base64)
  ▼
panel.js methods['frame-data']
  │  this.__webview__.executeJavaScript('window.__onFrame(...)')
  ▼
Panel (HTML) — обновляет <img src="...">
```

---

## Известные ограничения

- Коcos Creator **не гарантирует** доступ к `copyFramebufferToBuffer` до первого рендер-кадра после загрузки сцены. Если превью не появляется — нажмите **↻** и подождите несколько секунд.
- Высокий FPS (30) при большом разрешении окна может снизить производительность редактора. Рекомендуется 10 fps для повседневной работы.
- Метод `this.__webview__` — внутренний API Cocos Creator и может измениться в будущих версиях редактора (3.x).
