/* ==========================================================================
   语文出题 · 题型层
   - 每个题型是一个注册项：星级范围、可用条件、单元构造、题目构造、校验
   - 单元（unit）在题库加载后一次性建好，带难度分；星级由引擎按当前池分桶
   ========================================================================== */
(function (window) {
  'use strict';

  var CN = window.CN = window.CN || {};

  function avgScore(chars) {
    var sum = 0;
    chars.forEach(function (c) { sum += c.score; });
    return sum / chars.length;
  }

  function gradesOf(chars) {
    var out = [];
    chars.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    return out;
  }

  /* ---------------- 同音字候选 ---------------- */

  function buildHomophoneIndex(bank) {
    var groups = {};
    bank.chars.forEach(function (entry) {
      var base = entry.base;
      if (!groups[base]) groups[base] = [];
      groups[base].push(entry);
    });
    return groups;
  }

  function distractorsFor(word, correct, groups) {
    var base = correct.base;
    var pool = groups[base] || [];
    var inWord = {};
    word.chars.forEach(function (c) { inWord[c] = 1; });

    return pool.filter(function (entry) {
      if (entry.c === correct.c) return false;
      if (inWord[entry.c]) return false;
      if (Math.abs(entry.g - correct.g) > 1) return false;
      // 干扰字若能独立组成同一个词，题意会出现两个正确解
      if (entry.words.indexOf(word.text) >= 0) return false;
      return true;
    }).map(function (entry) { return entry.c; });
  }

  /* ---------------- 单元构造 ---------------- */

  function buildUnits(bank) {
    var groups = buildHomophoneIndex(bank);
    var units = { pinyin2word: [], char2pinyin: [], homophone: [], wordBuild: [] };

    bank.chars.forEach(function (entry) {
      units.char2pinyin.push({
        key: 'c:' + entry.c,
        score: entry.score,
        chars: [entry.c],
        grades: [entry.g],
        grade: entry.g,
        data: { entry: entry }
      });

      if (entry.words.length) {
        units.wordBuild.push({
          key: 'b:' + entry.c,
          score: entry.score + 0.4,
          chars: [entry.c],
          grades: [entry.g],
          grade: entry.g,
          data: { entry: entry }
        });
      }
    });

    bank.words.forEach(function (word) {
      var chars = word.chars.map(function (c) { return bank.byChar[c]; });
      var grades = gradesOf(chars.map(function (e) { return e.g; }));

      if (word.chars.length >= 2 && word.chars.length <= 3) {
        units.pinyin2word.push({
          key: 'w:' + word.text,
          score: avgScore(chars) + 0.6 * (word.chars.length - 2),
          chars: word.chars,
          grades: grades,
          grade: word.grade,
          data: { word: word }
        });
      }

      word.chars.forEach(function (c, pos) {
        var correct = bank.byChar[c];
        var list = distractorsFor(word, correct, groups);
        if (list.length < 2) return;
        units.homophone.push({
          key: 'h:' + word.text + ':' + pos,
          score: avgScore(chars) + 0.8,
          chars: word.chars,
          grades: grades,
          grade: word.grade,
          data: { word: word, pos: pos, candidates: list }
        });
      });
    });

    return units;
  }

  /* ---------------- 题型定义 ---------------- */

  var LIST = [
    {
      key: 'pinyin2word',
      label: { zh: '看拼音写词语', en: 'Pinyin to word' },
      stars: [1, 2],
      hint: { zh: '给拼音，写词语', en: 'Write the word from its pinyin' },
      build: function (unit) {
        var word = unit.data.word;
        return {
          kind: 'write',
          stem: word.pinyin,
          answer: word.text,
          cells: word.chars.length
        };
      },
      check: function (q) {
        return !!q.answer && q.answer.length >= 2 && q.cells >= 2;
      }
    },
    {
      key: 'char2pinyin',
      label: { zh: '生字注音', en: 'Character to pinyin' },
      stars: [1, 2],
      hint: { zh: '给汉字，写拼音', en: 'Write the pinyin for the character' },
      build: function (unit) {
        return {
          kind: 'pinyin',
          stem: unit.data.entry.c,
          answer: unit.data.entry.p,
          cells: 0
        };
      },
      check: function (q) {
        return !!q.answer && q.stem.length === 1;
      }
    },
    {
      key: 'homophone',
      label: { zh: '同音字选字', en: 'Homophone choice' },
      stars: [2, 3],
      hint: { zh: '选正确的字填空', en: 'Choose the right character' },
      build: function (unit, rng) {
        var word = unit.data.word;
        var pos = unit.data.pos;
        var answer = word.chars[pos];
        var options = CN.shuffle([answer].concat(
          CN.shuffle(unit.data.candidates, rng).slice(0, 2)
        ), rng);
        var stem = word.chars.map(function (c, i) {
          return i === pos ? '（　）' : c;
        }).join('');
        return {
          kind: 'choice',
          stem: stem,
          answer: answer,
          options: options
        };
      },
      check: function (q) {
        if (!q.answer || q.options.length !== 3) return false;
        var hit = q.options.filter(function (o) { return o === q.answer; });
        return hit.length === 1;
      }
    },
    {
      key: 'wordBuild',
      label: { zh: '组词', en: 'Word building' },
      stars: [2, 3],
      hint: { zh: '给汉字，组词语', en: 'Make words with the character' },
      build: function (unit, rng) {
        var entry = unit.data.entry;
        var answer = CN.pick(entry.words, rng) || entry.words[0];
        return {
          kind: 'word',
          stem: entry.c,
          answer: answer,
          cells: 2
        };
      },
      check: function (q) {
        return !!q.answer && q.answer.length >= 2 && q.stem.length === 1;
      }
    }
  ];

  CN.types = {
    list: LIST,
    map: LIST.reduce(function (acc, t) { acc[t.key] = t; return acc; }, {}),
    buildUnits: function (bank) {
      if (!CN.types._units) CN.types._units = buildUnits(bank);
      return CN.types._units;
    },
    reset: function () { CN.types._units = null; }
  };
})(window);
