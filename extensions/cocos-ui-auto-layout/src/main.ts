/**
 * Cocos Creator 3.x UI Auto-Layout Builder Extension
 * Main Process — runs in the Editor Main process (Node.js)
 *
 * Handles:
 *   - Panel open/close
 *   - IPC bridge between Panel UI and Scene process
 *   - Validation of incoming UI JSON before dispatching to scene
 */

'use strict';

import * as path from 'path';

// ─────────────────────────────────────────────
// Type definitions for the UI JSON schema
// ─────────────────────────────────────────────

export interface UINodeDef {
  /** Unique name for the node */
  name: string;
  /** Node type. Determines which cc components are added */
  type: 'Node' | 'Sprite' | 'Label' | 'Button' | 'EditBox' | 'RichText' | 'ScrollView' | 'Layout' | 'Canvas';
  /** Position in parent's coordinate space (local) */
  x?: number;
  y?: number;
  /** Content size */
  width?: number;
  height?: number;
  /** Anchor point (0-1 range), default center 0.5,0.5 */
  anchorX?: number;
  anchorY?: number;
  /** Color as hex string e.g. "#FFFFFF" */
  color?: string;
  /** Opacity 0-255 */
  opacity?: number;
  // ── Sprite specific ──
  /** Asset path relative to project assets dir, e.g. "textures/ui/bg.png" */
  spritePath?: string;
  /** Sprite frame type: 'simple' | 'sliced' | 'tiled' | 'filled' */
  spriteType?: string;
  // ── Label specific ──
  text?: string;
  fontSize?: number;
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  lineHeight?: number;
  /** Overflow mode: 'none' | 'clamp' | 'shrink' | 'resize' */
  overflow?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  // ── Widget (responsive anchoring) ──
  widget?: {
    alignLeft?: boolean;
    alignRight?: boolean;
    alignTop?: boolean;
    alignBottom?: boolean;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    isAbsoluteLeft?: boolean;
    isAbsoluteRight?: boolean;
    isAbsoluteTop?: boolean;
    isAbsoluteBottom?: boolean;
  };
  // ── Layout ──
  layout?: {
    /** 'horizontal' | 'vertical' | 'grid' */
    type: string;
    /** Spacing between items */
    spacingX?: number;
    spacingY?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    /** Resize mode: 'none' | 'children' | 'container' */
    resizeMode?: string;
    startAxis?: 'horizontal' | 'vertical';
  };
  // ── Button specific ──
  interactable?: boolean;
  // ── Children ──
  children?: UINodeDef[];
}

export interface UILayout {
  /** Root node name, defaults to "UIRoot" */
  name?: string;
  /** Canvas width reference */
  canvasWidth?: number;
  /** Canvas height reference */
  canvasHeight?: number;
  /** Array of root-level nodes */
  nodes: UINodeDef[];
}

// ─────────────────────────────────────────────
// Extension module export
// ─────────────────────────────────────────────

export const methods: Record<string, (...args: any[]) => any> = {
  /**
   * Open the UI Auto-Layout Builder panel
   */
  openPanel() {
    console.log('[UI Auto-Layout] openPanel called in main process!');
    
    try {
      Editor.Panel.open('cocos-ui-auto-layout');
    } catch (e) {
      console.warn('[UI Auto-Layout] Failed to open panel using package name, trying fallback...', e);
    }
  },

  /**
   * Receive UI JSON from panel and forward validated data to the scene process
   */
  async buildUI(jsonString: string) {
    let layout: UILayout;

    // 1. Parse & validate JSON
    try {
      layout = JSON.parse(jsonString) as UILayout;
    } catch (err) {
      console.error('[UI Auto-Layout] Invalid JSON input:', err);
      Editor.Dialog.error('Invalid JSON', {
        detail: String(err),
        buttons: ['OK'],
      });
      return { success: false, error: `JSON parse error: ${err}` };
    }

    if (!layout.nodes || !Array.isArray(layout.nodes) || layout.nodes.length === 0) {
      Editor.Dialog.warn('Empty Layout', {
        detail: 'The JSON does not contain any nodes. Please add at least one node under the "nodes" key.',
        buttons: ['OK'],
      });
      return { success: false, error: 'No nodes defined in JSON' };
    }

    // 2. Send to scene process to create nodes
    try {
      console.log(`[UI Auto-Layout] Dispatching ${layout.nodes.length} root node(s) to scene process...`);
      const result = await Editor.Message.request('scene', 'build-nodes', layout);
      console.log('[UI Auto-Layout] Scene build result:', result);
      return result;
    } catch (err) {
      console.error('[UI Auto-Layout] Scene IPC error:', err);
      return { success: false, error: String(err) };
    }
  },
};

/**
 * Extension lifecycle: called when the extension is loaded
 */
export function load() {
  console.log('[UI Auto-Layout] Extension loaded ✅');
}

/**
 * Extension lifecycle: called when the extension is unloaded
 */
export function unload() {
  console.log('[UI Auto-Layout] Extension unloaded');
}
