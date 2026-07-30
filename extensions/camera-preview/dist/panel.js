'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// Camera Preview — panel.js (dist)
// Панель расширения Cocos Creator 3.x.
// Обязательно используется Editor.Panel.define() — без этого панель не откроется.
// ──────────────────────────────────────────────────────────────────────────────

const TEMPLATE = /* html */`
<section class="cam-preview-root">
  <!-- ── Toolbar ── -->
  <div class="cp-toolbar">
    <div class="cp-tg">
      <span class="cp-lbl">Камера:</span>
      <select id="cp-cam-sel" title="Камера сцены">
        <option value="">— нет —</option>
      </select>
      <button id="cp-ref" class="cp-btn cp-bg cp-bi" title="Обновить список камер">↻</button>
    </div>
    <div class="cp-sep"></div>
    <div class="cp-tg">
      <span class="cp-lbl">FPS:</span>
      <select id="cp-fps-sel">
        <option value="1">1</option>
        <option value="5">5</option>
        <option value="10" selected>10</option>
        <option value="20">20</option>
        <option value="30">30</option>
      </select>
    </div>
    <div class="cp-sep"></div>
    <div class="cp-tg">
      <span class="cp-lbl">Ratio:</span>
      <button class="cp-ar on" data-ar="free">Free</button>
      <button class="cp-ar" data-ar="16:9">16:9</button>
      <button class="cp-ar" data-ar="4:3">4:3</button>
      <button class="cp-ar" data-ar="1:1">1:1</button>
      <button class="cp-ar" data-ar="9:16">9:16</button>
      <button class="cp-ar" data-ar="custom">…</button>
    </div>
    <div class="cp-tg" id="cp-cust-grp" style="display:none;">
      <input type="number" id="cp-arW" value="16" min="1" max="999" title="AR ширина">
      <span class="cp-lbl">:</span>
      <input type="number" id="cp-arH" value="9"  min="1" max="999" title="AR высота">
    </div>
    <span style="flex:1;"></span>
    <button class="cp-btn cp-bp" id="cp-run">▶ Старт</button>
  </div>

  <!-- ── Preview ── -->
  <div class="cp-pw" id="cp-pw">
    <div class="cp-ns" id="cp-ns">
      <div class="cp-ns-ico">📷</div>
      <div class="cp-ns-title">Camera Preview</div>
      <div class="cp-ns-hint">Выберите камеру и нажмите «Старт»</div>
    </div>
    <img id="cp-img" class="cp-img" style="display:none;" alt="Camera Preview">
    <div class="cp-spin" id="cp-spin"></div>
    <div class="cp-ovl" id="cp-ovl">—</div>
  </div>

  <!-- ── Status bar ── -->
  <div class="cp-sb">
    <div class="cp-dot" id="cp-dot"></div>
    <span id="cp-stxt">Готов</span>
    <span class="cp-fpc" id="cp-fpc"></span>
  </div>
</section>
`;

const STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host, section.cam-preview-root {
    --bg:    #13161b;
    --bg2:   #1a1d23;
    --bg3:   #212530;
    --ac:    #5b7cfa;
    --ag:    rgba(91,124,250,.28);
    --ah:    #7b97ff;
    --tx:    #e8eaf0;
    --mu:    #6b7280;
    --bo:    rgba(255,255,255,.07);
    --bac:   rgba(91,124,250,.4);
    --ok:    #34d399;
    --wn:    #f59e0b;
    --er:    #f87171;
    --rs:    4px;
    display: flex; flex-direction: column;
    width: 100%; height: 100%;
    background: var(--bg);
    color: var(--tx);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    overflow: hidden;
    user-select: none;
  }

  /* toolbar */
  .cp-toolbar {
    display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
    padding: 5px 8px;
    background: var(--bg2);
    border-bottom: 1px solid var(--bo);
    flex-shrink: 0;
  }
  .cp-tg { display: flex; align-items: center; gap: 4px; }
  .cp-lbl { color: var(--mu); font-size: 10px; white-space: nowrap; }
  .cp-sep { width: 1px; height: 16px; background: var(--bo); flex-shrink: 0; }

  select, input[type=number] {
    background: var(--bg3); border: 1px solid var(--bo); border-radius: var(--rs);
    color: var(--tx); padding: 2px 5px; font-size: 11px;
    outline: none; transition: border-color .2s;
  }
  select:focus, input[type=number]:focus {
    border-color: var(--ac); box-shadow: 0 0 0 2px var(--ag);
  }
  select { min-width: 108px; }
  input[type=number] { width: 46px; text-align: center; }

  .cp-btn {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 3px 9px; border-radius: var(--rs); border: none;
    cursor: pointer; font-size: 11px; font-weight: 500;
    transition: all .18s; white-space: nowrap;
  }
  .cp-bp { background: var(--ac); color: #fff; }
  .cp-bp:hover { background: var(--ah); box-shadow: 0 0 8px var(--ag); }
  .cp-bg { background: transparent; color: var(--mu); border: 1px solid var(--bo); }
  .cp-bg:hover { color: var(--tx); border-color: var(--bac); background: rgba(91,124,250,.07); }
  .cp-bi { padding: 3px 6px; font-size: 13px; }

  .cp-ar {
    padding: 2px 6px; background: var(--bg3); border: 1px solid var(--bo);
    border-radius: var(--rs); color: var(--mu); cursor: pointer; font-size: 10px;
    transition: all .18s; white-space: nowrap;
  }
  .cp-ar:hover { border-color: var(--bac); color: var(--tx); }
  .cp-ar.on { background: rgba(91,124,250,.18); border-color: var(--ac); color: var(--ac); }

  /* preview */
  .cp-pw {
    flex: 1; display: flex; align-items: center; justify-content: center;
    background: var(--bg); overflow: hidden; position: relative;
    transition: aspect-ratio .25s;
  }
  .cp-img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
  .cp-ns {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; color: var(--mu); text-align: center; padding: 24px;
  }
  .cp-ns-ico   { font-size: 42px; opacity: .22; }
  .cp-ns-title { font-size: 13px; font-weight: 600; color: var(--tx); opacity: .38; }
  .cp-ns-hint  { font-size: 11px; max-width: 185px; line-height: 1.5; }

  .cp-spin {
    position: absolute; top: 50%; left: 50%;
    width: 26px; height: 26px;
    transform: translate(-50%,-50%);
    border: 3px solid rgba(91,124,250,.18);
    border-top-color: var(--ac);
    border-radius: 50%;
    animation: cp-spin .75s linear infinite;
    display: none;
  }
  .cp-spin.v { display: block; }
  @keyframes cp-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }

  .cp-ovl {
    position: absolute; top: 6px; left: 6px;
    background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
    border-radius: var(--rs); padding: 2px 7px;
    font-size: 10px; color: rgba(255,255,255,.55);
    pointer-events: none; opacity: 0; transition: opacity .25s;
  }
  .cp-pw:hover .cp-ovl { opacity: 1; }

  /* statusbar */
  .cp-sb {
    display: flex; align-items: center; gap: 7px;
    padding: 3px 8px; background: var(--bg2);
    border-top: 1px solid var(--bo);
    flex-shrink: 0; font-size: 10px; color: var(--mu);
  }
  .cp-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--mu); flex-shrink: 0; transition: background .3s;
  }
  .cp-dot.ok { background: var(--ok); box-shadow: 0 0 5px var(--ok); }
  .cp-dot.er { background: var(--er); }
  .cp-dot.wn { background: var(--wn); }
  .cp-fpc { margin-left: auto; font-variant-numeric: tabular-nums; }
`;

// ── Panel logic (runs inside the panel's JS context) ──────────────────────────
function panelReady(panel) {
    const doc = panel.shadowRoot || document;
    const G = id => doc.getElementById(id);

    let running = false, timer = null, fc = 0, lastTs = performance.now(), selAr = 'free';
    let capW = 512, capH = 288;

    const camSel  = G('cp-cam-sel');
    const fpsSel  = G('cp-fps-sel');
    const btnRun  = G('cp-run');
    const btnRef  = G('cp-ref');
    const img     = G('cp-img');
    const ns      = G('cp-ns');
    const spin    = G('cp-spin');
    const dot     = G('cp-dot');
    const stxt    = G('cp-stxt');
    const fpc     = G('cp-fpc');
    const ovl     = G('cp-ovl');
    const pw      = G('cp-pw');
    const custGrp = G('cp-cust-grp');
    const arW     = G('cp-arW');
    const arH     = G('cp-arH');
    const arBtns  = doc.querySelectorAll('.cp-ar');

    // ── Aspect Ratio ──────────────────────────────────────────────────────────
    arBtns.forEach(b => b.addEventListener('click', () => {
        arBtns.forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        selAr = b.dataset.ar;
        custGrp.style.display = (selAr === 'custom') ? 'flex' : 'none';
        applyAR();
    }));
    [arW, arH].forEach(i => i.addEventListener('input', () => {
        if (selAr === 'custom') applyAR();
    }));

    function getAR() {
        if (selAr === 'free') return null;
        if (selAr === 'custom') return (parseFloat(arW.value) || 16) / (parseFloat(arH.value) || 9);
        const [w, h] = selAr.split(':');
        return parseFloat(w) / parseFloat(h);
    }

    function applyAR() {
        const ar = getAR();
        pw.style.aspectRatio = ar ? String(ar) : '';
        recalc();
    }

    function recalc() {
        const r = pw.getBoundingClientRect(), ar = getAR();
        if (ar && ar > 0) {
            capW = Math.max(64, Math.min(640, Math.round(r.width)));
            capH = Math.max(36, Math.round(capW / ar));
        } else {
            capW = Math.max(64, Math.min(640, Math.round(r.width)));
            capH = Math.max(36, Math.min(480, Math.round(r.height)));
        }
        ovl.textContent = Math.round(r.width) + '×' + Math.round(r.height);
    }

    new ResizeObserver(recalc).observe(pw);
    recalc();

    // ── Status helper ─────────────────────────────────────────────────────────
    function setS(type, msg) {
        dot.className = 'cp-dot' + (type ? ' ' + type : '');
        stxt.textContent = msg;
    }

    // ── Camera list refresh ───────────────────────────────────────────────────
    function refreshCams() {
        setS('wn', 'Поиск камер…');
        Editor.Message.send('camera-preview', 'camera-preview:list-cameras');
    }
    btnRef.addEventListener('click', refreshCams);

    // ── Start / Stop ──────────────────────────────────────────────────────────
    btnRun.addEventListener('click', () => { running ? doStop() : doStart(); });

    function doStart() {
        if (!camSel.value) { setS('er', 'Выберите камеру'); return; }
        running = true;
        btnRun.textContent = '⏹ Стоп';
        btnRun.className = 'cp-btn cp-bg';
        setS('ok', 'Запуск…');
        spin.classList.add('v');
        doCapture();
    }

    function doStop() {
        running = false;
        if (timer) { clearTimeout(timer); timer = null; }
        btnRun.textContent = '▶ Старт';
        btnRun.className = 'cp-btn cp-bp';
        setS('', 'Остановлено');
        spin.classList.remove('v');
        fpc.textContent = '';
    }

    function sched() {
        if (!running) return;
        const ms = Math.round(1000 / parseInt(fpsSel.value, 10));
        timer = setTimeout(doCapture, ms);
    }

    function doCapture() {
        if (!running) return;
        recalc();
        Editor.Message.send('camera-preview', 'camera-preview:capture-frame',
            camSel.value, capW, capH);
    }

    // ── Public API (called by panel methods) ──────────────────────────────────
    panel.__onFrame = function (b64) {
        spin.classList.remove('v');
        if (!b64) { setS('wn', 'Нет данных — камера не найдена?'); sched(); return; }
        img.src = b64;
        img.style.display = 'block';
        ns.style.display = 'none';
        setS('ok', 'Live — ' + camSel.value);
        fc++;
        const now = performance.now();
        if (now - lastTs >= 1000) {
            fpc.textContent = Math.round(fc * 1000 / (now - lastTs)) + ' fps';
            fc = 0; lastTs = now;
        }
        sched();
    };

    panel.__onCams = function (cams) {
        const prev = camSel.value;
        camSel.innerHTML = '<option value="">— нет —</option>';
        (cams || []).forEach(n => {
            const o = document.createElement('option');
            o.value = n; o.textContent = n;
            if (n === prev) o.selected = true;
            camSel.appendChild(o);
        });
        const c = (cams || []).length;
        setS(c ? 'ok' : 'wn', c ? 'Камер: ' + c : 'Камеры не найдены в сцене');
    };

    // Авто-поиск камер при открытии панели
    refreshCams();
}

// ── Panel module export (MUST use Editor.Panel.define) ────────────────────────
module.exports = Editor.Panel.define({

    template: TEMPLATE,
    style: STYLE,

    $: {},

    methods: {
        // Вызывается из main.js когда пришёл кадр
        onFrameData(base64) {
            if (this.__onFrame) this.__onFrame(base64 || null);
        },
        // Вызывается из main.js когда пришёл список камер
        onCamerasList(cameras) {
            if (this.__onCams) this.__onCams(cameras || []);
        },
    },

    ready() {
        panelReady(this);
    },

    close() {
        // cleanup
    },
});
