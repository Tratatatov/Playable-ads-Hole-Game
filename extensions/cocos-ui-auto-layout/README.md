# UI Auto-Layout Builder — Cocos Creator 3.x Extension

**Automatically build complete UI node hierarchies in Cocos Creator from JSON or AI Vision output.**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧩 **Node Builder** | Creates Node, Sprite, Label, Button, ScrollView, RichText, EditBox |
| 📐 **UITransform** | Sets exact sizes, positions, anchor points |
| 🔗 **Widget** | Responsive anchoring (left/right/top/bottom) for screen adaptation |
| 📋 **Layout** | Horizontal, Vertical, Grid auto-layout with spacing and padding |
| 🎨 **Modern Panel UI** | Glassmorphism dark-theme panel with live JSON editor |
| 📦 **6 Built-in Presets** | Main Menu, Dialog, HUD, Settings, Inventory, Loading Screen |
| 🤖 **AI Vision Mode** | Copy-paste prompt for ChatGPT/Claude/Gemini to generate JSON from screenshots |
| 📚 **Schema Reference** | Built-in docs for every supported field |

---

## 📁 Project Structure

```
cocos-ui-auto-layout/
├── package.json          ← Extension manifest (Cocos Creator 3.x)
├── tsconfig.json         ← TypeScript config
├── build.js              ← Build helper (tsc + copy statics)
├── src/
│   ├── main.ts           ← Extension Main process (IPC, validation)
│   ├── scene.ts          ← Scene process (creates cc.Node instances)
│   └── panel/
│       └── index.ts      ← Panel entry point
└── static/
    └── panel/
        ├── index.html    ← Panel HTML (modern dark UI)
        ├── style.css     ← Glassmorphism panel styles
        └── panel.js      ← Panel runtime logic (presets, build, copy)
```

---

## 🚀 Installation

### Step 1 — Build the extension

Make sure you have **Node.js 16+** and **npm** installed.

```bash
# Navigate to the extension directory
cd cocos-ui-auto-layout

# Install devDependencies (TypeScript compiler)
npm install

# Build: compile TypeScript and copy static files
node build.js
```

After building, a `dist/` folder is created with compiled JS.

### Step 2 — Copy to your Cocos project

Copy the **entire `cocos-ui-auto-layout/` folder** (including `dist/`) into your Cocos Creator project's `extensions/` directory:

```
<YourProject>/
└── extensions/
    └── cocos-ui-auto-layout/   ← paste here
        ├── package.json
        ├── dist/
        └── static/
```

> **Tip:** Alternatively, place it in the **global** extensions folder:
> - Windows: `C:\Users\<Username>\.CocosCreator\extensions\`
> - macOS: `~/.CocosCreator/extensions/`

### Step 3 — Enable the extension

1. Open **Cocos Creator 3.x**.
2. Go to **Extension → Extension Manager**.
3. Find **UI Auto-Layout Builder** in the list.
4. Click **Enable**.

### Step 4 — Open the Panel

Go to **Panel → UI Auto-Layout** in the menu bar.

---

## 🛠️ Usage

### Option A: Load a Preset

1. Open the extension panel.
2. Go to the **Presets** tab.
3. Click any preset card (e.g., "Main Menu").
4. The JSON loads into the Builder tab automatically.
5. Click **Build in Cocos** — the UI is created in your scene!

### Option B: Paste Custom JSON

1. Go to the **Builder** tab.
2. Paste your UI JSON into the editor.
3. (Optional) Click **Preview Tree** to see the node hierarchy.
4. Click **Build in Cocos**.

> **Target**: Select where to build (Selected Node / Canvas / Scene Root) in the Build Target dropdown.

### Option C: AI Vision (recommended for mockups)

1. Go to the **AI Prompt** tab.
2. Click **Copy** to copy the system prompt.
3. Open ChatGPT-4o, Claude 3.5 Sonnet, or Gemini 1.5 Pro.
4. Start a new chat, paste the prompt, then **attach your UI mockup screenshot**.
5. The AI returns a JSON layout.
6. Copy the JSON → paste into Builder tab → **Build in Cocos**!

---

## 📖 JSON Schema

```jsonc
{
  "name": "UIRoot",            // Container node name
  "canvasWidth": 1080,         // Reference canvas size
  "canvasHeight": 1920,
  "nodes": [                   // Array of root-level nodes
    {
      // ── Identity ──
      "name": "MyNode",        // Node name (required)
      "type": "Sprite",        // See types below

      // ── Transform ──
      "x": 0,                  // Local position X (Cocos Y-up: center = 0,0)
      "y": 0,                  // Local position Y
      "width": 400,            // UITransform content width
      "height": 200,           // UITransform content height
      "anchorX": 0.5,          // Anchor (0-1), default 0.5 center
      "anchorY": 0.5,

      // ── Appearance ──
      "color": "#FFFFFF",      // Hex color tint
      "opacity": 255,          // Opacity 0-255

      // ── Sprite fields ──
      "spritePath": "textures/ui/bg",    // Asset path (no extension)
      "spriteType": "simple",            // simple|sliced|tiled|filled

      // ── Label fields ──
      "text": "Hello World",
      "fontSize": 28,
      "fontColor": "#FFFFFF",
      "bold": false,
      "italic": false,
      "lineHeight": 36,
      "overflow": "clamp",              // none|clamp|shrink|resize
      "horizontalAlign": "center",      // left|center|right
      "verticalAlign": "middle",        // top|middle|bottom

      // ── Button fields ──
      "interactable": true,

      // ── Widget (responsive anchoring) ──
      "widget": {
        "alignLeft": true,   "left": 0,    "isAbsoluteLeft": true,
        "alignRight": true,  "right": 0,   "isAbsoluteRight": true,
        "alignTop": true,    "top": 0,     "isAbsoluteTop": true,
        "alignBottom": true, "bottom": 0,  "isAbsoluteBottom": true
      },

      // ── Layout (auto-layout children) ──
      "layout": {
        "type": "vertical",           // horizontal|vertical|grid|none
        "spacingX": 0,
        "spacingY": 16,
        "paddingLeft": 20,
        "paddingRight": 20,
        "paddingTop": 20,
        "paddingBottom": 20,
        "resizeMode": "container",    // none|children|container
        "startAxis": "horizontal"     // for grid: horizontal|vertical
      },

      // ── Children ──
      "children": [ /* recursive UINodeDef[] */ ]
    }
  ]
}
```

### Node Types

| `type` value | Components added | Notes |
|---|---|---|
| `Node` | UITransform | Plain container |
| `Sprite` | UITransform, Sprite | Image/background |
| `Label` | UITransform, Label | Text element |
| `Button` | UITransform, Sprite, Button | Interactive button (text via `text` field) |
| `ScrollView` | UITransform, ScrollView, Sprite | Scrollable container |
| `RichText` | UITransform, RichText | HTML-like rich text |
| `EditBox` | UITransform, EditBox | Text input field |

---

## ⚠️ Important Notes

1. **Coordinate System**: Cocos Creator uses **Y-up** coordinates. The center of the canvas is `(0, 0)`. Positive Y is **up**, positive X is **right**.
2. **Open a Scene First**: The extension creates nodes in the currently open scene. Make sure you have a scene open before clicking Build.
3. **Sprite Assets**: If you specify `spritePath`, the asset must exist in your project's `assets/` directory. If not found, the Sprite component is added but left empty (you can link it manually in the editor).
4. **Undo**: After building, you can press `Ctrl+Z` in Cocos Creator to undo.
5. **Build Target**: Use **"Selected Node in Scene"** to attach generated UI to an existing node (e.g., a Canvas child), or **"Canvas"** to auto-find the canvas.

---

## 🤖 AI Prompt Template

Copy this prompt and send it with your UI screenshot to any Vision-capable LLM:

```
You are a UI layout analyzer for Cocos Creator 3.x game engine.

Analyze the attached UI screenshot/mockup and generate a JSON layout definition.

Return ONLY valid JSON, no markdown, no explanation. Use this exact schema:
{ "name": "UIRoot", "canvasWidth": 1080, "canvasHeight": 1920, "nodes": [...] }

Rules:
- Cocos Y-up coordinates (center is 0,0; positive Y is up).
- type: Node|Sprite|Label|Button|ScrollView|RichText|EditBox
- For buttons: type="Button", text field for label.
- For text: type="Label" with fontSize, fontColor, horizontalAlign.
- For images: type="Sprite" with color as approximate color tint.
- Use widget for responsive elements that should stretch to screen edges.
- Use layout for containers with evenly-spaced children.
- Name nodes descriptively: "PlayButton", "HeaderLabel", "BackgroundSprite".
```

---

## 🔧 Development

To rebuild after making changes:

```bash
node build.js
```

Then reload the extension in Cocos Creator: **Extension Manager → Reload**.

---

## 📄 License

MIT License — free to use, modify, and distribute.
