/* ==========================================================================
   语文出题 · 排版层（纯字符串拼装，不碰 DOM）
   ========================================================================== */
(function (window) {
  'use strict';

  var CN = window.CN = window.CN || {};
  var esc = CN.escape;

  function cells(count, fill) {
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<i class="cell">' + (fill ? esc(fill.charAt(i) || '') : '') + '</i>';
    }
    return '<span class="cells">' + html + '</span>';
  }

  function bodyHtml(q, answers) {
    switch (q.kind) {
      case 'write':
        if (answers) return '<span class="py">' + esc(q.stem) + '</span>' + cells(q.cells, q.answer);
        return '<span class="py">' + esc(q.stem) + '</span>' + cells(q.cells, '');

      case 'pinyin':
        return '<span class="zi">' + esc(q.stem) + '</span>' +
          (answers ? '<span class="ans">' + esc(q.answer) + '</span>' : '<span class="line"></span>');

      case 'choice': {
        var opts = q.options.map(function (o, i) {
          return '<span class="opt"><em>' + 'ABC'.charAt(i) + '</em>' + esc(o) + '</span>';
        }).join('');
        return '<span class="word">' + esc(q.stem) + '</span><span class="opts">' + opts + '</span>' +
          (answers ? '<span class="ans">' + esc(q.answer) + '</span>' : '');
      }

      case 'word':
        return '<span class="zi">' + esc(q.stem) + '</span>' +
          (answers ? '<span class="ans">' + esc(q.answer) + '</span>' : cells(q.cells, ''));

      default:
        return esc(String(q.stem || ''));
    }
  }

  function pageHtml(chunk, cfg, pageIndex, totalPages, answers, labels, withAnswers) {
    var head = [
      '<div class="page-head">',
      '  <h2>' + esc(labels.title) + (withAnswers ? '<span class="badge">' + esc(labels.answerTag) + '</span>' : '') + '</h2>',
      '  <div class="meta">',
      labels.meta.map(function (m) { return '<span class="meta-item">' + esc(m) + '</span>'; }).join(''),
      '  </div>',
      '</div>'
    ].join('\n');

    var rows = chunk.map(function (q) {
      return '<div class="q q-' + q.kind + '">' +
        '<span class="no">' + q.no + '.</span>' +
        '<span class="body">' + bodyHtml(q, answers) + '</span>' +
        '</div>';
    }).join('\n');

    var foot = '<div class="page-foot">' + esc(labels.page(pageIndex + 1, totalPages)) + '</div>';

    return '<section class="page" style="--cols:' + cfg.cols + ';--qfs:' + cfg.fontSize + 'px">' +
      (cfg.header ? head : '') +
      '<div class="grid">' + rows + '</div>' +
      foot + '</section>';
  }

  CN.paper = {
    /** 把题目切成每页一屏，返回 #paper 的完整 HTML */
    build: function (items, cfg, opts) {
      opts = opts || {};
      var perPage = Math.max(1, cfg.cols * cfg.rows);
      var chunks = [];
      for (var i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

      var html = '';

      chunks.forEach(function (chunk, index) {
        html += pageHtml(chunk, cfg, index, chunks.length, false, opts.labels, false);
      });

      if (opts.answers) {
        chunks.forEach(function (chunk, index) {
          html += pageHtml(chunk, cfg, index, chunks.length, true, opts.labels, true);
        });
      }

      return html;
    },
    perPage: function (cfg) {
      return Math.max(1, cfg.cols * cfg.rows);
    }
  };
})(window);
