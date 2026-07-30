'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// Camera Preview — main.js (dist)
// Точка входа расширения. Используем exports.methods — стандартный
// Cocos Creator 3.x API для main process скриптов.
// ──────────────────────────────────────────────────────────────────────────────

exports.load = function () {
    console.log('[CameraPreview] Extension loaded');
};

exports.unload = function () {
    console.log('[CameraPreview] Extension unloaded');
};

exports.methods = {

    // ── Открыть панель ────────────────────────────────────────────────────────
    openPanel() {
        Editor.Panel.open('camera-preview');
    },

    // ── Запрос кадра: Panel → Main → Scene Script → Main → Panel ─────────────
    async captureFrame(event, cameraName, width, height) {
        let base64 = null;
        try {
            base64 = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'camera-preview',
                method: 'captureCamera',
                args: [cameraName, width || 512, height || 288],
            });
        } catch (e) {
            // Сцена не загружена или камера не найдена
        }
        // Пересылаем результат в панель
        Editor.Message.send('camera-preview', 'camera-preview:frame-data', base64);
    },

    // ── Список камер в сцене ──────────────────────────────────────────────────
    async listCameras(event) {
        let cameras = [];
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'camera-preview',
                method: 'listCameras',
                args: [],
            });
            if (Array.isArray(result)) cameras = result;
        } catch (e) {
            // Сцена ещё не загружена
        }
        Editor.Message.send('camera-preview', 'camera-preview:cameras-list', cameras);
    },
};
