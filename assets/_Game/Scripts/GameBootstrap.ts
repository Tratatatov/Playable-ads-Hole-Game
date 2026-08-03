/**
 * GameBootstrap — точка входа игры.
 * Последовательность:
 *   1. Boot: инициализация сервисов, UI, AdNetworkManager.gameReady()
 *   2. CameraIntroState: пролёт камеры A→B, без управления
 *   3. TutorialState: ждём первый тач, показываем tutorial UI
 *   4. GameplayState: таймер тикает, игрок двигается
 *   5. EndGameState: отключаем ввод, показываем EndGame UI
 *
 * RULES §1.2: Жизненный цикл строго инкапсулирован в FSM.
 */

import { _decorator, Component, Node, Collider } from 'cc';
import { EventBus, GameEvent } from './core/EventBus';
import { GameStateMachine, GameState } from './core/GameStateMachine';
import { GameStore } from './core/GameStore';
import { AdNetworkManager } from './core/AdNetworkManager';
import { CameraControlService } from './core/CameraControlService';
import { CameraConfig } from './core/CameraConfig';
import { TimerService } from './core/TimerService';
import { CollectableCounterService } from './core/CollectableCounterService';
import { HoleGrowthService } from './core/HoleGrowthService';
import { DoorService } from './core/DoorService';
import { CollectableCollectionService } from './core/CollectableCollectionService';
import { AudioService } from './core/AudioService';
import { AudioConfig } from './core/AudioConfig';
import { ParticleService } from './core/ParticleService';
import { TweenService } from './core/TweenService';
import { CameraIntroState } from './core/states/CameraIntroState';
import { TutorialState } from './core/states/TutorialState';
import { GameplayState } from './core/states/GameplayState';
import { EndGameState } from './core/states/EndGameState';
import { HoleController } from './gameplay/HoleController';
import { LevelConfig, setLevelConfig } from './gameplay/LevelConfig';
import { BatchingConfig, setBatchingConfig } from './gameplay/BatchingConfig';
import { OptimizationConfig } from './gameplay/OptimizationConfig';
import { OptimizationService } from './core/OptimizationService';
import { UIConfig } from './ui/UIConfig';
import { UIMessagesConfig } from './ui/UIMessagesConfig';
import { UIMessagesService } from './ui/UIMessagesService';
import { UIAnimationService } from './ui/UIAnimationService';
import { TimerView } from './ui/TimerView';
import { TimerPresenter } from './ui/TimerPresenter';
import { TutorialView } from './ui/TutorialView';
import { TutorialPresenter } from './ui/TutorialPresenter';
import { TutorialFinger } from './ui/TutorialFinger';
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

    @property(LevelConfig)
    levelConfig: LevelConfig = null!;

    @property(UIConfig)
    uiConfig: UIConfig = null!;

    @property(UIMessagesConfig)
    uiMessagesConfig: UIMessagesConfig = null!;

    @property(AudioConfig)
    audioConfig: AudioConfig = null!;

    @property(CameraConfig)
    cameraConfig: CameraConfig = null!;

    @property(BatchingConfig)
    batchingConfig: BatchingConfig = null!;

    @property(OptimizationConfig)
    optimizationConfig: OptimizationConfig = null!;

    @property(HoleController)
    holeController: HoleController = null!;

    private _timerPresenter: TimerPresenter | null = null;
    private _tutorialPresenter: TutorialPresenter | null = null;
    private _endCardPresenter: EndCardPresenter | null = null;
    private _remainingPresenter: RemainingCollectablesPresenter | null = null;

    start(): void {
        setLevelConfig(this.levelConfig);
        setBatchingConfig(this.batchingConfig);
        this._boot();
    }

    update(dt: number): void {
        TimerService.update(dt);
        OptimizationService.update(dt);
    }

    lateUpdate(dt: number): void {
        CameraControlService.update(dt);
    }

    // ─────────────────────────────────────────────────────────────────────

    private _boot(): void {
        console.log('[GameBootstrap] Начало инициализации...');

        // 0. Initialize scene controllers
        this.holeController?.init();
        if (this.mainCamera && this.holeController) {
            if (!this.cameraConfig) {
                console.warn('[GameBootstrap] CameraConfig не назначен — камера с дефолтными параметрами');
            }
            CameraControlService.init(this.mainCamera, this.holeController.node, this.cameraConfig);
        }

        this._initUI();

        // 1. Сбросить состояние
        GameStore.reset();

        // 2. Сервисы
        CollectableCounterService.init();
        TimerService.init(this.levelConfig.totalTime);
        TweenService.init();
        if (this.uiMessagesConfig) {
            this.uiMessagesConfig.init();
            UIMessagesService.init(this.uiMessagesConfig);
        } else {
            console.warn('[GameBootstrap] UIMessagesConfig не назначен — UI-сообщения отключены');
        }
        if (this.holeController) {
            const viewNode = this.holeController.growthViewNode ?? this.holeController.node;
            if (!this.holeController.growthViewNode) {
                console.warn('[GameBootstrap] HoleController.growthViewNode не назначен — tween на корне');
            }
            // Body-коллайдер на корне HoleController (не absorbTrigger под growthView)
            const bodyCollider = this.holeController.getComponent(Collider);
            HoleGrowthService.init(viewNode, bodyCollider);
        } else {
            console.warn('[GameBootstrap] HoleController не назначен — HoleGrowthService без tween scale');
        }
        DoorService.init();
        // После DoorService: коллекции слушают DOOR_OPENED и включают следующий цвет
        CollectableCollectionService.init();
        ParticleService.init(this.uiMessagesConfig?.perfectMessageParticles ?? null);

        OptimizationService.init(
            this.optimizationConfig,
            this.mainCamera ? this.mainCamera : null
        );

        if (this.audioConfig) {
            AudioService.init(this.audioConfig);
        } else {
            console.warn('[GameBootstrap] AudioConfig не назначен — SFX отключены');
        }

        if (!this.batchingConfig) {
            console.warn('[GameBootstrap] BatchingConfig не назначен — активация коллекций с defaults');
        }

        if (!this.optimizationConfig) {
            console.warn('[GameBootstrap] OptimizationConfig не назначен — distance culling выкл.');
        }

        // 3. Рекламная сеть
        AdNetworkManager.gameReady();

        // 4. Ввод включается в TutorialState (после пролёта камеры)

        // 5. Зарегистрировать фазы игрового цикла
        GameStateMachine.register(GameState.CameraIntro, new CameraIntroState(this.cameraConfig));
        GameStateMachine.register(GameState.Tutorial, new TutorialState(this._tutorialPresenter));
        GameStateMachine.register(GameState.Gameplay, new GameplayState());
        GameStateMachine.register(GameState.EndGame, new EndGameState(this._endCardPresenter));

        // 6. Переходы: intro done → Tutorial; первый тач → Gameplay; таймер истёк → EndGame
        EventBus.on(GameEvent.CAMERA_INTRO_COMPLETE, this._onCameraIntroComplete, this);
        EventBus.on(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.on(GameEvent.TIMER_EXPIRED, this._onTimerExpired, this);

        // 7. Boot → CameraIntro
        console.log('[GameBootstrap] Переход в CameraIntroState');
        GameStateMachine.transition(GameState.CameraIntro);

        console.log('[GameBootstrap] Инициализация завершена!');
    }

    private _initUI(): void {
        if (!this.uiConfig) {
            console.warn('[GameBootstrap] UIConfig не назначен');
            return;
        }

        const ui = this.uiConfig;

        UIAnimationService.init(ui);

        // GameplayState UI — remaining counters
        if (ui.remainingBlueLabel && ui.remainingRedLabel && ui.remainingGreenLabel && ui.remainingTealLabel) {
            const remainingView = new RemainingCollectablesView(
                ui.remainingBlueLabel,
                ui.remainingRedLabel,
                ui.remainingGreenLabel,
                ui.remainingTealLabel
            );
            this._remainingPresenter = new RemainingCollectablesPresenter(remainingView);
            this._remainingPresenter.init();
        }

        // GameplayState UI — timer
        if (ui.hudTimerLabel) {
            const timerView = new TimerView(ui.hudTimerLabel);
            this._timerPresenter = new TimerPresenter(timerView);
            this._timerPresenter.init();
        }

        // TutorialState UI — достаточно пальца; panel/opacity опциональны
        const finger =
            ui.tutorialFinger
            ?? ui.tutorialFingerNode?.getComponent(TutorialFinger)
            ?? (ui.tutorialFingerNode ? ui.tutorialFingerNode.addComponent(TutorialFinger) : null);

        if (finger) {
            const tutorialView = new TutorialView(
                finger,
                ui.tutorialPanel
            );
            this._tutorialPresenter = new TutorialPresenter(tutorialView);
            this._tutorialPresenter.init();
        } else {
            console.warn('[GameBootstrap] TutorialFinger / tutorialFingerNode не назначен в UIConfig');
        }

        // EndGameState UI
        if (ui.endCardPanel && ui.endCardOpacity && ui.endCardCtaButton && ui.endCardCtaLabel) {
            const endCardView = new EndCardView(
                ui.endCardPanel,
                ui.endCardOpacity,
                ui.endCardCtaButton,
                ui.endCardCtaLabel
            );
            this._endCardPresenter = new EndCardPresenter(endCardView);
            this._endCardPresenter.init();
        } else {
            console.warn('[GameBootstrap] EndGameState UI не полностью назначен в UIConfig');
        }
    }

    private _onCameraIntroComplete = (): void => {
        // После пролёта — distance soft-cull (всё было видно на intro через resetAll)
        OptimizationService.applyNow();
        console.log('[GameBootstrap] Пролёт камеры завершён → TutorialState');
        GameStateMachine.transition(GameState.Tutorial);
    };

    private _onFirstTouch = (): void => {
        console.log('[GameBootstrap] Первый тач → GameplayState');
        GameStateMachine.transition(GameState.Gameplay);
    };

    private _onTimerExpired = (): void => {
        console.log('[GameBootstrap] Таймер истёк → EndGameState');
        GameStateMachine.transition(GameState.EndGame);
    };

    onDestroy(): void {
        EventBus.off(GameEvent.CAMERA_INTRO_COMPLETE, this._onCameraIntroComplete, this);
        EventBus.off(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.off(GameEvent.TIMER_EXPIRED, this._onTimerExpired, this);
        CollectableCollectionService.destroy();
        DoorService.destroy();
        HoleGrowthService.destroy();
        UIAnimationService.destroy();
        TweenService.destroy();
        UIMessagesService.destroy();
        ParticleService.destroy();
        OptimizationService.destroy();
        AudioService.destroy();
        CameraControlService.destroy();
        this._remainingPresenter?.destroy();
        this._timerPresenter?.destroy();
        this._tutorialPresenter?.destroy();
        this._endCardPresenter?.destroy();
    }
}
