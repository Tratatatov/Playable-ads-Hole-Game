/**
 * GameBootstrap — точка входа игры.
 * Последовательность:
 *   1. Boot: инициализация сервисов, UI, AdNetworkManager.gameReady()
 *   2. TutorialState: ждём первый тач, показываем tutorial UI
 *   3. GameplayState: таймер тикает, игрок двигается
 *   4. EndGameState: отключаем ввод, показываем EndGame UI
 *
 * RULES §1.2: Жизненный цикл строго инкапсулирован в FSM.
 */

import { _decorator, Component, Node } from 'cc';
import { EventBus, GameEvent } from './core/EventBus';
import { GameStateMachine, GameState } from './core/GameStateMachine';
import { GameStore } from './core/GameStore';
import { AdNetworkManager } from './core/AdNetworkManager';
import { InputService } from './core/InputService';
import { CameraControlService } from './core/CameraControlService';
import { TimerService } from './core/TimerService';
import { CollectableCounterService } from './core/CollectableCounterService';
import { HoleGrowthService } from './core/HoleGrowthService';
import { DoorService } from './core/DoorService';
import { CollectableCollectionService } from './core/CollectableCollectionService';
import { AudioService } from './core/AudioService';
import { AudioConfig } from './core/AudioConfig';
import { TutorialState } from './core/states/TutorialState';
import { GameplayState } from './core/states/GameplayState';
import { EndGameState } from './core/states/EndGameState';
import { HoleController } from './gameplay/HoleController';
import { LevelConfig, setLevelConfig } from './gameplay/LevelConfig';
import { UIConfig } from './ui/UIConfig';
import { TimerView } from './ui/TimerView';
import { TimerPresenter } from './ui/TimerPresenter';
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

    @property(LevelConfig)
    levelConfig: LevelConfig = null!;

    @property(UIConfig)
    uiConfig: UIConfig = null!;

    @property(AudioConfig)
    audioConfig: AudioConfig = null!;

    @property(HoleController)
    holeController: HoleController = null!;

    private _timerPresenter: TimerPresenter | null = null;
    private _tutorialPresenter: TutorialPresenter | null = null;
    private _endCardPresenter: EndCardPresenter | null = null;
    private _remainingPresenter: RemainingCollectablesPresenter | null = null;

    start(): void {
        setLevelConfig(this.levelConfig);
        this._boot();
    }

    update(dt: number): void {
        TimerService.update(dt);
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
            CameraControlService.init(this.mainCamera, this.holeController.node);
        }

        this._initUI();

        // 1. Сбросить состояние
        GameStore.reset();

        // 2. Сервисы
        CollectableCounterService.init();
        TimerService.init(this.levelConfig.totalTime);
        HoleGrowthService.init();
        DoorService.init();
        // После DoorService: коллекции слушают DOOR_OPENED и включают следующий цвет
        CollectableCollectionService.init();

        if (this.audioConfig) {
            AudioService.init(this.audioConfig);
        } else {
            console.warn('[GameBootstrap] AudioConfig не назначен — SFX отключены');
        }

        // 3. Рекламная сеть
        AdNetworkManager.gameReady();

        // 4. Ввод (FIRST_TOUCH в Tutorial)
        InputService.enable();

        // 5. Зарегистрировать фазы игрового цикла
        GameStateMachine.register(GameState.Tutorial, new TutorialState(this._tutorialPresenter));
        GameStateMachine.register(GameState.Gameplay, new GameplayState());
        GameStateMachine.register(GameState.EndGame, new EndGameState(this._endCardPresenter));

        // 6. Переходы: первый тач → Gameplay; таймер истёк → EndGame
        EventBus.on(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.on(GameEvent.TIMER_EXPIRED, this._onTimerExpired, this);

        // 7. Boot → Tutorial
        console.log('[GameBootstrap] Переход в TutorialState');
        GameStateMachine.transition(GameState.Tutorial);

        console.log('[GameBootstrap] Инициализация завершена!');
    }

    private _initUI(): void {
        if (!this.uiConfig) {
            console.warn('[GameBootstrap] UIConfig не назначен');
            return;
        }

        const ui = this.uiConfig;

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

        // TutorialState UI
        if (ui.tutorialFingerNode && ui.tutorialPanel && ui.tutorialPanelOpacity) {
            const tutorialView = new TutorialView(
                ui.tutorialFingerNode,
                ui.tutorialPanel,
                ui.tutorialPanelOpacity
            );
            this._tutorialPresenter = new TutorialPresenter(tutorialView);
            this._tutorialPresenter.init();
        } else {
            console.warn('[GameBootstrap] TutorialState UI не полностью назначен в UIConfig');
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

    private _onFirstTouch = (): void => {
        console.log('[GameBootstrap] Первый тач → GameplayState');
        GameStateMachine.transition(GameState.Gameplay);
    };

    private _onTimerExpired = (): void => {
        console.log('[GameBootstrap] Таймер истёк → EndGameState');
        GameStateMachine.transition(GameState.EndGame);
    };

    onDestroy(): void {
        EventBus.off(GameEvent.FIRST_TOUCH, this._onFirstTouch, this);
        EventBus.off(GameEvent.TIMER_EXPIRED, this._onTimerExpired, this);
        CollectableCollectionService.destroy();
        DoorService.destroy();
        HoleGrowthService.destroy();
        AudioService.destroy();
        this._remainingPresenter?.destroy();
        this._timerPresenter?.destroy();
        this._tutorialPresenter?.destroy();
        this._endCardPresenter?.destroy();
    }
}
