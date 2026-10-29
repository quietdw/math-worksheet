/* ==========================================================================
   语文练习页 · 页内自检
   用法：chinese-practice-generator.html?selftest=1
   跑 200 个种子，检查重复、答案唯一、星级分布与题库覆盖，结果写在预览区。
   仓库无测试框架，这里是唯一的回归入口。
   ========================================================================== */
(function (window, document, $) {
  'use strict';

  var CN = window.CN;
  if (!$ || !CN) return;

  var SEEDS = 200;

  function checkAnswer(item) {
    if (!item.answer) return 'empty-answer';
    if (item.kind === 'choice') {
      if (!item.options || item.options.length !== 3) return 'bad-options';
      var hit = item.options.filter(function (o) { return o === item.answer; }).length;
      if (hit !== 1) return 'ambiguous-options';
    }
    if (item.kind === 'write' && item.cells !== item.answer.length) return 'cell-mismatch';
    return null;
  }

  function run() {
    var bank = CN.parseBank(window.CN_BANK_TEXT || '');
    // 固定配置，不受用户面板设置与本地偏好影响，保证回归结果可比
    var base = {
      grades: [1, 2, 3, 4, 5, 6],
      types: ['pinyin2word', 'char2pinyin', 'homophone', 'wordBuild'],
      stars: [1, 2, 3], count: 20, curve: 'mixed', cols: 2, rows: 10, fontSize: 16,
      header: true, answers: false
    };

    var units = CN.types.buildUnits(bank);
    var unitRows = [
      ['看拼音写词语', units.pinyin2word.length],
      ['生字注音', units.char2pinyin.length],
      ['同音字选字', units.homophone.length],
      ['组词', units.wordBuild.length]
    ];

    var problems = 0;
    var duplicate = 0;
    var answerBad = 0;
    var generated = 0;
    var requested = 0;
    var levelHit = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var reused = 0;
    var degraded = 0;

    for (var i = 0; i < SEEDS; i++) {
      var cfg = JSON.parse(JSON.stringify(base));
      cfg.seed = 'st-' + i;
      var res = CN.engine.generate(cfg, bank);
      requested += cfg.count;
      generated += res.items.length;
      reused += res.stats.reused || 0;
      degraded += res.stats.degraded || 0;

      var seen = {};
      res.items.forEach(function (item) {
        if (seen[item.key]) duplicate++;
        seen[item.key] = 1;
        var bad = checkAnswer(item);
        if (bad) { answerBad++; if (problems < 5) problems++; }
        levelHit[item.level] = (levelHit[item.level] || 0) + 1;
      });
    }

    var pct = function (n) { return generated ? Math.round(n / generated * 1000) / 10 + '%' : '0%'; };

    // 可复现性：同一 seed 连跑两次，题目与答案顺序必须完全一致
    var cfgA = JSON.parse(JSON.stringify(base));
    cfgA.seed = 'det-check';
    var cfgB = JSON.parse(JSON.stringify(base));
    cfgB.seed = 'det-check';
    var detA = CN.engine.generate(cfgA, bank);
    var detB = CN.engine.generate(cfgB, bank);
    var signature = function (res) {
      return res.items.map(function (q) { return q.key + '>' + q.answer; }).join('|');
    };
    var deterministic = signature(detA) === signature(detB);

    // 面板键类型声明：每个 chip 的 key 必须落在数字/布尔/文本四类里之一，
    // 否则 toggleValue 会把值写成 NaN（历史上导致「点了没反应」）
    var keyTypes = (window.CNApp && window.CNApp.keyTypes) || {};
    var declared = {};
    ['numericMulti', 'textMulti', 'bool', 'text', 'number'].forEach(function (group) {
      var map = keyTypes[group] || {};
      Object.keys(map).forEach(function (k) { declared[k] = group; });
    });
    var undeclared = [];
    $('.chip[data-key]').each(function () {
      var key = $(this).attr('data-key');
      if (!declared[key] && undeclared.indexOf(key) < 0) undeclared.push(key);
    });
    var typeOk = function (key, group) {
      var v = base[key];
      if (group === 'numericMulti' || group === 'textMulti') return Array.isArray(v);
      if (group === 'bool') return typeof v === 'boolean';
      if (group === 'number') return typeof v === 'number';
      return typeof v === 'string';
    };
    var mistyped = [];
    Object.keys(declared).forEach(function (k) {
      if (base[k] === undefined) return;
      if (!typeOk(k, declared[k])) mistyped.push(k);
    });

    var html = [
      '<section class="page" style="--cols:1;--qfs:14px">',
      '<div class="page-head"><h2>语文练习页自检</h2></div>',
      '<div class="st-wrap">',
      '<table class="st">',
      '<tr><th>项目</th><th>结果</th></tr>',
      '<tr><td>题库字数 / 词语数</td><td>' + bank.stats.chars + ' 字 / ' + bank.stats.words + ' 词（丢弃 ' + bank.stats.droppedWords + ' 词）</td></tr>',
      '<tr><td>种子数 × 每卷题量</td><td>' + SEEDS + ' × ' + base.count + '</td></tr>',
      '<tr><td>实际出题 / 期望</td><td>' + generated + ' / ' + requested + '</td></tr>',
      '<tr><td>卷内重复</td><td>' + duplicate + '</td></tr>',
      '<tr><td>答案异常</td><td>' + answerBad + '</td></tr>',
      '<tr><td>同 seed 可复现</td><td>' + (deterministic ? '通过' : '失败') + '</td></tr>',
      '<tr><td>面板键类型声明</td><td>' + ((undeclared.length || mistyped.length)
        ? '异常：' + undeclared.concat(mistyped).join('、')
        : '通过（' + Object.keys(declared).length + ' 个键）') + '</td></tr>',
      '<tr><td>降级题数</td><td>' + degraded + '</td></tr>',
      '<tr><td>复用题数</td><td>' + reused + '</td></tr>',
      '<tr><td>星级分布 ★1–★5</td><td>' + [1, 2, 3, 4, 5].map(function (k) {
        return '★' + k + ' ' + pct(levelHit[k] || 0);
      }).join('　') + '</td></tr>',
      '</table>',
      '<table class="st">',
      '<tr><th>题型</th><th>可用单元</th></tr>',
      unitRows.map(function (row) {
        return '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td></tr>';
      }).join(''),
      '</table>',
      '<p class="st-note">判读：重复与答案异常应为 0；单元数少于 60 的题型在实际使用中容易复题，需要补库。</p>',
      '</div></section>'
    ].join('');

    $('#status').removeClass('warn').text('自检完成：' + SEEDS + ' 个种子');
    var paper = document.getElementById('paper');
    if (paper) paper.style.setProperty('--zoom', '1');
    $(paper).html(html);
  }

  $(function () {
    var query = window.location.search || '';
    if (query.indexOf('selftest=1') < 0) return;
    window.setTimeout(run, 0);
  });
})(window, document, window.jQuery);
