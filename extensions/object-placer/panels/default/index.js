'use strict';

const PALETTE_KEY = 'object-placer-palette';
const SETTINGS_KEY = 'object-placer-settings';

// === QUATERNION MATH ===
function quatIdentity() { return { x: 0, y: 0, z: 0, w: 1 }; }

function quatFromAxisAngle(ax, ay, az, angleDeg) {
    const halfRad = (angleDeg * Math.PI / 180) * 0.5;
    const s = Math.sin(halfRad);
    const c = Math.cos(halfRad);
    const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    return { x: (ax / len) * s, y: (ay / len) * s, z: (az / len) * s, w: c };
}

function quatMultiply(a, b) {
    return {
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
}

function quatFromEulerDeg(xDeg, yDeg, zDeg) {
    const hx = xDeg * Math.PI / 360, hy = yDeg * Math.PI / 360, hz = zDeg * Math.PI / 360;
    const cx = Math.cos(hx), sx = Math.sin(hx);
    const cy = Math.cos(hy), sy = Math.sin(hy);
    const cz = Math.cos(hz), sz = Math.sin(hz);
    return {
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
        w: cx * cy * cz + sx * sy * sz
    };
}

function quatFromToRotation(fromX, fromY, fromZ, toX, toY, toZ) {
    let fLen = Math.sqrt(fromX * fromX + fromY * fromY + fromZ * fromZ) || 1;
    let tLen = Math.sqrt(toX * toX + toY * toY + toZ * toZ) || 1;
    fromX /= fLen; fromY /= fLen; fromZ /= fLen;
    toX /= tLen; toY /= tLen; toZ /= tLen;
    
    const dot = fromX * toX + fromY * toY + fromZ * toZ;
    if (dot > 0.999999) return quatIdentity();
    if (dot < -0.999999) {
        let ax = 0, ay = 1, az = 0;
        if (Math.abs(fromX) < 0.9) { ax = 1; ay = 0; az = 0; }
        let cx = fromY * az - fromZ * ay;
        let cy = fromZ * ax - fromX * az;
        let cz = fromX * ay - fromY * ax;
        let cLen = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
        return { x: cx / cLen, y: cy / cLen, z: cz / cLen, w: 0 };
    }
    const crossX = fromY * toZ - fromZ * toY;
    const crossY = fromZ * toX - fromX * toZ;
    const crossZ = fromX * toY - fromY * toX;
    const w = 1 + dot;
    const len = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ + w * w) || 1;
    return { x: crossX / len, y: crossY / len, z: crossZ / len, w: w / len };
}

exports.template = `
<div id="app">
    <div class="header">
        <div class="title">Object Placer</div>
    </div>

    <div class="section mode-section">
        <ui-button id="btn-mode" class="mode-btn off">Placement Mode: OFF</ui-button>
        <div class="hint">Toggle mode to click in Scene. Press Esc to exit.</div>
    </div>

    <div class="section quick-actions">
        <ui-button id="btn-place-cam">Place at Camera Center</ui-button>
        <div class="coord-inputs">
            <ui-num-input id="inp-place-x" value="0" step="1"></ui-num-input>
            <ui-num-input id="inp-place-y" value="0" step="1"></ui-num-input>
            <ui-num-input id="inp-place-z" value="0" step="1"></ui-num-input>
            <ui-button id="btn-place-coord">Place</ui-button>
        </div>
    </div>

    <div class="section palette-section">
        <div class="section-header">
            <span>Palette</span>
            <div class="slider-row">
                <span style="font-size: 12px; margin-right: 5px">Icon Size</span>
                <ui-slider id="slider-icon-size" min="40" max="96" value="56"></ui-slider>
            </div>
        </div>
        <ui-drag-area droppable="asset" id="palette-drop-area">
            <div id="palette-grid"></div>
        </ui-drag-area>
    </div>

    <div id="slot-settings" class="section settings-section" style="display: none;">
        <div class="section-header">Slot Settings</div>
        
        <div class="prop-row">
            <ui-label value="Prefab"></ui-label>
            <ui-drag-area droppable="asset" id="slot-prefab-drop" class="prefab-drop">
                <span id="slot-prefab-name">None</span>
            </ui-drag-area>
        </div>

        <div class="prop-row">
            <ui-label value="Align to Normal"></ui-label>
            <ui-checkbox id="chk-align-normal"></ui-checkbox>
        </div>

        <div class="prop-row">
            <ui-label value="Rotation Offset"></ui-label>
            <div class="vector-input">
                <ui-num-input id="inp-rot-off-x" step="5"></ui-num-input>
                <ui-num-input id="inp-rot-off-y" step="5"></ui-num-input>
                <ui-num-input id="inp-rot-off-z" step="5"></ui-num-input>
            </div>
        </div>

        <div class="prop-row">
            <ui-label value="Random Y ±°"></ui-label>
            <ui-slider id="slider-rand-y" min="0" max="180" step="1"></ui-slider>
        </div>

        <div class="prop-row">
            <ui-label value="Scale Multiplier"></ui-label>
            <div class="vector-input">
                <ui-num-input id="inp-scale-x" step="0.1"></ui-num-input>
                <ui-num-input id="inp-scale-y" step="0.1"></ui-num-input>
                <ui-num-input id="inp-scale-z" step="0.1"></ui-num-input>
            </div>
        </div>

        <div style="margin-top: 10px;">
            <ui-button id="btn-delete-slot" class="red-btn">Delete Slot</ui-button>
        </div>
    </div>

    <div class="section placement-settings">
        <div class="section-header">Placement Options</div>
        
        <div class="prop-row">
            <ui-label value="Parent Node (UUID)"></ui-label>
            <ui-input id="inp-parent-uuid" placeholder="Optional"></ui-input>
        </div>

        <div class="prop-row">
            <ui-label value="Y Offset"></ui-label>
            <ui-num-input id="inp-y-offset" step="0.1" value="0"></ui-num-input>
        </div>

        <div class="prop-row">
            <ui-label value="Preview Color"></ui-label>
            <ui-color id="color-preview"></ui-color>
        </div>

        <div class="prop-row">
            <ui-label value="Preview Opacity"></ui-label>
            <ui-slider id="slider-preview-op" min="0" max="1" step="0.05" value="0.45"></ui-slider>
        </div>

        <hr>

        <div class="prop-row">
            <ui-label value="Snap to Grid"></ui-label>
            <ui-checkbox id="chk-snap-enable"></ui-checkbox>
        </div>
        <div id="grid-settings" style="display:none;">
            <div class="prop-row">
                <ui-label value="Cell Size"></ui-label>
                <div class="vector-input">
                    <ui-num-input id="inp-grid-size-x" step="0.5"></ui-num-input>
                    <ui-num-input id="inp-grid-size-y" step="0.5"></ui-num-input>
                    <ui-num-input id="inp-grid-size-z" step="0.5"></ui-num-input>
                </div>
            </div>
            <div class="prop-row">
                <ui-label value="Origin"></ui-label>
                <div class="vector-input">
                    <ui-num-input id="inp-grid-origin-x" step="0.5"></ui-num-input>
                    <ui-num-input id="inp-grid-origin-y" step="0.5"></ui-num-input>
                    <ui-num-input id="inp-grid-origin-z" step="0.5"></ui-num-input>
                </div>
            </div>
            <div class="prop-row">
                <ui-label value="Y from surface"></ui-label>
                <ui-checkbox id="chk-snap-y-hit"></ui-checkbox>
            </div>
        </div>

        <hr>

        <div class="prop-row">
            <ui-label value="Manual Y Rotation"></ui-label>
            <div style="display: flex; gap: 5px; align-items: center;">
                <ui-button id="btn-rot-ccw" title="Counter-Clockwise">↺</ui-button>
                <span id="lbl-manual-rot" style="width: 40px; text-align: center;">0°</span>
                <ui-button id="btn-rot-cw" title="Clockwise">↻</ui-button>
                <ui-num-input id="inp-rot-step" value="15" step="5" style="width: 50px;" title="Step"></ui-num-input>
                <ui-button id="btn-rot-reset" title="Reset">R</ui-button>
            </div>
        </div>
    </div>

    <div id="status-bar" class="status-bar">Ready</div>
    <div id="context-menu" class="context-menu" style="display:none;">
        <div class="menu-item" id="menu-delete-slot">Delete Slot</div>
    </div>
</div>
`;

exports.style = `
:host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #ccc;
    background-color: transparent;
    --tile-size: 56px;
}

#app {
    padding: 10px;
    box-sizing: border-box;
    padding-bottom: 30px;
}

.header {
    margin-bottom: 10px;
}
.title {
    font-weight: bold;
    font-size: 16px;
    color: #fff;
}

.section {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 6px;
}

.section-header {
    font-weight: bold;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mode-btn {
    width: 100%;
    height: 36px;
    font-weight: bold;
    font-size: 13px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}
.mode-btn.off {
    background-color: #3a3a3a;
    color: #999;
}
.mode-btn.on {
    background-color: #2d8a4e !important;
    color: #fff !important;
}
.hint {
    font-size: 11px;
    color: #888;
    text-align: center;
    margin-top: 4px;
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.coord-inputs {
    display: flex;
    gap: 4px;
    align-items: center;
}
.coord-inputs ui-num-input {
    flex: 1;
    width: 0;
}

#palette-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--tile-size), 1fr));
    gap: 6px;
    min-height: calc(var(--tile-size) + 4px);
}

.palette-tile {
    background: #2a2a2a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    height: var(--tile-size);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    user-select: none;
    overflow: hidden;
}
.palette-tile:hover {
    background: #333;
}
.palette-tile.selected {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.15);
}
.palette-tile .name {
    font-size: 11px;
    text-align: center;
    word-break: break-all;
    padding: 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
.palette-tile .badge {
    position: absolute;
    top: 2px;
    left: 2px;
    background: rgba(0,0,0,0.6);
    color: #aaa;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 4px;
}
.palette-tile.add-btn {
    background: rgba(255,255,255,0.05);
    font-size: 24px;
    color: #888;
}

.prop-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}
.prop-row ui-label {
    flex-shrink: 0;
    width: 120px;
}

.vector-input {
    display: flex;
    gap: 4px;
    flex: 1;
}
.vector-input ui-num-input {
    flex: 1;
    width: 0; /* allows flex to shrink it */
}

.prefab-drop {
    flex: 1;
    height: 24px;
    background: rgba(0,0,0,0.3);
    border: 1px dashed rgba(255,255,255,0.2);
    border-radius: 3px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 12px;
}

.red-btn {
    background-color: rgba(200, 50, 50, 0.4);
    border: 1px solid rgba(200, 50, 50, 0.8);
    width: 100%;
}
.red-btn:hover {
    background-color: rgba(200, 50, 50, 0.6);
}

hr {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin: 10px 0;
}

.status-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1e1e1e;
    border-top: 1px solid #333;
    padding: 4px 10px;
    font-size: 11px;
    color: #aaa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.context-menu {
    position: fixed;
    background: #2b2b2b;
    border: 1px solid #444;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.5);
    padding: 4px 0;
    z-index: 9999;
    min-width: 120px;
}
.menu-item {
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
}
.menu-item:hover {
    background: #4a9eff;
    color: white;
}
`;

exports.$ = {
    app: '#app',
    btnMode: '#btn-mode',
    btnPlaceCam: '#btn-place-cam',
    btnPlaceCoord: '#btn-place-coord',
    inpPlaceX: '#inp-place-x',
    inpPlaceY: '#inp-place-y',
    inpPlaceZ: '#inp-place-z',
    
    sliderIconSize: '#slider-icon-size',
    paletteDropArea: '#palette-drop-area',
    paletteGrid: '#palette-grid',
    
    slotSettings: '#slot-settings',
    slotPrefabDrop: '#slot-prefab-drop',
    slotPrefabName: '#slot-prefab-name',
    chkAlignNormal: '#chk-align-normal',
    inpRotOffX: '#inp-rot-off-x',
    inpRotOffY: '#inp-rot-off-y',
    inpRotOffZ: '#inp-rot-off-z',
    sliderRandY: '#slider-rand-y',
    inpScaleX: '#inp-scale-x',
    inpScaleY: '#inp-scale-y',
    inpScaleZ: '#inp-scale-z',
    btnDeleteSlot: '#btn-delete-slot',

    inpParentUuid: '#inp-parent-uuid',
    inpYOffset: '#inp-y-offset',
    colorPreview: '#color-preview',
    sliderPreviewOp: '#slider-preview-op',

    chkSnapEnable: '#chk-snap-enable',
    gridSettings: '#grid-settings',
    inpGridSizeX: '#inp-grid-size-x',
    inpGridSizeY: '#inp-grid-size-y',
    inpGridSizeZ: '#inp-grid-size-z',
    inpGridOriginX: '#inp-grid-origin-x',
    inpGridOriginY: '#inp-grid-origin-y',
    inpGridOriginZ: '#inp-grid-origin-z',
    chkSnapYHit: '#chk-snap-y-hit',

    btnRotCcw: '#btn-rot-ccw',
    btnRotCw: '#btn-rot-cw',
    btnRotReset: '#btn-rot-reset',
    lblManualRot: '#lbl-manual-rot',
    inpRotStep: '#inp-rot-step',

    statusBar: '#status-bar',
    contextMenu: '#context-menu',
    menuDeleteSlot: '#menu-delete-slot'
};

exports.methods = {
    _log(msg) {
        console.log(\`[ObjectPlacer] \${msg}\`);
        this.$.statusBar.innerText = msg;
    },

    _loadData() {
        try {
            const p = localStorage.getItem(PALETTE_KEY);
            if (p) this.palette = JSON.parse(p);
        } catch (e) { }
        
        try {
            const s = localStorage.getItem(SETTINGS_KEY);
            if (s) this.settings = Object.assign(this.settings, JSON.parse(s));
        } catch (e) { }
    },

    _saveData() {
        localStorage.setItem(PALETTE_KEY, JSON.stringify(this.palette));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    },

    _renderPalette() {
        this.$.paletteGrid.innerHTML = '';
        
        this.palette.items.forEach((item, index) => {
            const tile = document.createElement('div');
            tile.className = 'palette-tile';
            if (index === this._selectedIndex) tile.classList.add('selected');
            
            const badge = document.createElement('div');
            badge.className = 'badge';
            badge.innerText = String(index + 1);
            
            const name = document.createElement('div');
            name.className = 'name';
            name.innerText = item.prefabName || 'Unknown';
            
            tile.appendChild(badge);
            tile.appendChild(name);
            
            tile.addEventListener('click', () => this._selectSlot(index));
            tile.addEventListener('contextmenu', (e) => this._showContextMenu(e, index));
            
            this.$.paletteGrid.appendChild(tile);
        });
        
        const addBtn = document.createElement('div');
        addBtn.className = 'palette-tile add-btn';
        addBtn.innerText = '+';
        addBtn.addEventListener('click', () => this._addSlot());
        this.$.paletteGrid.appendChild(addBtn);
    },

    _showContextMenu(e, index) {
        e.preventDefault();
        this._contextMenuIndex = index;
        const menu = this.$.contextMenu;
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        
        const closeMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    },

    _addSlot(uuid = '', name = '') {
        this.palette.items.push({
            prefabUuid: uuid,
            prefabName: name,
            alignToNormal: true,
            rotationOffset: { x: 0, y: 0, z: 0 },
            randomYRotation: 0,
            scaleMultiplier: { x: 1, y: 1, z: 1 }
        });
        this._saveData();
        this._renderPalette();
        this._selectSlot(this.palette.items.length - 1);
    },

    _deleteSlot(index) {
        if (index >= 0 && index < this.palette.items.length) {
            this.palette.items.splice(index, 1);
            if (this._selectedIndex === index) {
                this._selectedIndex = -1;
                this.$.slotSettings.style.display = 'none';
            } else if (this._selectedIndex > index) {
                this._selectedIndex--;
            }
            this._saveData();
            this._renderPalette();
            this._updatePreview();
        }
    },

    _selectSlot(index) {
        this._selectedIndex = index;
        this._renderPalette();
        
        if (index >= 0 && index < this.palette.items.length) {
            const item = this.palette.items[index];
            this.$.slotSettings.style.display = 'block';
            this.$.slotPrefabName.innerText = item.prefabName || 'Drop Prefab Here';
            this.$.chkAlignNormal.value = item.alignToNormal;
            this.$.inpRotOffX.value = item.rotationOffset.x;
            this.$.inpRotOffY.value = item.rotationOffset.y;
            this.$.inpRotOffZ.value = item.rotationOffset.z;
            this.$.sliderRandY.value = item.randomYRotation;
            this.$.inpScaleX.value = item.scaleMultiplier.x;
            this.$.inpScaleY.value = item.scaleMultiplier.y;
            this.$.inpScaleZ.value = item.scaleMultiplier.z;
        } else {
            this.$.slotSettings.style.display = 'none';
        }
        this._updatePreview();
    },

    _updateSlotSetting(key, val, subkey = null) {
        if (this._selectedIndex >= 0) {
            const item = this.palette.items[this._selectedIndex];
            if (subkey) {
                item[key][subkey] = val;
            } else {
                item[key] = val;
            }
            this._saveData();
            this._updatePreview();
        }
    },

    _updateGlobalSetting(key, val, subkey = null) {
        if (subkey) {
            this.settings[key][subkey] = val;
        } else {
            this.settings[key] = val;
        }
        this._saveData();
        this._updatePreview();
    },

    _syncUIWithSettings() {
        this.$.sliderIconSize.value = this.settings.iconSize || 56;
        this.$.app.style.setProperty('--tile-size', this.$.sliderIconSize.value + 'px');
        
        this.$.chkSnapEnable.value = this.settings.snapEnabled;
        this.$.gridSettings.style.display = this.settings.snapEnabled ? 'block' : 'none';
        
        this.$.inpGridSizeX.value = this.settings.gridSize.x;
        this.$.inpGridSizeY.value = this.settings.gridSize.y;
        this.$.inpGridSizeZ.value = this.settings.gridSize.z;
        
        this.$.inpGridOriginX.value = this.settings.gridOrigin.x;
        this.$.inpGridOriginY.value = this.settings.gridOrigin.y;
        this.$.inpGridOriginZ.value = this.settings.gridOrigin.z;
        
        this.$.chkSnapYHit.value = this.settings.snapYToHit;
        
        this.$.inpYOffset.value = this.settings.placementYOffset;
        this.$.inpParentUuid.value = this.settings.parentNodeUuid;
        
        this.$.lblManualRot.innerText = this.settings.manualRotation + '°';
        this.$.inpRotStep.value = this.settings.rotateStep;

        const c = this.settings.previewColor;
        this.$.colorPreview.value = [Math.round(c.r*255), Math.round(c.g*255), Math.round(c.b*255), 255];
        this.$.sliderPreviewOp.value = this.settings.previewOpacity;
    },

    _togglePlacementMode() {
        this._placementMode = !this._placementMode;
        
        if (this._placementMode) {
            this.$.btnMode.classList.remove('off');
            this.$.btnMode.classList.add('on');
            this.$.btnMode.innerText = 'Placement Mode: ON — click in Scene / Esc to exit';
            
            this._attachSceneListeners();
            this._log('Placement mode started');
            this._createPreview();
        } else {
            this.$.btnMode.classList.remove('on');
            this.$.btnMode.classList.add('off');
            this.$.btnMode.innerText = 'Placement Mode: OFF';
            
            this._detachSceneListeners();
            this._log('Placement mode ended');
            this._removePreview();
        }
    },

    async _createPreview() {
        if (!this._placementMode) return;
        if (this._selectedIndex < 0 || this._selectedIndex >= this.palette.items.length) return;
        const item = this.palette.items[this._selectedIndex];
        if (!item.prefabUuid) return;
        
        const c = this.settings.previewColor;
        const op = this.settings.previewOpacity;
        
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'object-placer',
            method: 'createPreview',
            args: [item.prefabUuid, c.r, c.g, c.b, op]
        });
    },

    async _removePreview() {
        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'object-placer',
            method: 'removePreview',
            args: []
        });
    },

    async _updatePreview(pos = null, rot = null, scale = null) {
        if (!this._placementMode) return;
        if (this._selectedIndex < 0) return;
        
        if (!pos) pos = { x: 0, y: 0, z: 0 };
        if (!rot) rot = quatIdentity();
        if (!scale) {
            const item = this.palette.items[this._selectedIndex];
            scale = item.scaleMultiplier;
        }

        await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'object-placer',
            method: 'updatePreview',
            args: [pos.x, pos.y, pos.z, rot.x, rot.y, rot.z, rot.w, scale.x, scale.y, scale.z]
        });
    },

    _sceneCanvasHook() {
        if (this._sceneCanvas) return true;
        
        // Strategy 1: Look for the editor's game/scene canvas directly
        let canvas = document.getElementById('GameCanvas');
        
        // Strategy 2: Traverse shadow DOMs of dock panels to find the scene canvas
        if (!canvas) {
            const allEls = document.querySelectorAll('*');
            for (const el of allEls) {
                if (el.shadowRoot) {
                    const c = el.shadowRoot.querySelector('canvas');
                    if (c && c.clientWidth > 100 && c.clientHeight > 100) {
                        canvas = c;
                        break;
                    }
                }
            }
        }

        // Strategy 3: Check iframes (some CC versions use them)
        if (!canvas) {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const c = iframe.contentDocument?.querySelector('canvas');
                    if (c) { canvas = c; break; }
                } catch(e){}
            }
        }

        // Strategy 4: Largest canvas in the document
        if (!canvas) {
            let largest = null, maxArea = 0;
            document.querySelectorAll('canvas').forEach(c => {
                const area = c.clientWidth * c.clientHeight;
                if (area > maxArea) { maxArea = area; largest = c; }
            });
            if (largest && maxArea > 10000) canvas = largest;
        }
        
        if (canvas) {
            this._sceneCanvas = canvas;
            console.log('[ObjectPlacer] Scene canvas found:', canvas.id || canvas.className || '(anonymous)');
            return true;
        }
        console.warn('[ObjectPlacer] Scene canvas NOT found. Use "Place at Camera Center" button instead.');
        return false;
    },

    _attachSceneListeners() {
        if (this._sceneCanvasHook()) {
            this._onSceneMouseMoveBound = this._onSceneMouseMove.bind(this);
            this._onSceneMouseDownBound = this._onSceneMouseDown.bind(this);
            
            this._sceneCanvas.addEventListener('mousemove', this._onSceneMouseMoveBound);
            this._sceneCanvas.addEventListener('mousedown', this._onSceneMouseDownBound, true);
        } else {
            this._log('Warning: Scene canvas not found for click placement.');
        }
    },

    _detachSceneListeners() {
        if (this._sceneCanvas && this._onSceneMouseMoveBound) {
            this._sceneCanvas.removeEventListener('mousemove', this._onSceneMouseMoveBound);
            this._sceneCanvas.removeEventListener('mousedown', this._onSceneMouseDownBound, true);
        }
    },

    async _onSceneMouseMove(e) {
        if (!this._placementMode) return;
        
        const rect = this._sceneCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ndcX = (x / rect.width) * 2 - 1;
        const ndcY = -((y / rect.height) * 2 - 1);
        
        try {
            const res = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'object-placer',
                method: 'raycastFromNDC',
                args: [ndcX, ndcY]
            });
            
            if (res && res.hit) {
                this._lastHitPoint = res.point;
                this._lastHitNormal = res.normal;
                
                let p = this._applySnap(res.point);
                p.y += this.settings.placementYOffset;
                
                const item = this.palette.items[this._selectedIndex];
                if (item) {
                    const rot = this._computeRotation(res.normal, item);
                    this._updatePreview(p, rot, item.scaleMultiplier);
                }
            } else {
                this._lastHitPoint = null;
            }
        } catch (err) {}
    },

    async _onSceneMouseDown(e) {
        if (!this._placementMode) return;
        
        if (e.button === 0 && !e.altKey) {
            if (this._lastHitPoint) {
                e.preventDefault();
                e.stopPropagation();
                
                let p = this._applySnap(this._lastHitPoint);
                p.y += this.settings.placementYOffset;
                
                await this._placeObject(p, this._lastHitNormal);
            }
        }
    },

    _applySnap(point) {
        if (!this.settings.snapEnabled) return { x: point.x, y: point.y, z: point.z };
        
        const p = { x: point.x, y: point.y, z: point.z };
        const g = this.settings.gridSize;
        const o = this.settings.gridOrigin;
        
        p.x = Math.round((p.x - o.x) / (g.x || 1)) * (g.x || 1) + o.x;
        p.z = Math.round((p.z - o.z) / (g.z || 1)) * (g.z || 1) + o.z;
        
        if (!this.settings.snapYToHit) {
            p.y = Math.round((p.y - o.y) / (g.y || 1)) * (g.y || 1) + o.y;
        }
        
        return p;
    },

    _computeRotation(normal, item) {
        let rot = quatIdentity();
        
        if (item.alignToNormal && normal) {
            rot = quatFromToRotation(0, 1, 0, normal.x, normal.y, normal.z);
        }
        
        const off = item.rotationOffset;
        if (off.x !== 0 || off.y !== 0 || off.z !== 0) {
            const qOff = quatFromEulerDeg(off.x, off.y, off.z);
            rot = quatMultiply(rot, qOff);
        }
        
        let yRot = this.settings.manualRotation;
        if (item.randomYRotation > 0) {
            const range = item.randomYRotation;
            yRot += (Math.random() * range * 2) - range;
        }
        
        if (yRot !== 0) {
            const qY = quatFromAxisAngle(0, 1, 0, yRot);
            rot = quatMultiply(rot, qY);
        }
        
        return rot;
    },

    async _placeObject(point, normal = {x:0, y:1, z:0}) {
        if (this._selectedIndex < 0) return;
        const item = this.palette.items[this._selectedIndex];
        if (!item || !item.prefabUuid) return;
        
        const rot = this._computeRotation(normal, item);
        const scale = item.scaleMultiplier;
        
        try {
            const nodeUuid = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'object-placer',
                method: 'placePrefab',
                args: [
                    item.prefabUuid,
                    point.x, point.y, point.z,
                    rot.x, rot.y, rot.z, rot.w,
                    scale.x, scale.y, scale.z,
                    this.settings.parentNodeUuid
                ]
            });
            
            if (nodeUuid) {
                this._log(\`Placed \${item.prefabName} at (\${point.x.toFixed(2)}, \${point.y.toFixed(2)}, \${point.z.toFixed(2)})\`);
            } else {
                this._log('Failed to place object.');
            }
        } catch (e) {
            this._log('Error placing object: ' + e);
        }
    },

    async _placeAtCameraCenter() {
        if (this._selectedIndex < 0) {
            this._log('Select a prefab from the palette first.');
            return;
        }
        
        try {
            const camInfo = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'object-placer',
                method: 'getEditorCameraInfo',
                args: []
            });
            
            if (camInfo && camInfo.found) {
                const pos = camInfo.position;
                const fwd = camInfo.forward;
                
                const res = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: 'object-placer',
                    method: 'raycast',
                    args: [pos.x, pos.y, pos.z, fwd.x, fwd.y, fwd.z]
                });
                
                let hitPt, hitNorm;
                if (res && res.hit) {
                    hitPt = res.point;
                    hitNorm = res.normal;
                } else {
                    // Place 10 units in front of camera if no hit
                    hitPt = {
                        x: pos.x + fwd.x * 10,
                        y: pos.y + fwd.y * 10,
                        z: pos.z + fwd.z * 10
                    };
                    hitNorm = { x: 0, y: 1, z: 0 };
                }
                
                let p = this._applySnap(hitPt);
                p.y += this.settings.placementYOffset;
                
                await this._placeObject(p, hitNorm);
            }
        } catch(e) {
            this._log('Camera info error: ' + e);
        }
    },

    async _placeAtCoordinates() {
        if (this._selectedIndex < 0) return;
        const x = parseFloat(this.$.inpPlaceX.value) || 0;
        const y = parseFloat(this.$.inpPlaceY.value) || 0;
        const z = parseFloat(this.$.inpPlaceZ.value) || 0;
        
        let p = { x, y, z };
        p = this._applySnap(p);
        p.y += this.settings.placementYOffset;
        
        await this._placeObject(p, {x:0, y:1, z:0});
    },

    _parseDragData(e) {
        try {
            const data = e.dataTransfer.getData('value');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed[0];
                }
                return parsed;
            }
        } catch (err) {
            console.warn('[ObjectPlacer] Failed to parse drag data:', err);
        }
        return null;
    },

    async _handleAssetDrop(uuid, type, isSlotDrop) {
        if (type !== 'cc.Prefab' && type !== 'prefab') {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            if (!info || info.type !== 'cc.Prefab') {
                this._log('Dropped asset is not a Prefab');
                return;
            }
            type = info.type;
        }

        const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
        const name = info ? info.name : 'Prefab';

        if (isSlotDrop && this._selectedIndex >= 0) {
            const item = this.palette.items[this._selectedIndex];
            item.prefabUuid = uuid;
            item.prefabName = name;
            this._saveData();
            this._renderPalette();
            this._selectSlot(this._selectedIndex);
        } else {
            this._addSlot(uuid, name);
        }
    },
    
    _rotateManual(dir) {
        this.settings.manualRotation = (this.settings.manualRotation + dir * this.settings.rotateStep) % 360;
        this.$.lblManualRot.innerText = this.settings.manualRotation + '°';
        this._saveData();
        this._updatePreview();
    },

    _setupBindings() {
        this.$.btnMode.addEventListener('confirm', () => this._togglePlacementMode());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._placementMode) {
                this._togglePlacementMode();
            }
        });

        this.$.sliderIconSize.addEventListener('change', (e) => {
            this.settings.iconSize = parseFloat(e.target.value);
            this.$.app.style.setProperty('--tile-size', this.settings.iconSize + 'px');
            this._saveData();
        });

        this.$.paletteDropArea.addEventListener('drop', async (e) => {
            const info = this._parseDragData(e);
            if (info) await this._handleAssetDrop(info.uuid, info.type, false);
        });

        this.$.slotPrefabDrop.addEventListener('drop', async (e) => {
            const info = this._parseDragData(e);
            if (info) await this._handleAssetDrop(info.uuid, info.type, true);
        });

        this.$.btnDeleteSlot.addEventListener('confirm', () => this._deleteSlot(this._selectedIndex));
        this.$.menuDeleteSlot.addEventListener('click', () => {
            this._deleteSlot(this._contextMenuIndex);
        });

        // Properties bindings
        const bindSlot = (el, type, key, subkey = null) => {
            el.addEventListener('change', (e) => {
                let v = type === 'bool' ? e.target.value : parseFloat(e.target.value);
                this._updateSlotSetting(key, v, subkey);
            });
        };
        bindSlot(this.$.chkAlignNormal, 'bool', 'alignToNormal');
        bindSlot(this.$.inpRotOffX, 'num', 'rotationOffset', 'x');
        bindSlot(this.$.inpRotOffY, 'num', 'rotationOffset', 'y');
        bindSlot(this.$.inpRotOffZ, 'num', 'rotationOffset', 'z');
        bindSlot(this.$.sliderRandY, 'num', 'randomYRotation');
        bindSlot(this.$.inpScaleX, 'num', 'scaleMultiplier', 'x');
        bindSlot(this.$.inpScaleY, 'num', 'scaleMultiplier', 'y');
        bindSlot(this.$.inpScaleZ, 'num', 'scaleMultiplier', 'z');

        // Global bindings
        const bindGlobal = (el, type, key, subkey = null, cb = null) => {
            el.addEventListener('change', (e) => {
                let v = type === 'bool' ? e.target.value : (type === 'string' ? e.target.value : parseFloat(e.target.value));
                this._updateGlobalSetting(key, v, subkey);
                if (cb) cb();
            });
        };
        bindGlobal(this.$.chkSnapEnable, 'bool', 'snapEnabled', null, () => {
            this.$.gridSettings.style.display = this.settings.snapEnabled ? 'block' : 'none';
        });
        bindGlobal(this.$.inpGridSizeX, 'num', 'gridSize', 'x');
        bindGlobal(this.$.inpGridSizeY, 'num', 'gridSize', 'y');
        bindGlobal(this.$.inpGridSizeZ, 'num', 'gridSize', 'z');
        bindGlobal(this.$.inpGridOriginX, 'num', 'gridOrigin', 'x');
        bindGlobal(this.$.inpGridOriginY, 'num', 'gridOrigin', 'y');
        bindGlobal(this.$.inpGridOriginZ, 'num', 'gridOrigin', 'z');
        bindGlobal(this.$.chkSnapYHit, 'bool', 'snapYToHit');
        bindGlobal(this.$.inpYOffset, 'num', 'placementYOffset');
        bindGlobal(this.$.inpParentUuid, 'string', 'parentNodeUuid');
        
        this.$.colorPreview.addEventListener('change', (e) => {
            const vals = e.target.value;
            this.settings.previewColor = { r: vals[0]/255, g: vals[1]/255, b: vals[2]/255 };
            this._saveData();
            if(this._placementMode) this._createPreview();
        });
        this.$.sliderPreviewOp.addEventListener('change', (e) => {
            this.settings.previewOpacity = parseFloat(e.target.value);
            this._saveData();
            if(this._placementMode) this._createPreview();
        });

        // Rotation bindings
        this.$.btnRotCcw.addEventListener('confirm', () => this._rotateManual(-1));
        this.$.btnRotCw.addEventListener('confirm', () => this._rotateManual(1));
        this.$.btnRotReset.addEventListener('confirm', () => {
            this.settings.manualRotation = 0;
            this.$.lblManualRot.innerText = '0°';
            this._saveData();
            this._updatePreview();
        });
        bindGlobal(this.$.inpRotStep, 'num', 'rotateStep');

        // Buttons
        this.$.btnPlaceCam.addEventListener('confirm', () => this._placeAtCameraCenter());
        this.$.btnPlaceCoord.addEventListener('confirm', () => this._placeAtCoordinates());
    }
};

exports.listeners = {
    'place-hotkey-triggered'() {
        this._placeAtCameraCenter();
    }
};

exports.ready = function() {
    this.palette = { items: [] };
    this.settings = {
        snapEnabled: false,
        gridSize: { x: 1, y: 1, z: 1 },
        gridOrigin: { x: 0, y: 0, z: 0 },
        snapYToHit: true,
        showGrid: true,
        rotateStep: 15,
        manualRotation: 0,
        placementYOffset: 0,
        previewColor: { r: 0.3, g: 1.0, b: 0.4 },
        previewOpacity: 0.45,
        parentNodeUuid: "",
        iconSize: 56
    };
    
    this._selectedIndex = -1;
    this._placementMode = false;
    this._contextMenuIndex = -1;

    this._loadData();
    this._syncUIWithSettings();
    this._setupBindings();
    this._renderPalette();
    
    if (this.palette.items.length > 0) {
        this._selectSlot(0);
    }
};

exports.close = function() {
    this._saveData();
    this._detachSceneListeners();
    this._removePreview();
};
