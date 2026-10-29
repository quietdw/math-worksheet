/* ==========================================================================
   站点外壳模块（jQuery）
   - 负责注入通用页头 / 页尾，是站点导航、GitHub 入口、主题、界面语言的唯一来源
   - DOM 查询、文本刷新、事件绑定统一走 jQuery；只有 MediaQueryList 与自定义事件派发用原生 API
   - 对其他模块只暴露 window.SiteShell 与两个 DOM 事件：site:lang / site:theme
   - 学科页面自身的出题逻辑不依赖本模块，可以单独存在
   ========================================================================== */
(function (window, document, $) {
  'use strict';

  if (!$) {
    if (window.console) window.console.error('[SiteShell] jQuery 未加载，页头 / 页尾无法渲染。');
    return;
  }


  var LANG_KEY = 'mathgen.lang.v1';
  var THEME_KEY = 'mathgen.theme.v1';
  var REPO_URL = 'https://github.com/quietdw/primary-worksheet';

  var I18N = {
    zh: {
      siteTitle: '小学练习题生成器',
      siteTagline: '数学 · 语文 · 英语 练习卷',
      navMath: '数学',
      navChinese: '语文',
      navEnglish: '英语',
      pending: '建设中',
      repoTitle: '在 GitHub 查看源码',
      themeToDark: '切换到深色模式',
      themeToLight: '切换到浅色模式',
      footerRepo: '源码仓库',
      footerNote: '练习卷在浏览器本地生成，不上传任何数据'
    },
    en: {
      siteTitle: 'Primary Worksheet',
      siteTagline: 'Math · Chinese · English worksheets',
      navMath: 'Math',
      navChinese: 'Chinese',
      navEnglish: 'English',
      pending: 'Soon',
      repoTitle: 'View source on GitHub',
      themeToDark: 'Switch to dark mode',
      themeToLight: 'Switch to light mode',
      footerRepo: 'Repository',
      footerNote: 'All worksheets are generated locally in your browser.'
    }
  };

  var HEADER_HTML = [
    '<header class="site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-brand" href="./">',
    '      <span class="site-brand-mark" aria-hidden="true">练</span>',
    '      <span class="site-brand-text">',
    '        <strong data-shell="siteTitle"></strong>',
    '        <small data-shell="siteTagline"></small>',
    '      </span>',
    '    </a>',
    '    <nav class="site-nav" aria-label="学科">',
    '      <a href="math-practice-generator.html" data-page="math"><span data-shell="navMath"></span></a>',
    '      <a href="chinese-practice-generator.html" data-page="chinese"><span data-shell="navChinese"></span></a>',
    '      <a href="english-practice-generator.html" data-page="english"><span data-shell="navEnglish"></span></a>',
    '    </nav>',
    '    <div class="site-tools">',
    '      <a class="icon-btn" id="siteRepoLink" href="' + REPO_URL + '" target="_blank" rel="noopener">',
    '        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    '      </a>',
    '      <button type="button" class="icon-btn" id="siteThemeBtn">',
    '        <svg class="icon-moon" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.2 1.2a6.8 6.8 0 0 0 8.6 8.6A6.8 6.8 0 1 1 6.2 1.2Z"/></svg>',
    '        <svg class="icon-sun" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.6a.9.9 0 0 1-.9-.9V1.4a.9.9 0 0 1 1.8 0v1.3a.9.9 0 0 1-.9.9Zm0 11a.9.9 0 0 1-.9-.9v-1.3a.9.9 0 0 1 1.8 0v1.3a.9.9 0 0 1-.9.9ZM3.6 8a.9.9 0 0 1-.9.9H1.4a.9.9 0 0 1 0-1.8h1.3a.9.9 0 0 1 .9.9Zm11 0a.9.9 0 0 1-.9.9h-1.3a.9.9 0 0 1 0-1.8h1.3a.9.9 0 0 1 .9.9ZM4.7 4.7a.9.9 0 0 1-.6-.3L3.1 3.4a.9.9 0 0 1 1.3-1.3l1 1a.9.9 0 0 1-.7 1.6Zm7.5 7.5a.9.9 0 0 1-.6-.3l-1-1a.9.9 0 0 1 1.3-1.3l1 1a.9.9 0 0 1-.7 1.6ZM4.7 11.3a.9.9 0 0 1 .7 1.6l-1 1a.9.9 0 0 1-1.3-1.3l1-1a.9.9 0 0 1 .6-.3Zm7.5-7.5a.9.9 0 0 1 .7 1.6l-1 1a.9.9 0 0 1-1.3-1.3l1-1a.9.9 0 0 1 .6-.3ZM8 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"/></svg>',
    '      </button>',
    '      <div class="lang-switch" id="siteLangSwitch" role="group" aria-label="Language">',
    '        <button type="button" data-lang="zh">中文</button>',
    '        <button type="button" data-lang="en">EN</button>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</header>'
  ].join('\n');

  var FOOTER_HTML = [
    '<footer class="site-footer">',
    '  <div class="site-footer-inner">',
    '    <span>MIT License</span>',
    '    <a href="' + REPO_URL + '" target="_blank" rel="noopener" data-shell="footerRepo"></a>',
    '    <span data-shell="footerNote"></span>',
    '    <span class="site-footer-copy">© 2026 quietdw</span>',
    '  </div>',
    '</footer>'
  ].join('\n');

  var state = { lang: 'zh', theme: 'light' };

  function t(key) {
    var pack = I18N[state.lang] || I18N.zh;
    if (pack[key] !== undefined) return pack[key];
    return I18N.zh[key] !== undefined ? I18N.zh[key] : key;
  }

  function detectLang() {
    var fromUrl = null;
    try {
      fromUrl = new URLSearchParams(window.location.search).get('lang');
    } catch (e) { /* 老浏览器忽略 */ }
    if (fromUrl === 'zh' || fromUrl === 'en') return fromUrl;

    var saved = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch (e) { /* 忽略 */ }
    if (saved === 'zh' || saved === 'en') return saved;

    var nav = (window.navigator.language || window.navigator.userLanguage || '').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : (nav ? 'en' : 'zh');
  }

  function detectTheme() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(THEME_KEY);
    } catch (e) { /* 忽略 */ }
    if (saved === 'dark' || saved === 'light') return saved;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    return mq && mq.matches ? 'dark' : 'light';
  }

  // 用原生 CustomEvent 派发：jQuery 的 $(document).on 与原生 addEventListener 都能收到
  function emit(name, detail) {
    var evt;
    try {
      evt = new CustomEvent(name, { detail: detail });
    } catch (e) {
      evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(name, false, false, detail);
    }
    document.dispatchEvent(evt);
  }

  function syncLabels() {
    $('[data-shell]').each(function () {
      var el = $(this);
      var key = el.attr('data-shell');
      if (key) el.text(t(key));
    });

    $('.site-nav a[data-pending] .nav-tag').text(t('pending'));

    var repoLabel = t('repoTitle');
    $('#siteRepoLink').attr({ title: repoLabel, 'aria-label': repoLabel });

    $('#siteLangSwitch button').each(function () {
      var btn = $(this);
      btn.toggleClass('active', btn.attr('data-lang') === state.lang);
    });

    syncThemeButton();
  }

  function syncThemeButton() {
    var btn = $('#siteThemeBtn');
    if (!btn.length) return;
    var label = t(state.theme === 'dark' ? 'themeToLight' : 'themeToDark');
    btn.attr({
      title: label,
      'aria-label': label,
      'aria-pressed': state.theme === 'dark' ? 'true' : 'false'
    });
    $('meta[name="theme-color"]').attr('content', state.theme === 'dark' ? '#0e1116' : '#2563eb');
  }

  function setTheme(next, persist) {
    state.theme = next === 'dark' ? 'dark' : 'light';
    if (state.theme === 'dark') $('html').attr('data-theme', 'dark');
    else $('html').removeAttr('data-theme');

    if (persist !== false) {
      try {
        window.localStorage.setItem(THEME_KEY, state.theme);
      } catch (e) { /* 忽略 */ }
    }
    syncThemeButton();
    emit('site:theme', { theme: state.theme });
  }

  function toggleTheme() {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function setLang(next) {
    state.lang = next === 'en' ? 'en' : 'zh';
    try {
      window.localStorage.setItem(LANG_KEY, state.lang);
    } catch (e) { /* 忽略 */ }
    $('html').attr('lang', state.lang === 'zh' ? 'zh-CN' : 'en');
    syncLabels();
    emit('site:lang', { lang: state.lang });
  }

  /**
   * 页面级文案注入：各页面把自己的中英文文案追加进 shell 的词典，
   * 正文元素用 data-shell="key" 标记，切语言时由 syncLabels 统一刷新。
   */
  function extendI18N(dict) {
    if (!dict) return;
    ['zh', 'en'].forEach(function (loc) {
      if (!dict[loc]) return;
      for (var key in dict[loc]) {
        if (Object.prototype.hasOwnProperty.call(dict[loc], key)) I18N[loc][key] = dict[loc][key];
      }
    });
    syncLabels();
  }

  function markActive() {
    var page = $('body').attr('data-page');
    if (!page) return;
    $('.site-nav a[data-page]').each(function () {
      var link = $(this);
      if (link.attr('data-page') === page) link.attr('aria-current', 'page');
      else link.removeAttr('aria-current');
    });
  }

  function mount() {
    $('#site-header').html(HEADER_HTML);
    $('#site-footer').html(FOOTER_HTML);

    // 未开放学科在导航里挂「建设中」标记，避免用户以为能直接做题
    var pendingMap = { english: 1 };
    $('.site-nav a[data-page]').each(function () {
      var link = $(this);
      if (!pendingMap[link.attr('data-page')]) return;
      link.attr('data-pending', '').append($('<span class="nav-tag"></span>').text(t('pending')));
    });

    markActive();

    state.lang = detectLang();
    state.theme = $('html').attr('data-theme') === 'dark' ? 'dark' : detectTheme();
    $('html').attr('lang', state.lang === 'zh' ? 'zh-CN' : 'en');
    syncLabels();

    $('#siteThemeBtn').on('click', toggleTheme);
    $('#siteLangSwitch').on('click', 'button[data-lang]', function () {
      var next = $(this).attr('data-lang');
      if (next !== state.lang) setLang(next);
    });

    // MediaQueryList 不是 DOM 节点，jQuery 无法直接绑定，这里用原生订阅并兼容旧 API
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onSchemeChange = function (e) {
        var saved = null;
        try {
          saved = window.localStorage.getItem(THEME_KEY);
        } catch (err) { /* 忽略 */ }
        if (saved !== 'dark' && saved !== 'light') setTheme(e.matches ? 'dark' : 'light', false);
      };
      if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
      else if (mq.addListener) mq.addListener(onSchemeChange);
    }
  }

  window.SiteShell = {
    get lang() { return state.lang; },
    get theme() { return state.theme; },
    setLang: setLang,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    extendI18N: extendI18N,
    t: t
  };

  $(mount);
})(window, document, jQuery);
