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
import { HoleController } from './gameplay/HoleController';
import { LevelConfig, setLevelConfig } from './gameplay/LevelConfig';
import { UIConfig } from './ui/UIConfig';
import { Collectable, CollectableType } from './gameplay/Collectable';
import { HUDView } from './ui/HUDView';
import { HUDPresenter } from './ui/HUDPresenter';
import { TutorialView } from './ui/TutorialView';
import { TutorialPresenter } from './ui/TutorialPresenter';
import { EndCardView } from './ui/EndCardView';
import { EndCardPresenter } from './ui/EndCardPresenter';
import { RemainingCollectablesView } from './ui/RemainingCollectablesView';
import { RemainingCollectablesPresenter } from './ui/RemainingCollectablesPresenter';

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

    @property(UIConfig)
    uiConfig: UIConfig = null!;

    @property(HoleController)
    holeController: HoleController = null!;


    private _hudPresenter: HUDPresenter | null = null;
    private _tutorialPresenter: TutorialPresenter | null = null;
    private _endCardPresenter: EndCardPresenter | null = null;
    private _remainingPresenter: RemainingCollectablesPresenter | null = null;

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
        if (this.mainCamera && this.holeController) {
            CameraControlService.init(this.mainCamera, this.holeController.node);
        }

        if (this.uiConfig) {
            if (this.uiConfig.remainingBlueLabel && this.uiConfig.remainingRedLabel && this.uiConfig.remainingGreenLabel && this.uiConfig.remainingTurquoiseLabel) {
                const remainingView = new RemainingCollectablesView(
                    this.uiConfig.remainingBlueLabel,
                    this.uiConfig.remainingRedLabel,
                    this.uiConfig.remainingGreenLabel,
                    this.uiConfig.remainingTurquoiseLabel
                );
                this._remainingPresenter = new RemainingCollectablesPresenter(remainingView);
                this._remainingPresenter.init();
            }

            if (this.uiConfig.hudScoreLabel && this.uiConfig.hudTimerLabel) {
                const hudView = new HUDView(this.uiConfig.hudScoreLabel, this.uiConfig.hudTimerLabel);
                this._hudPresenter = new HUDPresenter(hudView);
                this._hudPresenter.init();
            }

            if (this.uiConfig.tutorialFingerNode && this.uiConfig.tutorialHintLabel && this.uiConfig.tutorialPanel && this.uiConfig.tutorialPanelOpacity) {
                const tutorialView = new TutorialView(
                    this.uiConfig.tutorialFingerNode,
                    this.uiConfig.tutorialHintLabel,
                    this.uiConfig.tutorialPanel,
                    this.uiConfig.tutorialPanelOpacity
                );
                this._tutorialPresenter = new TutorialPresenter(tutorialView);
                this._tutorialPresenter.init();
            }

            if (this.uiConfig.endCardPanel && this.uiConfig.endCardOpacity && this.uiConfig.endCardFinalScoreLabel && this.uiConfig.endCardCtaButton && this.uiConfig.endCardCtaLabel) {
                const endCardView = new EndCardView(
                    this.uiConfig.endCardPanel,
                    this.uiConfig.endCardOpacity,
                    this.uiConfig.endCardFinalScoreLabel,
                    this.uiConfig.endCardCtaButton,
                    this.uiConfig.endCardCtaLabel
                );
                this._endCardPresenter = new EndCardPresenter(endCardView);
                this._endCardPresenter.init();
            }
        }

        // 1. Инициализация предразмещенных объектов (без пула)
        console.log('[Регистрация сервисов] Поиск предразмещенных коллектаблов на сцене');
        const collectables = director.getScene()?.getComponentsInChildren(Collectable) || [];
        const counts: Record<CollectableType, number> = {
            [CollectableType.Blue]: 0,
            [CollectableType.Red]: 0,
            [CollectableType.Green]: 0,
            [CollectableType.Turquoise]: 0
        };

        for (const comp of collectables) {
            comp.scoreValue = this.levelConfig.collectableScore;
            
            if (this.collectableTextures.length > 0) {
                comp.setTexture(this.collectableTextures[comp.type % this.collectableTextures.length]);
            }
            counts[comp.type]++;
        }
        
        GameStore.setInitialCollectables(counts);
        console.log(`[GameBootstrap] Зарегистрировано ${collectables.length} предразмещенных объектов.`);

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



    private _onFirstTouch = (): void => {
        console.log('[GameBootstrap] Первый тач! Переход в GameplayState');
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
        this._remainingPresenter?.destroy();
        this._hudPresenter?.destroy();
        this._tutorialPresenter?.destroy();
        this._endCardPresenter?.destroy();
    }
}
