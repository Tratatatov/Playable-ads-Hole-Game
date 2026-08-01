/**
 * IGamePhase — контракт фазы игрового цикла.
 * enter/exit вызываются GameStateMachine при переходах.
 */
export interface IGamePhase {
    enter(): void;
    exit(): void;
}
