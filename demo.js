// "See ClipDesigner in action": simplified, self-contained demos. Nothing leaves the page.
(function () {
  var demo = document.querySelector('.demo');
  if (!demo) return;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SVGNS = 'http://www.w3.org/2000/svg';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ---------- Annotate a capture ----------
  var annotate = (function () {
    var panel = document.getElementById('demo-annotate');
    var stage = panel.querySelector('.ann-stage');
    var svg = panel.querySelector('.ann-svg');
    var blurs = panel.querySelector('.ann-blurs');
    var steps = panel.querySelector('.ann-steps');
    var surface = panel.querySelector('.ann-surface');
    var tool = 'arrow';
    var draft = null;
    var items = [
      { type: 'step', x: 0.045, y: 0.285 },
      { type: 'arrow', x1: 0.6, y1: 0.5, x2: 0.775, y2: 0.665 },
      { type: 'step', x: 0.948, y: 0.635 }
    ];

    function pos(e) {
      var r = stage.getBoundingClientRect();
      return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
    }

    function arrow(x1, y1, x2, y2, w) {
      var len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 3) return;
      var ang = Math.atan2(y2 - y1, x2 - x1);
      var sw = Math.max(3, w * 0.006);
      var hs = Math.max(11, Math.min(20, w * 0.024));
      var bx = x2 - Math.cos(ang) * hs * 0.7, by = y2 - Math.sin(ang) * hs * 0.7;
      svg.appendChild(svgEl('line', { x1: x1, y1: y1, x2: bx, y2: by, stroke: '#fff', 'stroke-width': sw + 4, 'stroke-linecap': 'round' }));
      svg.appendChild(svgEl('line', { x1: x1, y1: y1, x2: bx, y2: by, stroke: '#2a9be0', 'stroke-width': sw, 'stroke-linecap': 'round' }));
      var p = [
        [x2, y2],
        [x2 - hs * Math.cos(ang - 0.5), y2 - hs * Math.sin(ang - 0.5)],
        [x2 - hs * Math.cos(ang + 0.5), y2 - hs * Math.sin(ang + 0.5)]
      ];
      svg.appendChild(svgEl('polygon', { points: p.map(function (q) { return q.join(','); }).join(' '), fill: '#2a9be0', stroke: '#fff', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    }

    function render() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w) return;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      blurs.textContent = '';
      steps.textContent = '';
      var n = 0;
      var list = draft ? items.concat([draft]) : items;
      list.forEach(function (it) {
        if (it.type === 'step') {
          var s = document.createElement('span');
          s.className = 'ann-step' + (it.fresh ? ' pop' : '');
          s.style.left = it.x * 100 + '%';
          s.style.top = it.y * 100 + '%';
          s.textContent = ++n;
          it.fresh = false;
          steps.appendChild(s);
          return;
        }
        if (it.type === 'arrow') {
          arrow(it.x1 * w, it.y1 * h, it.x2 * w, it.y2 * h, w);
          return;
        }
        var x0 = Math.min(it.x1, it.x2), y0 = Math.min(it.y1, it.y2);
        var rw = Math.abs(it.x2 - it.x1), rh = Math.abs(it.y2 - it.y1);
        if (it.type === 'blur') {
          var b = document.createElement('span');
          b.className = 'ann-blur';
          b.style.left = x0 * 100 + '%';
          b.style.top = y0 * 100 + '%';
          b.style.width = rw * 100 + '%';
          b.style.height = rh * 100 + '%';
          blurs.appendChild(b);
        } else {
          svg.appendChild(svgEl('rect', { x: x0 * w, y: y0 * h, width: rw * w, height: rh * h, rx: 3, fill: '#ffd400', 'fill-opacity': 0.45, style: 'mix-blend-mode:multiply' }));
        }
      });
    }

    surface.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      var p = pos(e);
      if (tool === 'step') {
        items.push({ type: 'step', x: p.x, y: p.y, fresh: true });
        render();
        return;
      }
      surface.setPointerCapture(e.pointerId);
      draft = { type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
      render();
    });
    surface.addEventListener('pointermove', function (e) {
      if (!draft) return;
      var p = pos(e);
      draft.x2 = p.x;
      draft.y2 = p.y;
      render();
    });
    function finish() {
      if (!draft) return;
      var dx = (draft.x2 - draft.x1) * stage.clientWidth, dy = (draft.y2 - draft.y1) * stage.clientHeight;
      if (Math.hypot(dx, dy) > 10) items.push(draft);
      draft = null;
      render();
    }
    surface.addEventListener('pointerup', finish);
    surface.addEventListener('pointercancel', finish);

    var toolButtons = [].slice.call(panel.querySelectorAll('[data-tool]'));
    toolButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tool = btn.dataset.tool;
        toolButtons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        setHint();
      });
    });
    panel.querySelector('[data-act="undo"]').addEventListener('click', function () { items.pop(); render(); });
    panel.querySelector('[data-act="clear"]').addEventListener('click', function () { items = []; render(); });
    if ('ResizeObserver' in window) new ResizeObserver(render).observe(stage);

    function hint() {
      return {
        arrow: 'Drag on the picture to draw an arrow.',
        step: 'Tap anywhere to drop a numbered step. They number themselves; Undo removes the last one.',
        highlight: 'Drag over anything you want to highlight.',
        blur: 'Drag over anything you want to blur.'
      }[tool];
    }
    return { render: render, hint: hint };
  })();

  // ---------- Redact before sharing ----------
  var redact = (function () {
    var panel = document.getElementById('demo-redact');
    var stage = panel.querySelector('.redact-stage');
    var page = panel.querySelector('.acct');
    var list = panel.querySelector('.redact-items');
    var empty = panel.querySelector('.redact-empty');
    var exportBtn = panel.querySelector('.redact-export');
    var count = panel.querySelector('.redact-count');
    var status = panel.querySelector('.tools-status');
    var scanBtn = panel.querySelector('[data-act="scan"]');
    var originals = panel.querySelector('[data-act="originals"]');
    var pii = [].slice.call(panel.querySelectorAll('.pii'));
    var timers = [];
    var running = false;

    function tally() {
      var flagged = pii.filter(function (el) { return el.classList.contains('flag'); }).length;
      var covered = pii.filter(function (el) { return el.classList.contains('covered'); }).length;
      return { flagged: flagged, covered: covered };
    }
    function update() {
      var n = tally();
      exportBtn.disabled = n.flagged + n.covered === 0;
      count.textContent = n.flagged ? n.flagged + ' to review' : (n.covered ? 'Ready' : '');
      count.classList.toggle('ok', !n.flagged && n.covered > 0);
      if (!running) {
        status.textContent = n.flagged + n.covered === 0 ? 'Not scanned yet' : n.covered + ' covered · ' + n.flagged + ' to review';
      }
    }
    function reveal(el) {
      var row = el.closest('.acct-row');
      page.scrollTo({ top: Math.max(0, row.offsetTop - 60), behavior: reduce ? 'auto' : 'smooth' });
    }
    function addItem(el) {
      var review = !!el.dataset.review;
      var li = document.createElement('li');
      if (review) li.className = 'review';
      var title = document.createElement('div');
      title.className = 'ri-title';
      title.textContent = el.dataset.kind;
      var sub = document.createElement('div');
      sub.className = 'ri-sub';
      sub.textContent = review ? 'Needs review · ' + el.dataset.review : 'Tracked · covered';
      li.appendChild(title);
      li.appendChild(sub);
      if (review) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ri-btn';
        b.textContent = 'Cover it';
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          el.classList.remove('flag');
          el.classList.add('covered');
          li.className = '';
          sub.textContent = 'Reviewed · covered';
          b.remove();
          update();
        });
        li.appendChild(b);
      }
      li.addEventListener('click', function () { reveal(el); });
      list.appendChild(li);
    }
    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      pii.forEach(function (el) { el.classList.remove('covered', 'flag'); });
      list.textContent = '';
      empty.hidden = false;
      update();
    }
    function scan() {
      if (running) return;
      reset();
      running = true;
      scanBtn.disabled = true;
      status.textContent = 'Scanning…';
      empty.hidden = true;
      page.scrollTo({ top: 0 });
      stage.classList.remove('scanning');
      void stage.offsetWidth;
      stage.classList.add('scanning');
      var step = reduce ? 0 : 300;
      pii.forEach(function (el, i) {
        timers.push(setTimeout(function () {
          el.classList.add(el.dataset.review ? 'flag' : 'covered');
          addItem(el);
          update();
        }, (reduce ? 0 : 380) + i * step));
      });
      timers.push(setTimeout(function () {
        running = false;
        scanBtn.disabled = false;
        scanBtn.lastChild.textContent = 'Scan again';
        stage.classList.remove('scanning');
        update();
      }, reduce ? 30 : 1800));
    }
    scanBtn.addEventListener('click', scan);
    originals.addEventListener('change', function () { panel.classList.toggle('show-originals', originals.checked); });
    exportBtn.addEventListener('click', function () {
      var n = tally();
      status.textContent = n.flagged ? 'Review the flagged item first' : 'Exported — covered text is gone from the file';
    });
    update();
    return {
      hint: function () { return 'Press Find sensitive info, scroll the page, then review what it flagged.'; }
    };
  })();

  // ---------- Edit a screen video ----------
  var video = (function () {
    var panel = document.getElementById('demo-video');
    var inner = panel.querySelector('.vid-inner');
    var cur = panel.querySelector('.vid-cursor');
    var zoomTag = panel.querySelector('.vid-zoom');
    var cap = panel.querySelector('.vid-caption');
    var head = panel.querySelector('.tl-head');
    var scrub = panel.querySelector('.tl-scrub');
    var clock = panel.querySelector('.vid-time');
    var playBtn = panel.querySelector('[data-act="play"]');
    var follow = panel.querySelector('[data-act="follow"]');
    var audio = panel.querySelector('.clip-audio');
    var D = 10, t = 0, playing = false, raf = 0, last = 0;
    var visible = false, inView = false, userPaused = false;
    var path = [[0, 0.22, 0.3], [3, 0.3, 0.48], [5.5, 0.87, 0.69], [7, 0.84, 0.66], [10, 0.6, 0.55]];
    var caption = 'Show exactly what matters';

    (function waveform() {
      var s = svgEl('svg', { viewBox: '0 0 300 20', preserveAspectRatio: 'none' });
      var seed = 7;
      for (var i = 0; i < 150; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        var a = (0.25 + 0.75 * Math.abs(Math.sin(i * 0.11))) * (0.4 + 0.6 * seed / 233280);
        s.appendChild(svgEl('rect', { x: i * 2, y: 10 - 9 * a, width: 1.2, height: 18 * a, fill: '#4fc28a' }));
      }
      audio.appendChild(s);
    })();

    function cursorAt(s) {
      for (var i = 1; i < path.length; i++) {
        if (s <= path[i][0]) {
          var a = path[i - 1], b = path[i], k = smooth((s - a[0]) / (b[0] - a[0]));
          return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k };
        }
      }
      var e = path[path.length - 1];
      return { x: e[1], y: e[2] };
    }
    function fmt(s) { return '00:' + (s < 10 ? '0' : '') + s.toFixed(2); }

    function render() {
      var p = cursorAt(t);
      var z = 1 + 0.9 * smooth(seg(t, 3, 3.6)) * (1 - smooth(seg(t, 5.8, 6.4)));
      var ox = follow.checked ? p.x : 0.5, oy = follow.checked ? p.y : 0.5;
      inner.style.transformOrigin = ox * 100 + '% ' + oy * 100 + '%';
      inner.style.transform = 'scale(' + z.toFixed(4) + ')';
      cur.style.left = (ox + (p.x - ox) * z) * 100 + '%';
      cur.style.top = (oy + (p.y - oy) * z) * 100 + '%';
      cur.classList.toggle('clicking', t >= 5.5 && t < 6.1);
      zoomTag.style.opacity = z > 1.02 ? 1 : 0;
      zoomTag.textContent = 'Zoom ' + z.toFixed(1) + '×';
      var n = Math.round(caption.length * seg(t, 5.2, 6.8));
      cap.textContent = caption.slice(0, n);
      cap.style.opacity = n > 0 && t < 9.2 ? 1 - seg(t, 8.7, 9.2) : 0;
      head.style.left = t / D * 100 + '%';
      clock.textContent = fmt(t) + ' / 00:10.00';
    }
    function loop(ts) {
      if (last) t += (ts - last) / 1000;
      last = ts;
      if (t >= D) t -= D;
      render();
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (playing) return;
      playing = true;
      last = 0;
      playBtn.classList.add('playing');
      playBtn.querySelector('span').textContent = 'Pause';
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      playing = false;
      cancelAnimationFrame(raf);
      playBtn.classList.remove('playing');
      playBtn.querySelector('span').textContent = 'Play';
    }
    function maybePlay() {
      if (visible && inView && !reduce && !userPaused) play();
      else pause();
    }
    playBtn.addEventListener('click', function () {
      if (playing) { userPaused = true; pause(); } else { userPaused = false; play(); }
    });
    follow.addEventListener('change', render);

    var dragging = false, wasPlaying = false;
    function setFrom(e) {
      var r = scrub.getBoundingClientRect();
      t = clamp((e.clientX - r.left) / r.width, 0, 0.9999) * D;
      render();
    }
    scrub.tabIndex = 0;
    scrub.setAttribute('role', 'slider');
    scrub.setAttribute('aria-label', 'Playhead');
    scrub.setAttribute('aria-valuemin', '0');
    scrub.setAttribute('aria-valuemax', '10');
    scrub.addEventListener('pointerdown', function (e) {
      dragging = true;
      wasPlaying = playing;
      pause();
      scrub.setPointerCapture(e.pointerId);
      setFrom(e);
    });
    scrub.addEventListener('pointermove', function (e) { if (dragging) setFrom(e); });
    function stop() {
      if (!dragging) return;
      dragging = false;
      if (wasPlaying) play();
    }
    scrub.addEventListener('pointerup', stop);
    scrub.addEventListener('pointercancel', stop);
    scrub.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      t = clamp(t + (e.key === 'ArrowRight' ? 0.5 : -0.5), 0, D - 0.001);
      scrub.setAttribute('aria-valuenow', t.toFixed(1));
      render();
    });

    render();
    return {
      show: function () { visible = true; render(); maybePlay(); },
      hide: function () { visible = false; pause(); },
      setInView: function (v) { inView = v; maybePlay(); },
      hint: function () { return 'Press Play or drag along the timeline. Turn off "Zoom follows cursor" to compare.'; }
    };
  })();

  // ---------- tabs ----------
  var tabs = [].slice.call(demo.querySelectorAll('[role="tab"]'));
  var hintEl = demo.querySelector('.demo-hint');
  var current = 'annotate';
  var modes = { annotate: annotate, redact: redact, video: video };

  function setHint() { hintEl.textContent = modes[current].hint(); }
  function select(mode, focus) {
    current = mode;
    tabs.forEach(function (tab) {
      var on = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !on;
    });
    if (mode === 'video') video.show(); else video.hide();
    if (mode === 'annotate') annotate.render();
    setHint();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab.dataset.mode); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.mode, true);
    });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      video.setInView(entries[0].isIntersecting);
    }, { threshold: 0.25 }).observe(demo);
  } else {
    video.setInView(true);
  }
  select('annotate');
})();
