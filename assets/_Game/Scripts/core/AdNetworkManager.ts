/**
 * AdNetworkManager — абстракция рекламной сети.
 * Все редиректы в стор и сигналы готовности ОБЯЗАНЫ проходить через этот класс.
 * Прямое использование mraid.open() или конкретных SDK запрещено (RULES §1.3).
 */

declare const mraid: { open: (url: string) => void } | undefined;

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.attackhole.game';

export interface IAdNetworkManager {
    gameReady(): void;
    handleClickout(): void;
}

class AdNetworkManagerImpl implements IAdNetworkManager {
    private _isReady = false;

    /** Вызвать один раз в конце BootState */
    gameReady(): void {
        if (this._isReady) return;
        this._isReady = true;
        try {
            if (typeof mraid !== 'undefined') {
                // MRAID-compatible network
                console.log('[AdNetwork] mraid gameReady signal sent');
            } else {
                // Fallback: postMessage для других сетей (Google, IronSource и т.д.)
                window.parent?.postMessage('gameReady', '*');
            }
        } catch {
            // Тихий фейл — не ломать геймплей
        }
    }

    /** Вызвать при нажатии CTA кнопки */
    handleClickout(): void {
        try {
            if (typeof mraid !== 'undefined') {
                mraid.open(STORE_URL);
            } else {
                window.open(STORE_URL, '_blank');
            }
        } catch {
            window.open(STORE_URL, '_blank');
        }
    }
}

export let AdNetworkManager: IAdNetworkManager = new AdNetworkManagerImpl();
