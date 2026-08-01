/**
 * Cocos UI Auto-Layout Builder — Panel Runtime JavaScript
 * Runs inside the panel's web context (Electron Renderer)
 *
 * Responsibilities:
 *  - Tab switching
 *  - JSON editor with live validation and line numbers
 *  - Preset loading
 *  - Sending build request to extension main via Editor.Message
 *  - Displaying result status
 */

'use strict';

// ─────────────────────────────────────────────
// Preset data
// ─────────────────────────────────────────────

const PRESETS = {
  'main-menu': {
    name: 'MainMenu',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'Background',
        type: 'Sprite',
        x: 0, y: 0, width: 1080, height: 1920,
        color: '#1a0a2e',
        widget: { alignLeft: true, alignRight: true, alignTop: true, alignBottom: true,
                  left: 0, right: 0, top: 0, bottom: 0 }
      },
      {
        name: 'LogoLabel',
        type: 'Label',
        x: 0, y: 600, width: 800, height: 120,
        text: 'MY GAME',
        fontSize: 80, fontColor: '#ffffff', bold: true,
        horizontalAlign: 'center', verticalAlign: 'middle'
      },
      {
        name: 'SubtitleLabel',
        type: 'Label',
        x: 0, y: 480, width: 600, height: 50,
        text: 'An epic adventure awaits',
        fontSize: 28, fontColor: '#a78bfa',
        horizontalAlign: 'center'
      },
      {
        name: 'ButtonsContainer',
        type: 'Node',
        x: 0, y: 100, width: 500, height: 360,
        layout: { type: 'vertical', spacingY: 20, resizeMode: 'container',
                  paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
        children: [
          {
            name: 'PlayButton',
            type: 'Button',
            width: 500, height: 100,
            color: '#8b5cf6',
            text: 'PLAY', fontSize: 36, fontColor: '#ffffff', bold: true,
            interactable: true
          },
          {
            name: 'SettingsButton',
            type: 'Button',
            width: 500, height: 100,
            color: '#374151',
            text: 'SETTINGS', fontSize: 32, fontColor: '#e5e7eb',
            interactable: true
          },
          {
            name: 'ExitButton',
            type: 'Button',
            width: 500, height: 100,
            color: '#1f2937',
            text: 'EXIT', fontSize: 32, fontColor: '#9ca3af',
            interactable: true
          }
        ]
      },
      {
        name: 'VersionLabel',
        type: 'Label',
        x: 0, y: -870, width: 300, height: 40,
        text: 'v1.0.0',
        fontSize: 20, fontColor: '#6b7280',
        horizontalAlign: 'center'
      }
    ]
  },

  'dialog': {
    name: 'DialogPopup',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'Overlay',
        type: 'Sprite',
        x: 0, y: 0, width: 1080, height: 1920,
        color: '#000000', opacity: 160,
        widget: { alignLeft: true, alignRight: true, alignTop: true, alignBottom: true,
                  left: 0, right: 0, top: 0, bottom: 0 }
      },
      {
        name: 'DialogPanel',
        type: 'Sprite',
        x: 0, y: 0, width: 800, height: 600,
        color: '#1e1b4b',
        children: [
          {
            name: 'TitleLabel',
            type: 'Label',
            x: 0, y: 210, width: 700, height: 80,
            text: 'Are you sure?',
            fontSize: 48, fontColor: '#f1f5f9', bold: true,
            horizontalAlign: 'center', verticalAlign: 'middle'
          },
          {
            name: 'MessageLabel',
            type: 'Label',
            x: 0, y: 60, width: 680, height: 120,
            text: 'This action cannot be undone. Please confirm to proceed.',
            fontSize: 28, fontColor: '#94a3b8',
            horizontalAlign: 'center', overflow: 'shrink'
          },
          {
            name: 'ButtonsRow',
            type: 'Node',
            x: 0, y: -170, width: 680, height: 100,
            layout: { type: 'horizontal', spacingX: 24, resizeMode: 'container',
                      paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
            children: [
              {
                name: 'CancelButton',
                type: 'Button',
                width: 320, height: 100,
                color: '#374151',
                text: 'Cancel', fontSize: 30, fontColor: '#d1d5db',
                interactable: true
              },
              {
                name: 'ConfirmButton',
                type: 'Button',
                width: 320, height: 100,
                color: '#8b5cf6',
                text: 'Confirm', fontSize: 30, fontColor: '#ffffff', bold: true,
                interactable: true
              }
            ]
          },
          {
            name: 'CloseButton',
            type: 'Button',
            x: 340, y: 260, width: 64, height: 64,
            color: '#374151',
            text: '✕', fontSize: 28, fontColor: '#9ca3af',
            interactable: true
          }
        ]
      }
    ]
  },

  'hud': {
    name: 'HUD',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'TopBar',
        type: 'Node',
        x: 0, y: 870, width: 1080, height: 120,
        widget: { alignLeft: true, alignRight: true, alignTop: true, left: 0, right: 0, top: 0 },
        children: [
          {
            name: 'HpBarBg',
            type: 'Sprite',
            x: -280, y: 0, width: 460, height: 36,
            color: '#1f2937'
          },
          {
            name: 'HpBarFill',
            type: 'Sprite',
            x: -280, y: 0, width: 460, height: 36,
            color: '#10b981'
          },
          {
            name: 'HpLabel',
            type: 'Label',
            x: -280, y: 0, width: 460, height: 36,
            text: 'HP: 100 / 100',
            fontSize: 22, fontColor: '#ffffff', bold: true,
            horizontalAlign: 'center', verticalAlign: 'middle'
          },
          {
            name: 'ScoreLabel',
            type: 'Label',
            x: 200, y: 0, width: 300, height: 60,
            text: 'SCORE: 0',
            fontSize: 34, fontColor: '#f59e0b', bold: true,
            horizontalAlign: 'center'
          },
          {
            name: 'PauseButton',
            type: 'Button',
            x: 470, y: 0, width: 80, height: 80,
            color: '#1f2937',
            text: '⏸', fontSize: 32, fontColor: '#e5e7eb',
            interactable: true
          }
        ]
      },
      {
        name: 'TimerLabel',
        type: 'Label',
        x: 0, y: 820, width: 200, height: 60,
        text: '00:30',
        fontSize: 40, fontColor: '#ef4444', bold: true,
        horizontalAlign: 'center'
      }
    ]
  },

  'settings': {
    name: 'SettingsWindow',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'Background',
        type: 'Sprite',
        x: 0, y: 0, width: 1080, height: 1920, color: '#0f172a',
        widget: { alignLeft: true, alignRight: true, alignTop: true, alignBottom: true,
                  left: 0, right: 0, top: 0, bottom: 0 }
      },
      {
        name: 'TitleBar',
        type: 'Node',
        x: 0, y: 850, width: 1080, height: 100,
        children: [
          {
            name: 'TitleLabel',
            type: 'Label',
            x: 0, y: 0, width: 800, height: 100,
            text: 'SETTINGS',
            fontSize: 52, fontColor: '#f1f5f9', bold: true,
            horizontalAlign: 'center', verticalAlign: 'middle'
          },
          {
            name: 'BackButton',
            type: 'Button',
            x: -460, y: 0, width: 80, height: 80,
            color: '#1e293b', text: '←', fontSize: 36, fontColor: '#94a3b8',
            interactable: true
          }
        ]
      },
      {
        name: 'SettingsList',
        type: 'ScrollView',
        x: 0, y: -100, width: 1000, height: 1400,
        children: [
          {
            name: 'ContentNode',
            type: 'Node',
            x: 0, y: 0, width: 1000, height: 1200,
            layout: { type: 'vertical', spacingY: 2, resizeMode: 'container',
                      paddingTop: 20, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 },
            children: [
              { name: 'MusicRow',  type: 'Sprite', width: 1000, height: 110, color: '#1e293b',
                children: [{ name: 'MusicLabel', type: 'Label', x: -350, y: 0, width: 400, height: 110,
                  text: '🎵  Music', fontSize: 30, fontColor: '#f1f5f9', horizontalAlign: 'left', verticalAlign: 'middle' }] },
              { name: 'SfxRow',    type: 'Sprite', width: 1000, height: 110, color: '#1e293b',
                children: [{ name: 'SfxLabel', type: 'Label', x: -350, y: 0, width: 400, height: 110,
                  text: '🔊  Sound FX', fontSize: 30, fontColor: '#f1f5f9', horizontalAlign: 'left', verticalAlign: 'middle' }] },
              { name: 'VibRow',    type: 'Sprite', width: 1000, height: 110, color: '#1e293b',
                children: [{ name: 'VibLabel', type: 'Label', x: -350, y: 0, width: 400, height: 110,
                  text: '📳  Vibration', fontSize: 30, fontColor: '#f1f5f9', horizontalAlign: 'left', verticalAlign: 'middle' }] },
              { name: 'LangRow',   type: 'Sprite', width: 1000, height: 110, color: '#1e293b',
                children: [{ name: 'LangLabel', type: 'Label', x: -350, y: 0, width: 400, height: 110,
                  text: '🌐  Language', fontSize: 30, fontColor: '#f1f5f9', horizontalAlign: 'left', verticalAlign: 'middle' }] },
              { name: 'NotifRow',  type: 'Sprite', width: 1000, height: 110, color: '#1e293b',
                children: [{ name: 'NotifLabel', type: 'Label', x: -350, y: 0, width: 400, height: 110,
                  text: '🔔  Notifications', fontSize: 30, fontColor: '#f1f5f9', horizontalAlign: 'left', verticalAlign: 'middle' }] }
            ]
          }
        ]
      }
    ]
  },

  'inventory': {
    name: 'Inventory',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'Background',
        type: 'Sprite',
        x: 0, y: 0, width: 1080, height: 1920, color: '#0d0f16',
        widget: { alignLeft: true, alignRight: true, alignTop: true, alignBottom: true,
                  left: 0, right: 0, top: 0, bottom: 0 }
      },
      {
        name: 'TitleLabel',
        type: 'Label',
        x: 0, y: 850, width: 900, height: 90,
        text: 'INVENTORY',
        fontSize: 52, fontColor: '#f1f5f9', bold: true, horizontalAlign: 'center'
      },
      {
        name: 'GridContainer',
        type: 'Node',
        x: 0, y: 200, width: 1000, height: 1200,
        layout: { type: 'grid', spacingX: 16, spacingY: 16, resizeMode: 'container',
                  paddingLeft: 20, paddingRight: 20, paddingTop: 20, paddingBottom: 20,
                  startAxis: 'horizontal' },
        children: Array.from({ length: 12 }, (_, i) => ({
          name: `Slot_${i + 1}`,
          type: 'Sprite',
          width: 220, height: 220,
          color: '#1e293b',
          children: [
            { name: 'SlotIcon', type: 'Sprite', x: 0, y: 20, width: 160, height: 160, color: '#334155' },
            { name: 'CountLabel', type: 'Label', x: 80, y: -88, width: 80, height: 44,
              text: `×${i + 1}`, fontSize: 22, fontColor: '#fbbf24', bold: true,
              horizontalAlign: 'right', verticalAlign: 'bottom' }
          ]
        }))
      }
    ]
  },

  'loading': {
    name: 'LoadingScreen',
    canvasWidth: 1080,
    canvasHeight: 1920,
    nodes: [
      {
        name: 'Background',
        type: 'Sprite',
        x: 0, y: 0, width: 1080, height: 1920, color: '#0a0614',
        widget: { alignLeft: true, alignRight: true, alignTop: true, alignBottom: true,
                  left: 0, right: 0, top: 0, bottom: 0 }
      },
      {
        name: 'LogoLabel',
        type: 'Label',
        x: 0, y: 300, width: 800, height: 160,
        text: 'MY GAME', fontSize: 90, fontColor: '#8b5cf6', bold: true,
        horizontalAlign: 'center'
      },
      {
        name: 'ProgressBarBg',
        type: 'Sprite',
        x: 0, y: -600, width: 800, height: 28,
        color: '#1f2937'
      },
      {
        name: 'ProgressBarFill',
        type: 'Sprite',
        x: -200, y: -600, width: 400, height: 28,
        color: '#8b5cf6'
      },
      {
        name: 'PercentLabel',
        type: 'Label',
        x: 0, y: -650, width: 300, height: 50,
        text: '50%', fontSize: 26, fontColor: '#94a3b8',
        horizontalAlign: 'center'
      },
      {
        name: 'HintLabel',
        type: 'Label',
        x: 0, y: -750, width: 900, height: 60,
        text: '💡 Tip: Press ESC to open the pause menu during gameplay.',
        fontSize: 24, fontColor: '#6b7280',
        horizontalAlign: 'center', overflow: 'shrink'
      }
    ]
  }
};

// ─────────────────────────────────────────────
// UI References
// ─────────────────────────────────────────────

const jsonEditor    = document.getElementById('json-editor');
const lineNumbers   = document.getElementById('line-numbers');
const editorStatus  = document.getElementById('editor-status');
const editorInfo    = document.getElementById('editor-info');
const statusBar     = document.getElementById('status-bar');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('status-text');
const treeSection   = document.getElementById('tree-section');
const treeContainer = document.getElementById('tree-container');
const btnBuild      = document.getElementById('btn-build');
const btnPreview    = document.getElementById('btn-preview');
const btnFormat     = document.getElementById('btn-format');
const btnClear      = document.getElementById('btn-clear');
const btnCopyPrompt = document.getElementById('btn-copy-prompt');
const aiPromptText  = document.getElementById('ai-prompt-text');
const presetsGrid   = document.getElementById('presets-grid');

// ─────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-content-${target}`).classList.add('active');
  });
});

// ─────────────────────────────────────────────
// JSON Editor — line numbers & validation
// ─────────────────────────────────────────────

function updateLineNumbers() {
  const lines = jsonEditor.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  editorInfo.textContent = `${lines} lines`;
}

function validateJSON(value) {
  if (!value.trim()) {
    editorStatus.textContent = 'Ready';
    editorStatus.className = 'editor-status';
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    editorStatus.textContent = '✓ Valid JSON';
    editorStatus.className = 'editor-status ok';
    return parsed;
  } catch (e) {
    editorStatus.textContent = '✗ ' + e.message.split('\n')[0];
    editorStatus.className = 'editor-status error';
    return null;
  }
}

jsonEditor.addEventListener('input', () => {
  updateLineNumbers();
  validateJSON(jsonEditor.value);
});

jsonEditor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = jsonEditor.scrollTop;
});

jsonEditor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = jsonEditor.selectionStart;
    const end   = jsonEditor.selectionEnd;
    jsonEditor.value = jsonEditor.value.substring(0, start) + '  ' + jsonEditor.value.substring(end);
    jsonEditor.selectionStart = jsonEditor.selectionEnd = start + 2;
    updateLineNumbers();
  }
});

// ─────────────────────────────────────────────
// Format & Clear
// ─────────────────────────────────────────────

btnFormat.addEventListener('click', () => {
  const parsed = validateJSON(jsonEditor.value);
  if (parsed) {
    jsonEditor.value = JSON.stringify(parsed, null, 2);
    updateLineNumbers();
  }
});

btnClear.addEventListener('click', () => {
  jsonEditor.value = '';
  treeSection.style.display = 'none';
  updateLineNumbers();
  validateJSON('');
});

// ─────────────────────────────────────────────
// Tree Preview
// ─────────────────────────────────────────────

const NODE_ICONS = {
  Node: '📦', Sprite: '🖼️', Label: '🔤', Button: '🔘',
  ScrollView: '📜', Layout: '🗂️', RichText: '📝', EditBox: '✏️', Canvas: '🎨'
};

function renderTreeNode(node, depth) {
  const lines = [];
  const indent = '&nbsp;&nbsp;'.repeat(depth * 2);
  const icon   = NODE_ICONS[node.type] || '📦';
  const childCount = node.children ? node.children.length : 0;
  lines.push(`<div class="tree-item">
    <span class="tree-indent">${indent}</span>
    <span class="tree-connector">${depth > 0 ? '├─' : '┌─'}</span>
    <span class="tree-type-icon">${icon}</span>
    <span class="tree-name">${node.name || 'Node'}</span>
    <span class="tree-type-badge">${node.type || 'Node'}</span>
    ${childCount > 0 ? `<span style="font-size:10px;color:var(--text-muted);">&nbsp;+${childCount}</span>` : ''}
  </div>`);
  if (node.children) {
    for (const child of node.children) {
      lines.push(...renderTreeNode(child, depth + 1));
    }
  }
  return lines;
}

btnPreview.addEventListener('click', () => {
  const parsed = validateJSON(jsonEditor.value);
  if (!parsed || !parsed.nodes) {
    setStatus('error', 'No valid JSON to preview. Check your JSON first.');
    return;
  }
  const lines = [];
  for (const node of parsed.nodes) {
    lines.push(...renderTreeNode(node, 0));
  }
  treeContainer.innerHTML = lines.join('');
  treeSection.style.display = 'flex';
  setStatus('idle', `Preview ready — ${parsed.nodes.length} root node(s) to build`);
});

// ─────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────

btnBuild.addEventListener('click', async () => {
  const value = jsonEditor.value.trim();
  if (!value) {
    setStatus('error', 'JSON is empty. Paste a layout JSON or load a preset.');
    return;
  }
  const parsed = validateJSON(value);
  if (!parsed) {
    setStatus('error', 'Fix JSON errors before building.');
    return;
  }

  setStatus('loading', 'Building UI nodes in Cocos Creator scene...');
  btnBuild.disabled = true;
  btnBuild.classList.add('loading');

  try {
    // Send to extension main process via Editor IPC
    const result = await Editor.Message.request('cocos-ui-auto-layout', 'build-ui', value);

    if (result && result.success) {
      setStatus('success', `✅ Successfully built ${result.count || parsed.nodes.length} root node(s) in scene!`);
    } else {
      const err = (result && result.error) ? result.error : 'Unknown error from scene process';
      setStatus('error', '❌ Build failed: ' + err);
    }
  } catch (err) {
    setStatus('error', '❌ IPC error: ' + String(err));
  } finally {
    btnBuild.disabled = false;
    btnBuild.classList.remove('loading');
  }
});

// ─────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────

function setStatus(type, message) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = message;
}

// ─────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────

document.querySelectorAll('.preset-card').forEach(card => {
  card.addEventListener('click', () => {
    const presetKey = card.dataset.preset;
    const preset = PRESETS[presetKey];
    if (!preset) return;

    jsonEditor.value = JSON.stringify(preset, null, 2);
    updateLineNumbers();
    validateJSON(jsonEditor.value);

    // Switch to builder tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-builder').classList.add('active');
    document.getElementById('tab-content-builder').classList.add('active');

    setStatus('idle', `Loaded preset: "${card.querySelector('.preset-name').textContent}". Click "Build in Cocos" to create.`);
  });
});

// ─────────────────────────────────────────────
// Copy AI Prompt
// ─────────────────────────────────────────────

btnCopyPrompt.addEventListener('click', async () => {
  const text = aiPromptText.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btnCopyPrompt.classList.add('copied');
    btnCopyPrompt.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!`;
    setTimeout(() => {
      btnCopyPrompt.classList.remove('copied');
      btnCopyPrompt.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy`;
    }, 2200);
  } catch {
    btnCopyPrompt.textContent = 'Select all text above manually';
  }
});

// ─────────────────────────────────────────────
// Listen for results from extension main process
// ─────────────────────────────────────────────

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'build-result') {
    const result = event.data.result;
    if (result.success) {
      setStatus('success', `✅ Built ${result.count} node(s) successfully!`);
    } else {
      setStatus('error', '❌ ' + (result.error || 'Build failed'));
    }
    btnBuild.disabled = false;
    btnBuild.classList.remove('loading');
  }
});

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────

updateLineNumbers();
