/* ==========================================================================
   语文出题 · 引擎层（纯函数，不碰 DOM）
   输入配置 → 输出题目数组，同 seed + 同配置可复现。
   ========================================================================== */
(function (window) {
  'use strict';

  var CN = window.CN = window.CN || {};

  var STAR_MIN = 1;
  var STAR_MAX = 5;

  function levelsAround(target) {
    var out = [target];
    for (var d = 1; d <= STAR_MAX; d++) {
      if (target - d >= STAR_MIN) out.push(target - d);
      if (target + d <= STAR_MAX) out.push(target + d);
    }
    return out;
  }

  function intersect(a, b) {
    return a.filter(function (x) { return b.indexOf(x) >= 0; });
  }

  /** 按曲线给出每题的目标星级（1–5） */
  function buildTargets(count, allowed, curve, rng) {
    var out = [];
    if (!allowed.length || count <= 0) return out;
    var i;

    if (curve === 'asc') {
      for (i = 0; i < count; i++) {
        var p = count === 1 ? 1 : i / (count - 1);
        var idx = Math.min(allowed.length - 1, Math.floor(p * allowed.length));
        out.push(allowed[idx]);
      }
      return out;
    }

    if (curve === 'even') {
      for (i = 0; i < count; i++) out.push(allowed[Math.floor(rng() * allowed.length)]);
      return out;
    }

    // mixed：基础 60% + 提升 30% + 挑战 10%
    var low = allowed[0];
    var high = allowed[allowed.length - 1];
    var mid = allowed.length > 1 ? allowed[allowed.length - 2] : low;
    var nHigh = allowed.length > 1 ? Math.round(count * 0.1) : 0;
    var nLow = Math.round(count * 0.6);
    var nMid = count - nLow - nHigh;
    for (i = 0; i < nLow; i++) out.push(low);
    for (i = 0; i < nMid; i++) out.push(mid);
    for (i = 0; i < nHigh; i++) out.push(high);
    return out;
  }

  function unitVisible(unit, grades) {
    return unit.grades.every(function (g) { return grades.indexOf(g) >= 0; });
  }

  function overlaps(unit, usedChars) {
    return unit.chars.some(function (c) { return usedChars[c]; });
  }

  function pickUnit(byLevel, target, allowed, usedKeys, usedChars, rng) {
    var around = levelsAround(target);
    var order = around.filter(function (l) { return allowed.indexOf(l) >= 0; })
      .concat(around.filter(function (l) { return allowed.indexOf(l) < 0; }));
    var i, list, pool;

    for (i = 0; i < order.length; i++) {
      pool = byLevel[order[i]] || [];
      list = pool.filter(function (u) {
        return !usedKeys[u.key] && !overlaps(u, usedChars);
      });
      if (list.length) return { unit: CN.pick(list, rng), level: order[i], clean: true };
    }
    for (i = 0; i < order.length; i++) {
      pool = byLevel[order[i]] || [];
      list = pool.filter(function (u) { return !usedKeys[u.key]; });
      if (list.length) return { unit: CN.pick(list, rng), level: order[i], clean: false };
    }
    for (i = 0; i < order.length; i++) {
      pool = byLevel[order[i]] || [];
      if (pool.length) return { unit: CN.pick(pool, rng), level: order[i], clean: false, reused: true };
    }
    return null;
  }

  /**
   * @param {Object} cfg { grades:[1..6], types:[key], stars:[1..5], count, curve, seed }
   * @param {Object} bank CN.parseBank 的结果
   */
  CN.engine = {
    generate: function (cfg, bank) {
      var units = CN.types.buildUnits(bank);
      var rng = CN.rng(cfg.seed);
      var stats = {
        reused: 0,
        degraded: 0,
        skipped: [],
        perType: {},
        levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      var active = [];
      var pools = {};

      cfg.types.forEach(function (key) {
        var type = CN.types.map[key];
        if (!type) return;
        var allowed = intersect(type.stars, cfg.stars);
        if (!allowed.length) { stats.skipped.push(key); return; }

        var list = (units[key] || []).filter(function (u) { return unitVisible(u, cfg.grades); });
        if (!list.length) { stats.skipped.push(key); return; }

        var leveler = CN.leveler(list.map(function (u) { return u.score; }));
        var byLevel = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        list.forEach(function (u) {
          u.level = leveler(u.score);
          byLevel[u.level].push(u);
        });

        pools[key] = byLevel;
        active.push({ key: key, type: type, allowed: allowed });
      });

      var items = [];
      if (!active.length) {
        return { items: items, stats: stats, error: 'no-type' };
      }

      var count = Math.max(1, Math.min(200, cfg.count || 20));
      var base = Math.floor(count / active.length);
      var rest = count % active.length;
      var usedKeys = {};
      var usedChars = {};

      active.forEach(function (slot, index) {
        var quota = base + (index < rest ? 1 : 0);
        var targets = buildTargets(quota, slot.allowed, cfg.curve, rng);
        var produced = 0;

        targets.forEach(function (target) {
          var hit = pickUnit(pools[slot.key], target, slot.allowed, usedKeys, usedChars, rng);
          if (!hit) return;

          var q = slot.type.build(hit.unit, rng);
          if (!q || !slot.type.check(q)) return;

          usedKeys[hit.unit.key] = 1;
          hit.unit.chars.forEach(function (c) { usedChars[c] = 1; });

          q.type = slot.key;
          q.level = hit.level;
          q.target = target;
          q.key = hit.unit.key;
          items.push(q);

          produced++;
          stats.levelCounts[hit.level] = (stats.levelCounts[hit.level] || 0) + 1;
          if (hit.reused) stats.reused++;
          if (hit.level !== target) stats.degraded++;
        });

        stats.perType[slot.key] = produced;
      });

      if (cfg.curve === 'even') {
        items = CN.shuffle(items, rng);
      } else {
        // 递增与混合都按星级升序，同星级内部打散，避免同类题扎堆
        var buckets = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        items.forEach(function (q) { buckets[q.level].push(q); });
        items = [];
        for (var lv = 1; lv <= 5; lv++) {
          if (buckets[lv].length) {
            items = items.concat(CN.shuffle(buckets[lv], rng));
          }
        }
      }

      items.forEach(function (q, i) { q.no = i + 1; });

      stats.requested = count;
      stats.generated = items.length;
      stats.shortage = count - items.length;
      return { items: items, stats: stats };
    }
  };
})(window);
