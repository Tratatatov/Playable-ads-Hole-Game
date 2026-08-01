/**
 * GameState — перечень состояний FSM.
 * Вынесен отдельно, чтобы избежать циклических зависимостей
 * между EventBus и GameStateMachine.
 *
 * Игровой цикл: Tutorial → Gameplay → EndGame
 * (Boot — служебная фаза инициализации до старта цикла)
 */
export const enum GameState {
    Boot     = 'Boot',
    Tutorial = 'Tutorial',
    Gameplay = 'Gameplay',
    EndGame  = 'EndGame',
}
