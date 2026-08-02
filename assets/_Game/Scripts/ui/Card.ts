/**
 * Card — UI-карточка цвета (иконка + галочка завершения).
 * Вешается на корневую ноду карточки; ссылки назначаются в Inspector.
 */

import { _decorator, Component, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Card')
export class Card extends Component {
    @property({ type: Sprite, tooltip: 'Галочка (появляется при полном сборе цвета)' })
    checkSprite: Sprite = null!;

    @property({ type: Sprite, tooltip: 'Иконка цвета' })
    iconSprite: Sprite = null!;
}
