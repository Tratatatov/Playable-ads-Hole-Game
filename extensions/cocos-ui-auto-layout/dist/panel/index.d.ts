/**
 * Cocos Creator 3.x UI Auto-Layout Builder — Panel Process Script
 *
 * This file is the "panel" entry point registered in package.json.
 * It renders the panel HTML and handles messages from/to the main extension process.
 */
export declare const template: string;
export declare const $: {
    app: string;
};
export declare const style = "\n  :host { margin: 0; padding: 0; width: 100%; height: 100%; }\n";
/**
 * Messages the panel can receive from the extension main process
 */
export declare const messages: Record<string, (...args: any[]) => void>;
export declare function ready(): void;
export declare function close(): void;
