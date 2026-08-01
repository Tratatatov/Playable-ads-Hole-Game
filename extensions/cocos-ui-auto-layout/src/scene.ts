/**
 * Cocos Creator 3.x UI Auto-Layout Builder — Scene Process Script
 *
 * This script runs inside the Cocos Creator SCENE process and has
 * access to the full cc runtime including Node, UITransform, Sprite, Label,
 * Button, Widget, Layout etc.
 *
 * IMPORTANT: This file is loaded by Cocos Creator's "scene" contributions.
 * Do NOT use Node.js APIs (fs, path) here — use only cc / cce globals.
 */

import type { UILayout, UINodeDef } from './main';

// ─────────────────────────────────────────────
// Cocos Creator runtime globals (available in scene process)
// ─────────────────────────────────────────────
declare const cc: any;
declare const cce: any;
declare const Editor: any;

// ─────────────────────────────────────────────
// Color utility
// ─────────────────────────────────────────────

function hexToColor(hex: string): any {
  if (!hex) return new cc.Color(255, 255, 255, 255);
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return new cc.Color(r, g, b, 255);
}

function parseAlign(val: string | undefined, map: Record<string, any>, def: any) {
  return val && map[val] !== undefined ? map[val] : def;
}

// ─────────────────────────────────────────────
// Node builder
// ─────────────────────────────────────────────

function applyBaseTransform(node: any, def: UINodeDef) {
  // UITransform
  const uiTransform = node.addComponent(cc.UITransform);
  uiTransform.setContentSize(def.width ?? 200, def.height ?? 50);
  uiTransform.anchorPoint = new cc.Vec2(def.anchorX ?? 0.5, def.anchorY ?? 0.5);

  // Position
  node.setPosition(def.x ?? 0, def.y ?? 0, 0);

  // Color & Opacity
  if (def.color) {
    node.color = hexToColor(def.color);
  }
  if (def.opacity !== undefined) {
    node.opacity = def.opacity;
  }
}

function applyWidget(node: any, widgetDef: UINodeDef['widget']) {
  if (!widgetDef) return;
  const widget = node.addComponent(cc.Widget);
  widget.alignFlags = 0;

  if (widgetDef.alignLeft !== undefined) {
    widget.isAlignLeft = widgetDef.alignLeft;
    if (widgetDef.alignLeft) {
      widget.left = widgetDef.left ?? 0;
      widget.isAbsoluteLeft = widgetDef.isAbsoluteLeft ?? true;
    }
  }
  if (widgetDef.alignRight !== undefined) {
    widget.isAlignRight = widgetDef.alignRight;
    if (widgetDef.alignRight) {
      widget.right = widgetDef.right ?? 0;
      widget.isAbsoluteRight = widgetDef.isAbsoluteRight ?? true;
    }
  }
  if (widgetDef.alignTop !== undefined) {
    widget.isAlignTop = widgetDef.alignTop;
    if (widgetDef.alignTop) {
      widget.top = widgetDef.top ?? 0;
      widget.isAbsoluteTop = widgetDef.isAbsoluteTop ?? true;
    }
  }
  if (widgetDef.alignBottom !== undefined) {
    widget.isAlignBottom = widgetDef.alignBottom;
    if (widgetDef.alignBottom) {
      widget.bottom = widgetDef.bottom ?? 0;
      widget.isAbsoluteBottom = widgetDef.isAbsoluteBottom ?? true;
    }
  }
}

function applyLayout(node: any, layoutDef: UINodeDef['layout']) {
  if (!layoutDef) return;
  const layout = node.addComponent(cc.Layout);

  const typeMap: Record<string, any> = {
    horizontal: cc.Layout.Type.HORIZONTAL,
    vertical: cc.Layout.Type.VERTICAL,
    grid: cc.Layout.Type.GRID,
    none: cc.Layout.Type.NONE,
  };
  layout.type = typeMap[layoutDef.type] ?? cc.Layout.Type.NONE;

  const resizeMap: Record<string, any> = {
    none: cc.Layout.ResizeMode.NONE,
    children: cc.Layout.ResizeMode.CHILDREN,
    container: cc.Layout.ResizeMode.CONTAINER,
  };
  layout.resizeMode = resizeMap[layoutDef.resizeMode ?? 'none'] ?? cc.Layout.ResizeMode.NONE;

  layout.spacingX = layoutDef.spacingX ?? 0;
  layout.spacingY = layoutDef.spacingY ?? 0;
  layout.paddingLeft = layoutDef.paddingLeft ?? 0;
  layout.paddingRight = layoutDef.paddingRight ?? 0;
  layout.paddingTop = layoutDef.paddingTop ?? 0;
  layout.paddingBottom = layoutDef.paddingBottom ?? 0;

  if (layoutDef.startAxis) {
    layout.startAxis = layoutDef.startAxis === 'vertical'
      ? cc.Layout.AxisDirection.VERTICAL
      : cc.Layout.AxisDirection.HORIZONTAL;
  }
}

function buildNode(def: UINodeDef, parentNode: any): any {
  // 1. Create node
  const node = new cc.Node(def.name || 'Node');
  node.setParent(parentNode);

  // 2. Apply common UITransform / position / color
  applyBaseTransform(node, def);

  // 3. Apply type-specific components
  switch (def.type) {
    case 'Sprite': {
      const sprite = node.addComponent(cc.Sprite);
      const typeMap: Record<string, any> = {
        simple: cc.Sprite.Type.SIMPLE,
        sliced: cc.Sprite.Type.SLICED,
        tiled: cc.Sprite.Type.TILED,
        filled: cc.Sprite.Type.FILLED,
      };
      sprite.type = typeMap[def.spriteType ?? 'simple'] ?? cc.Sprite.Type.SIMPLE;

      // Try to load sprite frame from project assets if path is given
      if (def.spritePath) {
        cc.assetManager.loadAny(
          { path: def.spritePath.replace(/\.[^/.]+$/, ''), type: cc.SpriteFrame },
          (err: any, sf: any) => {
            if (!err && sf) {
              sprite.spriteFrame = sf;
            } else {
              // Leave default (invisible) — asset can be linked later in editor
              console.warn(`[UI Auto-Layout] Sprite not found: ${def.spritePath}`);
            }
          }
        );
      }
      break;
    }

    case 'Label': {
      const label = node.addComponent(cc.Label);
      label.string = def.text ?? 'Label';
      label.fontSize = def.fontSize ?? 24;
      label.lineHeight = def.lineHeight ?? (def.fontSize ?? 24) + 8;

      if (def.fontColor) {
        label.color = hexToColor(def.fontColor);
      }

      label.isBold = def.bold ?? false;
      label.isItalic = def.italic ?? false;

      const hAlignMap: Record<string, any> = {
        left: cc.Label.HorizontalAlign.LEFT,
        center: cc.Label.HorizontalAlign.CENTER,
        right: cc.Label.HorizontalAlign.RIGHT,
      };
      label.horizontalAlign = parseAlign(def.horizontalAlign, hAlignMap, cc.Label.HorizontalAlign.CENTER);

      const vAlignMap: Record<string, any> = {
        top: cc.Label.VerticalAlign.TOP,
        middle: cc.Label.VerticalAlign.CENTER,
        bottom: cc.Label.VerticalAlign.BOTTOM,
      };
      label.verticalAlign = parseAlign(def.verticalAlign, vAlignMap, cc.Label.VerticalAlign.CENTER);

      const overflowMap: Record<string, any> = {
        none: cc.Label.Overflow.NONE,
        clamp: cc.Label.Overflow.CLAMP,
        shrink: cc.Label.Overflow.SHRINK,
        resize: cc.Label.Overflow.RESIZE_HEIGHT,
      };
      label.overflow = parseAlign(def.overflow, overflowMap, cc.Label.Overflow.CLAMP);
      break;
    }

    case 'Button': {
      const button = node.addComponent(cc.Button);
      button.interactable = def.interactable ?? true;
      // Add a Sprite to the button node for visuals
      const sprite = node.addComponent(cc.Sprite);
      if (def.spritePath) {
        cc.assetManager.loadAny(
          { path: def.spritePath.replace(/\.[^/.]+$/, ''), type: cc.SpriteFrame },
          (err: any, sf: any) => {
            if (!err && sf) {
              sprite.spriteFrame = sf;
              button.normalSprite = sf;
            }
          }
        );
      }
      // Add a child label "Label" for button text
      if (def.text) {
        const labelNode = new cc.Node('Label');
        labelNode.setParent(node);
        const lt = labelNode.addComponent(cc.UITransform);
        lt.setContentSize(def.width ?? 200, def.height ?? 50);
        const label = labelNode.addComponent(cc.Label);
        label.string = def.text;
        label.fontSize = def.fontSize ?? 20;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        if (def.fontColor) label.color = hexToColor(def.fontColor);
      }
      break;
    }

    case 'ScrollView': {
      node.addComponent(cc.ScrollView);
      node.addComponent(cc.Sprite); // background
      break;
    }

    case 'RichText': {
      const rt = node.addComponent(cc.RichText);
      rt.string = def.text ?? '<color=#ffffff>Rich Text</color>';
      rt.fontSize = def.fontSize ?? 20;
      break;
    }

    case 'EditBox': {
      const eb = node.addComponent(cc.EditBox);
      eb.string = def.text ?? '';
      eb.fontSize = def.fontSize ?? 20;
      eb.maxLength = 100;
      break;
    }

    default:
      // Plain Node — no additional components
      break;
  }

  // 4. Layout component
  if (def.layout) {
    applyLayout(node, def.layout);
  }

  // 5. Widget component
  if (def.widget) {
    applyWidget(node, def.widget);
  }

  // 6. Recurse into children
  if (def.children && def.children.length > 0) {
    for (const child of def.children) {
      buildNode(child, node);
    }
  }

  return node;
}

// ─────────────────────────────────────────────
// Scene script export — called via IPC
// ─────────────────────────────────────────────

export const methods: Record<string, (...args: any[]) => any> = {
  /**
   * Build UI nodes in the current scene.
   *
   * @param layout  UILayout JSON object with .nodes array
   * @returns       { success: boolean, count: number, error?: string }
   */
  buildNodes(layout: UILayout) {
    try {
      // Find the Canvas or the currently selected node as parent
      let parentNode: any = null;

      // Try to use the selected node first
      const selectedNodes = cce.Selection.getSelectedNodes ? cce.Selection.getSelectedNodes() : [];
      if (selectedNodes && selectedNodes.length > 0) {
        parentNode = selectedNodes[0];
      }

      // Fallback: find Canvas in the scene
      if (!parentNode) {
        const roots = cce.Scene.getNodesOfType ? cce.Scene.getNodesOfType(cc.Canvas) : [];
        if (roots && roots.length > 0) {
          parentNode = roots[0].node;
        }
      }

      // Final fallback: use scene root
      if (!parentNode) {
        parentNode = cce.Scene.root;
      }

      if (!parentNode) {
        return { success: false, error: 'Could not find a parent node in the scene. Please open a scene first.' };
      }

      // Create a container root node
      const rootNode = new cc.Node(layout.name || 'UIRoot');
      rootNode.setParent(parentNode);
      const rootTransform = rootNode.addComponent(cc.UITransform);
      rootTransform.setContentSize(
        layout.canvasWidth ?? 1080,
        layout.canvasHeight ?? 1920
      );

      // Build all nodes
      let count = 0;
      for (const nodeDef of layout.nodes) {
        buildNode(nodeDef, rootNode);
        count++;
      }

      // Mark scene as dirty so Cocos shows changes
      cce.Scene.saveScene();

      console.log(`[UI Auto-Layout] ✅ Built ${count} root node(s) successfully`);
      return { success: true, count };
    } catch (err: any) {
      console.error('[UI Auto-Layout] Scene build error:', err);
      return { success: false, error: String(err) };
    }
  },
};
