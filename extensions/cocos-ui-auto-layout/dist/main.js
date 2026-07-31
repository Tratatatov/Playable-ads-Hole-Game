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
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
// ─────────────────────────────────────────────
// Extension module export
// ─────────────────────────────────────────────
exports.methods = {
    /**
     * Open the UI Auto-Layout Builder panel
     */
    openPanel() {
        console.log('[UI Auto-Layout] openPanel called in main process!');
        try {
            Editor.Panel.open('cocos-ui-auto-layout');
        }
        catch (e) {
            console.warn('[UI Auto-Layout] Failed to open panel using package name, trying fallback...', e);
        }
    },
    /**
     * Receive UI JSON from panel and forward validated data to the scene process
     */
    async buildUI(jsonString) {
        let layout;
        // 1. Parse & validate JSON
        try {
            layout = JSON.parse(jsonString);
        }
        catch (err) {
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
        }
        catch (err) {
            console.error('[UI Auto-Layout] Scene IPC error:', err);
            return { success: false, error: String(err) };
        }
    },
};
/**
 * Extension lifecycle: called when the extension is loaded
 */
function load() {
    console.log('[UI Auto-Layout] Extension loaded ✅');
}
/**
 * Extension lifecycle: called when the extension is unloaded
 */
function unload() {
    console.log('[UI Auto-Layout] Extension unloaded');
}
