/**
 * GameState — перечень состояний FSM.
 * Вынесен отдельно, чтобы избежать циклических зависимостей
 * между EventBus и GameStateMachine.
 */
export const enum GameState {
    Boot      = 'Boot',
    Tutorial  = 'Tutorial',
    Gameplay  = 'Gameplay',
    EndCard   = 'EndCard',
}
