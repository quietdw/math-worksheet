/* ==========================================================================
   语文练习页 · 交互层（jQuery）
   - 参数面板、生成、预览、缩放、打印、配置持久化
   - 出题与排版全部委托给 CN.engine / CN.paper，本文件只做 DOM 与状态
   ========================================================================== */
(function (window, document, $) {
  'use strict';

  if (!$ || !window.CN) {
    if (window.console) window.console.error('[CN] 依赖缺失：jQuery 或 CN 模块未加载。');
    return;
  }

  var CN = window.CN;
  var STORE = 'cn.cfg.v1';

  var DEFAULTS = {
    grades: [1, 2, 3],
    types: ['pinyin2word', 'char2pinyin', 'homophone', 'wordBuild'],
    stars: [1, 2, 3],
    count: 20,
    curve: 'mixed',
    seed: '20261029',
    cols: 2,
    rows: 10,
    fontSize: 16,
    header: true,
    answers: false
  };

  var TEXT = {
    zh: {
      paperTitle: '语文练习卷',
      name: '姓名：',
      cls: '班级：',
      date: '日期：',
      score: '得分：',
      answerTag: '答案卷',
      page: function (i, n) { return '第 ' + i + ' / ' + n + ' 页'; },
      ready: function (n) { return '已生成 ' + n + ' 题'; },
      shortage: function (n) { return '题库覆盖不足，少 ' + n + ' 题，可放宽年级或星级'; },
      reused: function (n) { return '候选已用尽，复用 ' + n + ' 题'; },
      degraded: function (n) { return '其中 ' + n + ' 题降级到相邻星级'; },
      skipped: function () { return '所选题型在当前年级与星级下无可用题目'; },
      seedCopied: '种子已复制',
      seedFail: '复制失败，请手动选中',
      noBank: '题库加载失败，请检查 assets/cn/bank.js'
    },
    en: {
      paperTitle: 'Chinese worksheet',
      name: 'Name: ',
      cls: 'Class: ',
      date: 'Date: ',
      score: 'Score: ',
      answerTag: 'Answers',
      page: function (i, n) { return 'Page ' + i + ' / ' + n; },
      ready: function (n) { return n + ' questions ready'; },
      shortage: function (n) { return n + ' questions short — widen grades or stars'; },
      reused: function (n) { return n + ' reused after candidates ran out'; },
      degraded: function (n) { return n + ' fell back to a nearby star level'; },
      skipped: function () { return 'No questions for the current grades and stars'; },
      seedCopied: 'Seed copied',
      seedFail: 'Copy failed, select it manually',
      noBank: 'Bank failed to load — check assets/cn/bank.js'
    }
  };

  var I18N_EXT = {
    zh: {
      cnAppTitle: '语文练习卷生成器',
      cnAppSubtitle: '按年级与星级出题 · 看拼音写词语 / 注音 / 选字 / 组词',
      cnPanelTitle: '参数设置',
      cnReset: '重置',
      cnGroupContent: '题目内容',
      cnGrades: '年级',
      cnTypes: '题型',
      cnCount: '题目数量',
      cnCountHint: '1–200',
      cnGroupLevel: '难度',
      cnStars: '星级',
      cnStarsHint: '★1 最易，★3 最难',
      cnCurve: '难度曲线',
      cnCurveAsc: '递增',
      cnCurveEven: '均衡',
      cnCurveMixed: '混合',
      cnSeed: '种子',
      cnSeedTip: '同一个种子配合同一组参数，每次生成的题目与顺序完全相同；复制种子即可复现整张卷子。',
      cnSeedRandom: '换一个',
      cnSeedCopy: '复制',
      cnGroupLayout: '排版与显示',
      cnCols: '每行题数',
      cnRows: '每页行数',
      cnFont: '字号',
      cnHeader: '表头',
      cnAnswers: '答案卷',
      cnOn: '显示',
      cnOff: '隐藏',
      cnPrint: '打印 / 存 PDF',
      cnTypePinyin2word: '看拼音写词语',
      cnTypeChar2pinyin: '生字注音',
      cnTypeHomophone: '同音字选字',
      cnTypeWordBuild: '组词',
      g1: '一年级',
      g2: '二年级',
      g3: '三年级',
      g4: '四年级',
      g5: '五年级',
      g6: '六年级',
      cnPendingStar: 'P2'
    },
    en: {
      cnAppTitle: 'Chinese worksheet generator',
      cnAppSubtitle: 'Grade and star based · pinyin, character pinyin, homophones, word building',
      cnPanelTitle: 'Settings',
      cnReset: 'Reset',
      cnGroupContent: 'Content',
      cnGrades: 'Grade',
      cnTypes: 'Types',
      cnCount: 'Questions',
      cnCountHint: '1–200',
      cnGroupLevel: 'Difficulty',
      cnStars: 'Stars',
      cnStarsHint: '★1 easiest, ★3 hardest',
      cnCurve: 'Curve',
      cnCurveAsc: 'Rising',
      cnCurveEven: 'Even',
      cnCurveMixed: 'Mixed',
      cnSeed: 'Seed',
      cnSeedTip: 'The same seed with the same settings always produces the same questions in the same order. Copy it to reproduce this worksheet.',
      cnSeedRandom: 'New',
      cnSeedCopy: 'Copy',
      cnGroupLayout: 'Layout',
      cnCols: 'Per row',
      cnRows: 'Rows per page',
      cnFont: 'Font size',
      cnHeader: 'Header',
      cnAnswers: 'Answers',
      cnOn: 'Show',
      cnOff: 'Hide',
      cnPrint: 'Print / PDF',
      cnTypePinyin2word: 'Pinyin to word',
      cnTypeChar2pinyin: 'Character pinyin',
      cnTypeHomophone: 'Homophone choice',
      cnTypeWordBuild: 'Word building',
      g1: 'Grade 1',
      g2: 'Grade 2',
      g3: 'Grade 3',
      g4: 'Grade 4',
      g5: 'Grade 5',
      g6: 'Grade 6',
      cnPendingStar: 'P2'
    }
  };

  var cfg = null;
  var bank = null;
  var items = [];
  var lastStats = null;
  var zoom = { value: 1, fit: true };
  var timer = null;
  // A4 纸宽 210mm，按 96dpi 折算为 794px（与 math 练习页保持一致）
  var PAGE_W = 794;

  /* ---------------- 文案 ---------------- */

  function lang() {
    var l = window.SiteShell && window.SiteShell.lang;
    return l === 'en' ? 'en' : 'zh';
  }

  function tt() { return TEXT[lang()] || TEXT.zh; }

  function paperLabels() {
    var t = tt();
    return {
      title: t.paperTitle,
      meta: [t.name, t.cls, t.date, t.score],
      answerTag: t.answerTag,
      page: t.page
    };
  }

  /* ---------------- 配置 ---------------- */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function normalize(raw) {
    var c = $.extend({}, DEFAULTS, raw || {});
    c.grades = (c.grades || []).map(Number).filter(function (g) { return g >= 1 && g <= 6; });
    c.stars = (c.stars || []).map(Number).filter(function (s) { return s >= 1 && s <= 3; });
    c.types = (c.types || []).filter(function (k) { return !!CN.types.map[k]; });
    c.count = Math.max(1, Math.min(200, parseInt(c.count, 10) || DEFAULTS.count));
    c.cols = [1, 2, 3].indexOf(Number(c.cols)) >= 0 ? Number(c.cols) : DEFAULTS.cols;
    c.rows = [6, 8, 10, 12, 15, 20].indexOf(Number(c.rows)) >= 0 ? Number(c.rows) : DEFAULTS.rows;
    c.fontSize = [14, 16, 18].indexOf(Number(c.fontSize)) >= 0 ? Number(c.fontSize) : DEFAULTS.fontSize;
    c.curve = ['asc', 'even', 'mixed'].indexOf(c.curve) >= 0 ? c.curve : DEFAULTS.curve;
    c.seed = String(c.seed || DEFAULTS.seed);
    c.header = c.header !== false;
    c.answers = c.answers === true;
    if (!c.grades.length) c.grades = DEFAULTS.grades.slice();
    if (!c.stars.length) c.stars = DEFAULTS.stars.slice();
    if (!c.types.length) c.types = DEFAULTS.types.slice();
    return c;
  }

  function loadCfg() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORE);
    } catch (e) { /* 忽略 */ }
    if (!raw) return clone(DEFAULTS);
    try {
      return normalize(JSON.parse(raw));
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  function saveCfg() {
    try {
      window.localStorage.setItem(STORE, JSON.stringify(cfg));
    } catch (e) { /* 忽略 */ }
  }

  /* ---------------- 控件同步 ---------------- */

  function syncChips() {
    $('.chip[data-key]').each(function () {
      var $chip = $(this);
      var key = $chip.attr('data-key');
      var value = $chip.attr('data-value');
      var current = cfg[key];
      var on;
      if (key === 'header' || key === 'answers') {
        on = current === (value === 'true');
      } else if ($.isArray(current)) {
        on = current.indexOf(Number(value)) >= 0 || current.indexOf(value) >= 0;
      } else {
        on = String(current) === value;
      }
      $chip.toggleClass('active', on).attr('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncInputs() {
    $('#seedInput').val(cfg.seed);
    $('#countInput').val(cfg.count);
  }

  function syncAll() {
    syncChips();
    syncInputs();
  }

  /* ---------------- 生成与渲染 ---------------- */

  function renderStatus(stats) {
    var t = tt();
    var $el = $('#status');
    if (!stats) { $el.text(''); return; }

    if (!stats.generated) {
      $el.text(t.skipped()).addClass('warn');
      return;
    }

    var parts = [stats.requested === stats.generated ? t.ready(stats.generated) : t.ready(stats.generated)];
    if (stats.shortage > 0) parts.push(t.shortage(stats.shortage));
    if (stats.degraded > 0) parts.push(t.degraded(stats.degraded));
    if (stats.reused > 0) parts.push(t.reused(stats.reused));
    $el.toggleClass('warn', stats.shortage > 0 || stats.degraded > 0).text(parts.join(' · '));
  }

  function applyZoom() {
    var paper = document.getElementById('paper');
    if (!paper) return;
    if (zoom.fit) {
      var avail = paper.parentNode.clientWidth;
      zoom.value = Math.max(0.3, Math.min(1, avail / PAGE_W));
    }
    // 用 zoom 而非 transform：transform 不改变布局尺寸，缩放后仍会撑出滚动条
    paper.style.setProperty('--zoom', String(zoom.value));
    $('#zoomVal').text(Math.round(zoom.value * 100) + '%');
  }

  function renderPaper() {
    var html = CN.paper.build(items, cfg, { answers: cfg.answers, labels: paperLabels() });
    $('#paper').html(html);
    applyZoom();
  }

  function regenerate() {
    if (!bank) {
      $('#status').addClass('warn').text(tt().noBank);
      return;
    }
    var res = CN.engine.generate(cfg, bank);
    items = res.items;
    lastStats = res.stats;
    renderPaper();
    renderStatus(res.stats);
    saveCfg();
  }

  function schedule(delay) {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(regenerate, delay == null ? 90 : delay);
  }

  /* ---------------- 事件 ---------------- */

  // 键的类型必须显式声明：数字键不能塞字符串，字符串键更不能套 Number()
  var NUM_MULTI = { grades: 1, stars: 1 };
  var TEXT_MULTI = { types: 1 };
  var BOOL_KEYS = { header: 1, answers: 1 };
  var TEXT_KEYS = { curve: 1 };
  var NUM_KEYS = { count: 1, cols: 1, rows: 1, fontSize: 1 };

  function toggleValue(key, value, multi) {
    if (multi) {
      var numeric = !!NUM_MULTI[key];
      var v = numeric ? Number(value) : value;
      var list = cfg[key].slice();
      var pos = list.indexOf(v);
      if (pos >= 0) list.splice(pos, 1);
      else list.push(v);
      if (!list.length) return;
      if (numeric) list.sort(function (a, b) { return a - b; });
      cfg[key] = list;
      return;
    }
    if (BOOL_KEYS[key]) {
      cfg[key] = value === 'true';
    } else if (TEXT_KEYS[key]) {
      cfg[key] = value;
    } else {
      cfg[key] = Number(value);
    }
  }

  function bind() {
    $('.chip[data-key]').on('click', function () {
      var $chip = $(this);
      if ($chip.attr('data-disabled') === 'true') return;
      var key = $chip.attr('data-key');
      var multi = $chip.attr('data-multi') === 'true';
      var value = $chip.attr('data-value');
      toggleValue(key, value, multi);
      syncChips();
      schedule();
    });

    $('#seedInput').on('input', function () {
      cfg.seed = $(this).val() || '';
      schedule(220);
    });

    $('#countInput').on('input', function () {
      var v = parseInt($(this).val(), 10);
      if (isNaN(v)) return;
      cfg.count = Math.max(1, Math.min(200, v));
      schedule(220);
    });

    $('#countPresets').on('click', '.chip', function () {
      cfg.count = parseInt($(this).attr('data-count'), 10);
      syncInputs();
      regenerate();
    });

    $('#seedRandom').on('click', function () {
      cfg.seed = CN.randomSeed();
      syncInputs();
      regenerate();
    });

    $('#seedCopy').on('click', function () {
      var text = cfg.seed;
      var done = function (ok) {
        $('#status').removeClass('warn').text(ok ? tt().seedCopied : tt().seedFail);
      };
      if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
        window.navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        $('#seedInput').trigger('select');
        done(false);
      }
    });

    $('#resetBtn').on('click', function () {
      cfg = clone(DEFAULTS);
      syncAll();
      regenerate();
    });

    $('#printBtn').on('click', function () { window.print(); });

    $('#zoomIn').on('click', function () {
      zoom.fit = false;
      zoom.value = Math.min(2, zoom.value + 0.1);
      applyZoom();
    });

    $('#zoomOut').on('click', function () {
      zoom.fit = false;
      zoom.value = Math.max(0.3, zoom.value - 0.1);
      applyZoom();
    });

    $('#zoomFit').on('click', function () {
      zoom.fit = true;
      applyZoom();
    });

    $('#zoomVal').on('click', function () {
      zoom.fit = true;
      zoom.value = 1;
      applyZoom();
    });

    $(window).on('resize', function () {
      if (zoom.fit) applyZoom();
    });

    $(document).on('site:lang', function () {
      renderPaper();
      renderStatus(lastStats);
    });
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    if (window.SiteShell && window.SiteShell.extendI18N) window.SiteShell.extendI18N(I18N_EXT);

    bank = CN.parseBank(window.CN_BANK_TEXT || '');
    cfg = loadCfg();
    syncAll();
    bind();
    regenerate();
  }

  // 供自检页复用
  window.CNApp = {
    get cfg() { return cfg; },
    get bank() { return bank; },
    get items() { return items; },
    keyTypes: {
      numericMulti: NUM_MULTI,
      textMulti: TEXT_MULTI,
      bool: BOOL_KEYS,
      text: TEXT_KEYS,
      number: NUM_KEYS
    },
    regenerate: regenerate
  };

  $(init);
})(window, document, window.jQuery);
