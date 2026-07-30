// ──────────────────────────────────────────────────────────────────────────────
// Camera Preview — scene.ts
// Выполняется в контексте движка Cocos Creator (scene process).
// Рендерит выбранную камеру в RenderTexture и возвращает base64-строку.
// ──────────────────────────────────────────────────────────────────────────────

// Объявляем тип «cc» — движок подключается глобально в scene-process
declare const cc: {
    director: {
        getScene: () => CocosNode | null;
        root: {
            device: GFXDevice;
        };
    };
    RenderTexture: new () => CocosRenderTexture;
    Camera: unknown;
    game: { canvas: HTMLCanvasElement };
};

interface CocosNode {
    name: string;
    children: CocosNode[];
    getComponent: (type: unknown) => CocosCamera | null;
}

interface CocosCamera {
    enabled: boolean;
    node: CocosNode;
    camera: {
        projectionType: number;
    };
    targetTexture: CocosRenderTexture | null;
    clearFlags: number;
    clearColor: { r: number; g: number; b: number; a: number };
}

interface CocosRenderTexture {
    initialize: (opts: { width: number; height: number }) => void;
    destroy: () => void;
    window: {
        framebuffer: unknown;
        width: number;
        height: number;
    };
    width: number;
    height: number;
}

interface GFXDevice {
    copyFramebufferToBuffer: (
        framebuffer: unknown,
        buffer: ArrayBuffer,
        regions: Array<{
            texOffset: { x: number; y: number; z: number };
            texExtent: { width: number; height: number; depth: number };
            buffOffset: number;
            buffStride: number;
            buffTexHeight: number;
        }>,
    ) => void;
}

// ── Утилита: рекурсивный обход узлов сцены ───────────────────────────────────
function collectCameras(node: CocosNode, results: string[]): void {
    const cam = node.getComponent((cc as unknown as Record<string, unknown>)['Camera']);
    if (cam && (cam as CocosCamera).enabled) {
        results.push(node.name);
    }
    for (const child of node.children) {
        collectCameras(child, results);
    }
}

function findCameraByName(node: CocosNode, name: string): CocosCamera | null {
    const cam = node.getComponent((cc as unknown as Record<string, unknown>)['Camera']);
    if (cam && node.name === name) return cam as CocosCamera;
    for (const child of node.children) {
        const found = findCameraByName(child, name);
        if (found) return found;
    }
    return null;
}

// ── Конвертация RGBA ArrayBuffer → base64 PNG через Canvas ───────────────────
function rgbaToBase64(
    data: ArrayBuffer,
    width: number,
    height: number,
): string {
    // В Electron/scene process есть доступ к Canvas API браузера
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);

    const src = new Uint8Array(data);
    const dst = imageData.data;

    // Cocos возвращает буфер снизу-вверх (OpenGL convention) — переворачиваем
    for (let row = 0; row < height; row++) {
        const srcRow = height - 1 - row;
        for (let col = 0; col < width; col++) {
            const srcIdx = (srcRow * width + col) * 4;
            const dstIdx = (row * width + col) * 4;
            dst[dstIdx]     = src[srcIdx];     // R
            dst[dstIdx + 1] = src[srcIdx + 1]; // G
            dst[dstIdx + 2] = src[srcIdx + 2]; // B
            dst[dstIdx + 3] = src[srcIdx + 3]; // A
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}

// ── Экспортируемые методы сцены ───────────────────────────────────────────────

export function load(): void {}
export function unload(): void {}

export const methods = {
    // Вернуть список имён всех активных камер в сцене
    listCameras(): string[] {
        const scene = cc.director.getScene();
        if (!scene) return [];
        const names: string[] = [];
        collectCameras(scene, names);
        return names;
    },

    // Рендер камеры с именем cameraName в RenderTexture и возврат base64
    captureCamera(cameraName: string, width: number, height: number): string | null {
        const scene = cc.director.getScene();
        if (!scene) return null;

        const cam = findCameraByName(scene, cameraName);
        if (!cam) return null;

        // Клампируем разрешение (слишком большие текстуры — медленно)
        const w = Math.min(Math.max(width, 64), 1920);
        const h = Math.min(Math.max(height, 36), 1080);

        // Создаём временный RenderTexture
        const rt = new cc.RenderTexture();
        rt.initialize({ width: w, height: h });

        const prevTarget = cam.targetTexture;
        cam.targetTexture = rt;

        // Вынуждаем один рендер-кадр
        const device = cc.director.root.device;
        const buf = new ArrayBuffer(w * h * 4);

        try {
            device.copyFramebufferToBuffer(rt.window.framebuffer, buf, [
                {
                    texOffset:    { x: 0, y: 0, z: 0 },
                    texExtent:    { width: w, height: h, depth: 1 },
                    buffOffset:   0,
                    buffStride:   w * 4,
                    buffTexHeight: h,
                },
            ]);
        } catch {
            cam.targetTexture = prevTarget;
            rt.destroy();
            return null;
        }

        cam.targetTexture = prevTarget;
        rt.destroy();

        return rgbaToBase64(buf, w, h);
    },
};
