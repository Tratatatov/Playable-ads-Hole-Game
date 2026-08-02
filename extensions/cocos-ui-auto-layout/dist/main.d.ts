/**
 * Cocos Creator 3.x UI Auto-Layout Builder Extension
 * Main Process — runs in the Editor Main process (Node.js)
 *
 * Handles:
 *   - Panel open/close
 *   - IPC bridge between Panel UI and Scene process
 *   - Validation of incoming UI JSON before dispatching to scene
 */
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
    /** Asset path relative to project assets dir, e.g. "textures/ui/bg.png" */
    spritePath?: string;
    /** Sprite frame type: 'simple' | 'sliced' | 'tiled' | 'filled' */
    spriteType?: string;
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
    interactable?: boolean;
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
export declare const methods: Record<string, (...args: any[]) => any>;
/**
 * Extension lifecycle: called when the extension is loaded
 */
export declare function load(): void;
/**
 * Extension lifecycle: called when the extension is unloaded
 */
export declare function unload(): void;
