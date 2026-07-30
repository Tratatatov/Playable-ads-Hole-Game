'use strict';

/**
 * Object Placer — Main Process
 *
 * Отвечает за:
 * - Открытие/закрытие панели
 * - Обработку глобальных горячих клавиш (shortcuts)
 * - IPC-мост между панелью и scene-скриптом
 */

exports.methods = {

    /** Открыть панель Object Placer */
    openPanel() {
        Editor.Panel.open('object-placer.default');
    },

    /**
     * Глобальный хоткей размещения (Ctrl+Shift+G).
     * Перенаправляем в панель — если она открыта, она обработает.
     */
    async onPlaceHotkey() {
        try {
            await Editor.Message.send('object-placer', 'place-hotkey-triggered');
        } catch (_) {
            // Панель не открыта — просто игнорируем
        }
    },
};

exports.load = function () {
    console.log('[ObjectPlacer] Extension loaded');
};

exports.unload = function () {
    console.log('[ObjectPlacer] Extension unloaded');
};
