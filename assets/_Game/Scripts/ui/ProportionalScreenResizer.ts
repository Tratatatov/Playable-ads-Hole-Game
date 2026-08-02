/**
 * ProportionalScreenResizer — компонент для пропорционального масштабирования UI-элемента
 * под размеры экрана/Canvas в Cocos Creator 3.x.
 *
 * Особенности и соблюдение правил проекта (RULES):
 * 1. Zero-GC (RULES §2.1): Отсутствие аллокаций памяти (`new Vec3()`) при ресайзе кадра или экрана.
 *    Используются заранее созданные scratch-переменные.
 * 2. Адаптивность (RULES §3.2): Реакция на изменение размера окна/Canvas (Portrait & Landscape).
 * 3. Бутстраппер (RULES §1.4): Содержит метод `init()`, но также автоматически подписывается
 *    на события экрана при `onEnable` для безопасной работы.
 * 4. Строгая типизация TypeScript (RULES §4.1): Без `any`, с декораторами Cocos Enum.
 */

import { _decorator, Component, Enum, Node, UITransform, Vec3, view, screen, EDITOR, Widget } from 'cc';

/**
 * Режимы пропорционального масштабирования
 */
export enum ScaleMode {
    /** Вписать объект полностью внутрь экрана (Contain, без обрезки) */
    FitInside = 0,
    /** Заполнить весь экран объектом (Cover, возможна обрезка по краям) */
    FillScreen = 1,
    /** Масштабировать строго по ширине экрана */
    MatchWidth = 2,
    /** Масштабировать строго по высоте экрана */
    MatchHeight = 3,
}

Enum(ScaleMode);

const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('ProportionalScreenResizer')
@executeInEditMode
@menu('UI/ProportionalScreenResizer')
export class ProportionalScreenResizer extends Component {
    @property({
        displayName: '🔄 Preview In Editor',
        tooltip: 'Кликните галочку/кнопку в Инспекторе для мгновенного выполнения ресайза в редакторе (не запуская игру)'
    })
    get previewInEditor(): boolean {
        return false;
    }
    set previewInEditor(val: boolean) {
        if (val) {
            this.updateLayout();
        }
    }

    @property({
        type: ScaleMode,
        tooltip: 'Режим масштабирования:\n- FitInside: Вписать в экран (Contain)\n- FillScreen: Заполнить экран (Cover)\n- MatchWidth: По ширине\n- MatchHeight: По высоте'
    })
    scaleMode: ScaleMode = ScaleMode.FitInside;

    @property({
        tooltip: 'Автоматически брать исходный размер из UITransform узла (Content Size)'
    })
    useNodeContentSize: boolean = true;

    @property({
        tooltip: 'Базовая ширина объекта/дизайна (используется, если useNodeContentSize = false или ширина 0)',
        visible(this: ProportionalScreenResizer) { return !this.useNodeContentSize; }
    })
    baseWidth: number = 1080;

    @property({
        tooltip: 'Базовая высота объекта/дизайна (используется, если useNodeContentSize = false или высота 0)',
        visible(this: ProportionalScreenResizer) { return !this.useNodeContentSize; }
    })
    baseHeight: number = 1920;

    @property({
        tooltip: 'Отступ сверху в процентах от высоты экрана (0 - 100)'
    })
    paddingTopPercent: number = 0;

    @property({
        tooltip: 'Отступ снизу в процентах от высоты экрана (0 - 100)'
    })
    paddingBottomPercent: number = 0;

    @property({
        tooltip: 'Отступ по бокам (слева и справа) в процентах от ширины экрана (0 - 100)'
    })
    paddingSidePercent: number = 0;

    @property({
        tooltip: 'Максимальная ширина объекта в процентах от ширины экрана (0 - 100, 0 = без ограничений)',
        range: [0, 100, 1]
    })
    maxWidthPercent: number = 100;

    @property({
        tooltip: 'Максимальная высота объекта в процентах от высоты экрана (0 - 100, 0 = без ограничений)',
        range: [0, 100, 1]
    })
    maxHeightPercent: number = 100;

    @property({
        tooltip: 'Сдвигать позицию объекта с учётом отступов (используйте только если у узла НЕТ cc.Widget)'
    })
    applyPaddingToPosition: boolean = false;

    @property({
        tooltip: 'Минимально допустимый масштаб'
    })
    minScale: number = 0.01;

    @property({
        tooltip: 'Максимально допустимый масштаб'
    })
    maxScale: number = 100.0;

    @property({
        tooltip: 'Обновить масштаб немедленно при старте / включении'
    })
    updateOnEnable: boolean = true;

    // ── Scratch-переменные (Zero-GC: переиспользуются при каждом ресайзе — RULES §2.1) ──
    private readonly _scratchScale: Vec3 = new Vec3(1, 1, 1);
    private readonly _scratchPos: Vec3 = new Vec3(0, 0, 0);
    private readonly _initialPos: Vec3 = new Vec3(0, 0, 0);
    private _hasSavedInitialPos: boolean = false;
    private _isInitialized: boolean = false;

    /**
     * Инициализация компонента Bootstrapper-ом (RULES §1.4)
     */
    init(): void {
        this._isInitialized = true;
        this._saveInitialPos();
        this.updateLayout();
    }

    onEnable(): void {
        this._saveInitialPos();

        // Регистрация слушателей изменения размера окна/холста
        view.on('canvas-resize', this._onScreenResize, this);
        screen.on('resize', this._onScreenResize, this);
        window.addEventListener('resize', this._onWindowResize);

        if (this.updateOnEnable || !this._isInitialized) {
            this.updateLayout();
        }
    }

    onDisable(): void {
        // Отписка от событий
        view.off('canvas-resize', this._onScreenResize, this);
        screen.off('resize', this._onScreenResize, this);
        window.removeEventListener('resize', this._onWindowResize);
    }

    private _saveInitialPos(): void {
        if (!this._hasSavedInitialPos && this.node) {
            this._initialPos.set(this.node.getPosition());
            this._hasSavedInitialPos = true;
        }
    }

    /**
     * Основной метод перерасчёта масштаба.
     * Не производит выделения памяти в куче (Zero-GC).
     */
    public updateLayout(): void {
        if (!this.node) return;

        this._saveInitialPos();

        // Получаем размеры видимой области Canvas
        const visibleSize = view.getVisibleSize();
        let screenW = visibleSize ? visibleSize.width : 0;
        let screenH = visibleSize ? visibleSize.height : 0;

        // В режиме редактора (EDITOR), если visibleSize равен 0, используем Design Resolution Canvas
        if (screenW <= 0 || screenH <= 0) {
            const designSize = view.getDesignResolutionSize();
            screenW = designSize ? designSize.width : 0;
            screenH = designSize ? designSize.height : 0;
        }

        if (screenW <= 0 || screenH <= 0) return;

        // Вычисляем отступы в пикселях на основе процентов
        const sidePaddingPx = screenW * (Math.max(0, this.paddingSidePercent) / 100);
        const topPaddingPx = screenH * (Math.max(0, this.paddingTopPercent) / 100);
        const bottomPaddingPx = screenH * (Math.max(0, this.paddingBottomPercent) / 100);

        // Полезный размер экрана с учётом padding
        const effectiveW = Math.max(1, screenW - sidePaddingPx * 2);
        const effectiveH = Math.max(1, screenH - topPaddingPx - bottomPaddingPx);

        let targetBaseW = this.baseWidth;
        let targetBaseH = this.baseHeight;

        // Если включен флаг useNodeContentSize, пытаемся взять ширину и высоту из UITransform
        if (this.useNodeContentSize) {
            const transform = this.node.getComponent(UITransform);
            if (transform && transform.width > 0 && transform.height > 0) {
                targetBaseW = transform.width;
                targetBaseH = transform.height;
            }
        }

        if (targetBaseW <= 0 || targetBaseH <= 0) return;

        // Вычисляем масштаб по полезной области экрана
        const scaleX = effectiveW / targetBaseW;
        const scaleY = effectiveH / targetBaseH;

        let finalScale = 1;

        switch (this.scaleMode) {
            case ScaleMode.FitInside:
                // Вписать внутрь полезной области экрана без обрезки
                finalScale = Math.min(scaleX, scaleY);
                break;
            case ScaleMode.FillScreen:
                // Заполнить полезную область экрана
                finalScale = Math.max(scaleX, scaleY);
                break;
            case ScaleMode.MatchWidth:
                finalScale = scaleX;
                break;
            case ScaleMode.MatchHeight:
                finalScale = scaleY;
                break;
        }

        // Ограничение масштаба по максимальному проценту от ширины экрана (сохраняя пропорции)
        if (this.maxWidthPercent > 0 && this.maxWidthPercent < 100) {
            const maxAllowedWidth = screenW * (this.maxWidthPercent / 100);
            const maxScaleX = maxAllowedWidth / targetBaseW;
            finalScale = Math.min(finalScale, maxScaleX);
        }

        // Ограничение масштаба по максимальному проценту от высоты экрана (сохраняя пропорции)
        if (this.maxHeightPercent > 0 && this.maxHeightPercent < 100) {
            const maxAllowedHeight = screenH * (this.maxHeightPercent / 100);
            const maxScaleY = maxAllowedHeight / targetBaseH;
            finalScale = Math.min(finalScale, maxScaleY);
        }

        // Применяем границы min/max scale
        finalScale = Math.max(this.minScale, Math.min(this.maxScale, finalScale));

        // Модифицируем scratch-вектор масштаба без new Vec3() (RULES §2.1)
        this._scratchScale.set(finalScale, finalScale, 1);
        this.node.setScale(this._scratchScale);

        // Интеграция с cc.Widget: если на узле висит Widget, он полностью управляет позицией!
        const widget = this.node.getComponent(Widget);
        if (widget) {
            // Заставляем Widget принудительно пересчитать выравнивание с учётом нового scale
            widget.updateAlignment();
        } else if (this.applyPaddingToPosition) {
            // Если Widget НЕТ, применяем относительный сдвиг позиции от исходной _initialPos
            const offsetY = (bottomPaddingPx - topPaddingPx) / 2;
            this._scratchPos.set(this._initialPos.x, this._initialPos.y + offsetY, this._initialPos.z);
            this.node.setPosition(this._scratchPos);
        }
    }

    /** Слушатель событий Cocos view/screen */
    private _onScreenResize = (): void => {
        this.updateLayout();
    };

    /** Слушатель системного события окна браузера */
    private _onWindowResize = (): void => {
        this.updateLayout();
    };
}
