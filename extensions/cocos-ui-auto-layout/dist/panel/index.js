/**
 * Cocos Creator 3.x UI Auto-Layout Builder — Panel Process Script
 *
 * This file is the "panel" entry point registered in package.json.
 * It renders the panel HTML and handles messages from/to the main extension process.
 */
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.style = exports.$ = exports.template = void 0;
exports.ready = ready;
exports.close = close;
const path = __importStar(require("path"));
exports.template = `file://${path.join(__dirname, '..', 'static', 'panel', 'index.html')}`;
exports.$ = {
    app: '#app',
};
exports.style = `
  :host { margin: 0; padding: 0; width: 100%; height: 100%; }
`;
/**
 * Messages the panel can receive from the extension main process
 */
exports.messages = {
    'build-result'(result) {
        // Forward result to the web panel iframe
        const appEl = document.querySelector('#app');
        if (appEl && appEl.contentWindow) {
            appEl.contentWindow.postMessage({ type: 'build-result', result }, '*');
        }
    },
};
function ready() {
    console.log('[UI Auto-Layout] Panel ready');
}
function close() {
    console.log('[UI Auto-Layout] Panel closed');
}
