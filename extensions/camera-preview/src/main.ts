// ──────────────────────────────────────────────────────────────────────────────
// Camera Preview — main.ts
// Точка входа расширения (main process). Мост между панелью и scene script.
// ──────────────────────────────────────────────────────────────────────────────

declare const Editor: {
    Panel: {
        open: (name: string) => void;
        close: (name: string) => void;
    };
    Message: {
        send: (channel: string, event: string, ...args: unknown[]) => void;
        request: (channel: string, event: string, ...args: unknown[]) => Promise<unknown>;
        broadcast: (event: string, ...args: unknown[]) => void;
    };
};

// ── Открыть панель ────────────────────────────────────────────────────────────
export function openPanel(): void {
    Editor.Panel.open('camera-preview');
}

// ── Запросить снимок кадра: Panel → Main → Scene → Main → Panel ───────────────
export async function captureFrame(
    _event: unknown,
    cameraName: string,
    width: number,
    height: number,
): Promise<void> {
    let base64: unknown = null;
    try {
        base64 = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'camera-preview',
            method: 'captureCamera',
            args: [cameraName, width, height],
        });
    } catch {
        // Сцена не загружена или нет камеры
    }

    // Переслать данные обратно в панель
    Editor.Message.send('camera-preview', 'camera-preview:frame-data', base64);
}

// ── Получить список камер ─────────────────────────────────────────────────────
export async function listCameras(_event: unknown): Promise<void> {
    let cameras: unknown = [];
    try {
        cameras = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'camera-preview',
            method: 'listCameras',
            args: [],
        });
    } catch {
        // Сцена ещё не загружена
    }

    Editor.Message.send('camera-preview', 'camera-preview:cameras-list', cameras);
}

export function load(): void {
    console.log('[CameraPreview] Extension loaded');
}

export function unload(): void {
    console.log('[CameraPreview] Extension unloaded');
}
