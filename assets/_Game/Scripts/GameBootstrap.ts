/**
 * GameBootstrap — точка входа игры. Заменяет Player.ts.
 * Последовательность:
 *   1. BootState: prewarm пула, размещение коллектаблов, AdNetworkManager.gameReady()
 *   2. TutorialState: ждём первый тач
 *   3. GameplayState: таймер тикает, игрок двигается
 *   4. EndCardState: показываем EndCard
 *
 * RULES §1.2: Жизненный цикл строго инкапсулирован в FSM.
 */

import { _decorator, Component, Vec3, director, Texture2D, Node } from 'cc';
import { EventBus, GameEvent } from './core/EventBus';
import { GameStateMachine, GameState } from './core/GameStateMachine';
import { GameStore } from './core/GameStore';
import { AdNetworkManager } from './core/AdNetworkManager';
import { InputService } from './core/InputService';
import { CameraControlService } from './core/CameraControlService';
import { CollectablePool } from './gameplay/CollectablePool';
import { HoleController } from './gameplay/HoleController';
import { LevelConfig, setLevelConfig } from './gameplay/LevelConfig';
import { HUD } from './ui/HUD';
import { TutorialUI } from './ui/TutorialUI';
import { EndCard } from './ui/EndCard';

const { ccclass, property } = _decorator;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    @property({ tooltip: 'Включить режим отладки (включает DebugController)' })
    isDebugMode: boolean = false;

    @property(Node)
    mainCamera: Node = null!;

    @property({ type: [Texture2D], tooltip: 'Blue, Red, Green, Turquoise' })
    collectableTextures: Texture2D[] = [];

    @property(LevelConfig)
    levelConfig: LevelConfig = null!;

    @property(HoleController)
    holeController: HoleController = null!;

    @property(CollectablePool)
    collectablePool: CollectablePool = null!;

    @property(HUD)
    hud: HUD = null!;

    @property(TutorialUI)
    tutorialUI: TutorialUI = null!;

    @property(EndCard)
    endCard: EndCard = null!;

    // ── Scratch-переменная для размещения коллектаблов (no new in runtime) ──
    private readonly _spawnPos: Vec3 = new Vec3();

    // ── Таймер (без setInterval — управляется в update) ──────────────────
    private _timerRunning: boolean = false;
    private _timeAccum: number = 0;

    start(): void {
        // Устанавливаем глобальный конфиг до любой инициализации
        setLevelConfig(this.levelConfig);
        this._boot();
    }

    update(dt: number): void {
        if (!this._timerRunning) return;
        this._timeAccum += dt;
        // Тикаем каждую секунду
        const elapsed = Math.floor(this._timeAccum);
        const timeLeft = this.levelConfig.totalTime - elapsed;
        GameStore.setTimeLeft(timeLeft);
        if (timeLeft <= 0) {
            this._endGame();
        }
    }

    lateUpdate(dt: number): void {
        // Камера обновляется в lateUpdate, чтобы следовать за уже сдвинувшимся игроком
        CameraControlService.update(dt);
    }

    // ─────────────────────────────────────────────────────────────────────

    private _boot(): void {
        console.log('[GameBootstrap] Начало инициализации...');

        // 0. Initialize components
        console.log('[Регистрация сервисов] Инициализация контроллеров сцены (Hole, HUD, UI)');
        this.holeController?.init();
        this.hud?.init();
        this.tutorialUI?.init();
        this.endCard?.init();
        if (this.mainCamera && this.holeController) {
            CameraControlService.init(this.mainCamera, this.holeController.node);
        }

        // 1. Prewarm пула
        if (this.collectablePool) {
            console.log('[Регистрация сервисов] Prewarm пула коллектаблов');
            this.collectablePool.setTextures(this.collectableTextures);
            this.collectablePool.prewarm();
        }

        // 2. Сбросить состояние
        console.log('[GameBootstrap] Сброс состояния игры');
        GameStore.reset();

        // 3. Коллектаблы спавнятся при первом тач (не на старте)

        // 4. Уведомить рекламную сеть (RULES §1.3)
        console.log('[GameBootstrap] Уведомление AdNetworkManager: gameReady');
        AdNetworkManager.gameReady();

        // 5. Включить обработку ввода (InputService)
        console.log('[Регистрация сервисов] Включение InputService');
        InputService.enable();

        // 6. FSM: Boot → Tutorial
        console.log('[GameBootstrap] Переход в TutorialState');
        GameStateMachine.transition(GameState.Tutorial);

        // 7. Подписаться на геймплей-события
        EventBus.on(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.on(GameEvent.GAME_START, this._onGameStart, this);
        EventBus.on(GameEvent.GAME_END, this._onGameEnd, this);

        console.log('[GameBootstrap] Инициализация завершена!');
    }

    private _spawnCollectables(): void {
        if (!this.collectablePool) return;
        const half = this.levelConfig.arenaHalfSize - 1;
        for (let i = 0; i < this.levelConfig.collectableCount; i++) {
            // Случайная позиция на арене (scratch-вектор переиспользуется)
            this._spawnPos.set(
                (Math.random() * 2 - 1) * half,
                0.15,
                (Math.random() * 2 - 1) * half,
            );
            const typeIdx = Math.floor(Math.random() * 4);
            this.collectablePool.acquire(this._spawnPos, typeIdx);
        }
    }

    private _onFirstTouch = (): void => {
        console.log('[GameBootstrap] Первый тач! Переход в GameplayState');
        // Спавним коллектаблы только сейчас, чтобы они не были видны до старта
        this._spawnCollectables();
        GameStateMachine.transition(GameState.Gameplay);
        EventBus.emit(GameEvent.GAME_START, undefined as never);
    };

    private _onGameStart = (): void => {
        this._timerRunning = true;
        this._timeAccum = 0;
    };

    private _onGameEnd = (): void => {
        this._timerRunning = false;
    };

    private _endGame(): void {
        this._timerRunning = false;
        InputService.disable();
        EventBus.emit(GameEvent.GAME_END, { score: GameStore.score });
    }

    onDestroy(): void {
        EventBus.off(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.off(GameEvent.GAME_START, this._onGameStart, this);
        EventBus.off(GameEvent.GAME_END, this._onGameEnd, this);
    }
}
