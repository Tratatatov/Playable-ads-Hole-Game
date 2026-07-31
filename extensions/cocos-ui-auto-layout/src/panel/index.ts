/**
 * Cocos Creator 3.x UI Auto-Layout Builder — Panel Process Script
 *
 * This file is the "panel" entry point registered in package.json.
 * It renders the panel HTML and handles messages from/to the main extension process.
 */

'use strict';

import * as path from 'path';

export const template = `file://${path.join(__dirname, '..', 'static', 'panel', 'index.html')}`;

export const $ = {
  app: '#app',
};

export const style = `
  :host { margin: 0; padding: 0; width: 100%; height: 100%; }
`;

/**
 * Messages the panel can receive from the extension main process
 */
export const messages: Record<string, (...args: any[]) => void> = {
  'build-result'(result: { success: boolean; count?: number; error?: string }) {
    // Forward result to the web panel iframe
    const appEl = (document as any).querySelector('#app');
    if (appEl && appEl.contentWindow) {
      appEl.contentWindow.postMessage({ type: 'build-result', result }, '*');
    }
  },
};

export function ready() {
  console.log('[UI Auto-Layout] Panel ready');
}

export function close() {
  console.log('[UI Auto-Layout] Panel closed');
}
