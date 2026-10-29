/* ==========================================================================
   语文出题 · 基础层（纯函数，不碰 DOM）
   - 题库解析与索引
   - 拼音拆解（字母 / 声调 / 难点特征）
   - 难度打分与五星分桶
   - 可复现随机数（mulberry32）
   ========================================================================== */
(function (window) {
  'use strict';

  var CN = window.CN = window.CN || {};

  /* ---------------- 可复现随机 ---------------- */

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  CN.rng = function (seed) {
    return mulberry32(hashSeed(String(seed == null ? '' : seed)));
  };

  CN.randomSeed = function () {
    return String(Math.floor(Math.random() * 900000) + 100000);
  };

  /* ---------------- 拼音工具 ---------------- */

  var ACCENT = {
    'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
    'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
    'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
    'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
    'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
    'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4],
    'ü': ['v', 0], 'ń': ['n', 2], 'ň': ['n', 3], 'ǹ': ['n', 4]
  };

  function analyze(py) {
    var base = '';
    var tone = 0;
    for (var i = 0; i < py.length; i++) {
      var ch = py.charAt(i);
      var hit = ACCENT[ch];
      if (hit) {
        base += hit[0];
        if (hit[1]) tone = hit[1];
      } else {
        base += ch;
      }
    }
    return { base: base, tone: tone };
  }

  /**
   * 拼音难点特征：直接由音节推导，不靠人工标注。
   * 每个特征 +0.5 分，单字上限 2 分（见 scoreChar）。
   */
  function traits(py) {
    var b = analyze(py).base;
    var list = [];
    if (/^(zh|ch|sh)/.test(b) || b.charAt(0) === 'r') list.push('retroflex');
    else if (/^[zcs]/.test(b)) list.push('sibilant');
    if (/ng$/.test(b)) list.push('backNasal');
    else if (/n$/.test(b)) list.push('frontNasal');
    if (b.indexOf('v') >= 0) list.push('umlaut');
    if (/^[aoe]/.test(b)) list.push('zeroInitial');
    if (b.length >= 5) list.push('longFinal');
    return list;
  }

  CN.pinyin = {
    analyze: analyze,
    traits: traits,
    base: function (py) { return analyze(py).base; },
    tone: function (py) { return analyze(py).tone; }
  };

  /* ---------------- 难度打分 ---------------- */

  function strokeBucket(n) {
    if (!n) return 1;
    if (n <= 6) return 0;
    if (n <= 9) return 1;
    if (n <= 12) return 2;
    return 3;
  }

  /** 单字难度分：笔画 + 拼音难点 + 年级权重 */
  function scoreChar(entry) {
    var penalty = Math.min(2, traits(entry.p).length * 0.5);
    return strokeBucket(entry.s) * 1.0 + penalty + (entry.g - 1) * 1.2;
  }

  CN.scoreChar = scoreChar;

  /**
   * 依据分数分布切五档。返回值是一个 level(score) 函数（1–5）。
   * 用分位阈值而不是排名，同分的字会落在同一档。
   */
  CN.leveler = function (scores) {
    var sorted = scores.slice().sort(function (a, b) { return a - b; });
    var n = sorted.length;
    if (!n) return function () { return 1; };

    var cuts = [];
    for (var k = 1; k <= 4; k++) {
      var idx = Math.min(n - 1, Math.max(0, Math.floor(n * k / 5)));
      cuts.push(sorted[idx]);
    }
    return function (score) {
      var lv = 1;
      for (var i = 0; i < cuts.length; i++) if (score > cuts[i]) lv = i + 2;
      return Math.min(5, lv);
    };
  };

  /* ---------------- 题库解析 ---------------- */

  function parseLine(line) {
    var parts = line.split('|');
    if (parts.length < 4) return null;
    var c = parts[0];
    var p = parts[1];
    var s = parseInt(parts[2], 10);
    var g = parseInt(parts[3], 10);
    if (!c || !p || !g) return null;
    var words = (parts[4] || '').split(',').map(function (w) { return w.trim(); })
      .filter(function (w) { return w.length > 1; });
    return { c: c, p: p, s: isNaN(s) ? 0 : s, g: g, words: words };
  }

  /**
   * 解析题库文本，返回 { chars, byChar, words, stats }。
   * 词语若含字表外的字会被丢弃（拼音无法推导），数量记在 stats.droppedWords。
   */
  CN.parseBank = function (text) {
    var chars = [];
    var byChar = {};
    var seen = {};
    var lines = String(text || '').split(/\r?\n/);

    lines.forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === '#') return;
      var entry = parseLine(line);
      if (!entry) return;
      if (seen[entry.c]) return;
      seen[entry.c] = 1;
      entry.base = analyze(entry.p).base;
      entry.score = scoreChar(entry);
      chars.push(entry);
      byChar[entry.c] = entry;
    });

    var words = [];
    var wordSeen = {};
    var dropped = 0;

    chars.forEach(function (entry) {
      entry.words.forEach(function (text) {
        if (wordSeen[text]) return;
        var charsOfWord = text.split('');
        var ok = charsOfWord.every(function (c) { return !!byChar[c]; });
        if (!ok) { dropped++; return; }
        wordSeen[text] = 1;
        words.push({
          text: text,
          chars: charsOfWord,
          pinyin: charsOfWord.map(function (c) { return byChar[c].p; }).join(' '),
          grade: charsOfWord.reduce(function (min, c) {
            return Math.min(min, byChar[c].g);
          }, 9)
        });
      });
    });

    return {
      chars: chars,
      byChar: byChar,
      words: words,
      stats: { chars: chars.length, words: words.length, droppedWords: dropped }
    };
  };

  /* ---------------- 通用小工具 ---------------- */

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  CN.escape = function (str) {
    return String(str).replace(/[&<>"']/g, function (ch) { return ESC[ch]; });
  };

  /** Fisher–Yates，用注入的 rng 保证可复现 */
  CN.shuffle = function (list, rng) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  };

  CN.pick = function (list, rng) {
    if (!list || !list.length) return null;
    return list[Math.floor(rng() * list.length)];
  };
})(window);
