/* ═══════════════════════════════════════════════════════════
   亚克力材质 v3.4.0 设置面板
   ───────────────────────────────────────────────────────────
   分区四组（v3.4.0 起）：
     sb  侧栏    展开 + 收起 算同一组
     pl  播放栏  整条胶囊底板 + 板内那排按钮
     ct  内容区  所有页面
     add 新建条  侧栏底部「+」那根细线 / 悬停弹出的板
   每组四个旋钮：开关 / 颜色 / 浓度 / 磨砂。组内按面积固定派生，
   调一组的浓度整组等比一起变，不会再「这有那没有」。

   ★ 分区开关（v3.4.0）
     关掉一组的做法是摘掉 `<html>` 上的 `acr-z-<key>` 类，那一组的所有
     CSS 规则因为选择器前缀不命中而**整体失效** —— 元素 100% 回到 ECHO
     原生外观。不要改成「把浓度调成 0」那种写法：透明残留会留下
     backdrop-filter 的 saturate、box-shadow 的描边和 position:relative，
     看着像「关了一半」，是更早版本踩过的坑。

   ★ v3.0 起**不再接管 ECHO 的 --surface-* 变量**。
     v2.x 把三块大面板的底色/模糊/透明度全改了，等于把背景换掉；
     用户要求「不改背景，只改有互动按键的亚克力」，所以全部退回，
     材质只挂在能点、能拖、能输入的元素上。

   ★ v3.1 例外：播放栏整条底板回来了。
     v3.0 只给那排 30px 的图标键上板，backdrop-filter 在那么小的
     面积上糊不出东西，看着只剩一圈轮廓 —— 用户「太浅了，还原成
     上一版」。所以 pl 组恢复整条染色玻璃 + 磨砂，其余面板照旧
     交给 ECHO。pl 的默认值因此重置，见 ZONE_VER。

   ★ 变量用 documentElement.style.setProperty(..., 'important') 写。
     inline important 的优先级高于任何选择器，所以滑块必定生效 ——
     v1.x 用 <style> 注入 :root{}（特异性 0,1,0）打不过样式表的
     html.acr-on:is(...)（0,2,1），拖了没反应就是那次踩的坑。

   ★ 颜色不再采样。--acr-dye 的值是
       color-mix(in srgb, var(--color-primary) N%, white)
     直接交给浏览器算，主题色一变自动重算，不需要 MutationObserver。
     v1.x 用探针采样只算一次，换主题后不重算 —— 那就是「跟随不生效」。
   ═══════════════════════════════════════════════════════════ */

var SETTINGS_KEY = 'acrylic';
var CFG_VERSION = 3;
/* 分区级版本：只在**这一组的语义变了**时才作废旧数值。
   3.1.0 把 pl 从「那排图标按钮」改回「整条底栏 + 按钮」，
   旧的 22%/18px 放到整条 1300px 宽的板上会淡得看不见，
   所以只重置 pl，sb / ct 用户的调校原样保留。

   3.1.1 又把三组磨砂基准统一成 20px（组内派生也不再打到 0.55），
   旧的 blur 值留着会让侧栏一直停在 14px 那一档，所以 blur 单独
   记一个版本号 —— 浓度和磨砂分开升级，不会连带把用户调好的浓度冲掉。

   3.1.2 再拉一次：三组浓度起点对齐（24 / 30 / 24）、组内派生全部归一，
   侧栏和内容区的磨砂基准提到 26px（面积小，要更大的半径才糊得出同一观感）。
   浓度和磨砂都升版本，让用户回到同一条起跑线。 */
var ZONE_VER = { sb: 2, pl: 2, ct: 2, add: 1 };
var ZONE_VER_BLUR = { sb: 4, pl: 4, ct: 4, add: 1 };
var NEUTRAL = '#eef0f6';

var P = {
  enabled: true,
  follow: true,   // 跟随主题色（默认开）
  /* 吸顶区防穿透板（style.css 0.3 那条 ::before）。
     默认开，但只在**头部收成「小」阶段**才显形（见 stuckNow）：
     大 / 中阶段照样直接透壁纸，只有列表行真钻到吸顶栏底下时才盖一块
     圆角亚克力。关掉则全程透壁纸，代价是小阶段文字叠文字。 */
  band: true,
  tint: 45,       // 主题色占比 %，剩下的是白基底
  edge: 1.0,
  shadow: 0.7,
  k: 1.0,
  sb: { color: '', a: 0.24, blur: 20, on: true },
  pl: { color: '', a: 0.30, blur: 18, on: true },
  ct: { color: '', a: 0.24, blur: 20, on: true },
  /* 侧栏「+」细条。浓度基准 38% 是照旧版硬编码换算来的
     （侧栏 24% × 1.6，条太细，同百分比看不出颜色）；
     磨砂 16px，9px 高的条上足够把那条壁纸抹平。 */
  add: { color: '', a: 0.38, blur: 16, on: true },
};

var ZONES = [
  { key: 'sb', name: '侧栏', desc: '导航项、歌单条目、用户卡、快捷方块、收起态方块' },
  { key: 'pl', name: '播放栏', desc: '整条胶囊底板 + 上面那排按钮（上一首 / 播放 / 下一首 / 音量 / 队列）' },
  { key: 'ct', name: '内容区', desc: '卡片、搜索框、按钮、歌曲列表、表头（所有页面共用）' },
  { key: 'add', name: '新建条', desc: '侧栏「+」平时那根细线，以及悬停撑开时的那块板' },
];

/* 磨砂滑块上限。播放栏是一条 1700px 宽的整板，20px 就足够把背后壁纸
   抹平，再往上拖用户看不出任何变化（他实测 0→25% 就到顶），
   所以上限收到 25px，让整条滑块都落在有效区间里。
   侧栏 / 内容区零件小，需要更大的半径才糊得出同一观感，保留 60。 */
var BLUR_MAX = { sb: 60, pl: 25, ct: 60, add: 40 };

/* 每组用来「读回实际生效值」的探针元素。v2.x 探的是三块大面板，
   v3.0 不再碰面板，所以改成组里最有代表性的那个元件。
   add 要读 ::before —— 板是伪元素画的，按钮本体是透明的。 */
var PROBE_SEL = {
  sb: '.sidebar-nav-item, .sidebar-rail-item, .sidebar-library-item',
  pl: '.skin-player-panel',
  ct: '.song-search-input, .soft-secondary-action, .action-btn',
  add: '.shortcut-add::before',
};

var BASE_EDGE = 0.24;

/* 颜色互转：UI 用 <input type="color">（要 hex），
   存储用空格分隔 RGB（直接拼成 rgb(...) 喂给 CSS） */
function rgbStrToHex(s) {
  var p = String(s || '').trim().split(/[\s,]+/);
  if (p.length < 3) return '#eef0f6';
  function h(n) {
    var v = Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16);
    return v.length < 2 ? '0' + v : v;
  }
  return '#' + h(p[0]) + h(p[1]) + h(p[2]);
}

function hexToRgbStr(hex) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '';
  var n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(' ');
}

var probeEl = null;
/* 读任意 CSS 变量的**最终颜色**，归一成 rgb(r, g, b)。
   不能自己解析字符串：值可能是 hex / rgb() / color-mix() / oklch()，
   丢给浏览器算最省事。 */
function readVarColor(name) {
  try {
    if (!probeEl || !probeEl.parentNode) {
      probeEl = document.createElement('span');
      probeEl.id = 'acr-probe';
      probeEl.style.cssText =
        'position:absolute;left:-9999px;top:0;width:0;height:0;opacity:0;pointer-events:none;';
      document.documentElement.appendChild(probeEl);
    }
    probeEl.style.color = 'var(' + name + ', ' + NEUTRAL + ')';
    var c = getComputedStyle(probeEl).color;
    probeEl.style.color = '';
    return c || '';
  } catch (e) {
    return '';
  }
}

/* 染料：有色亚克力 = 白基底 + 少量染料。
   直接拿饱和主题色叠上去会绿得发黑，所以混白。 */
function dyeNow() {
  if (!P.follow) return NEUTRAL;
  return 'color-mix(in srgb, var(--color-primary, #00cc65) ' + P.tint + '%, white)';
}

var SEQ = 0;

/* 分区开关：摘 / 挂 html 上的 acr-z-<key>。
   关掉时**不改变量值** —— 用户回头打开，调好的颜色浓度磨砂原样还在。
   规则失效靠 CSS 选择器前缀，不做「把浓度调 0」那种假关闭。 */
function applyZoneClasses() {
  var el = document.documentElement;
  if (!el) return;
  for (var i = 0; i < ZONES.length; i++) {
    var k = ZONES[i].key;
    el.classList.toggle('acr-z-' + k, Boolean(P[k].on));
  }
}

function applyVars() {
  var el = document.documentElement;
  if (!el) return;
  function set(k, v) { el.style.setProperty(k, v, 'important'); }

  set('--acr-dye', dyeNow());

  for (var i = 0; i < ZONES.length; i++) {
    var z = ZONES[i];
    var g = P[z.key];
    set('--acr-a-' + z.key, (Math.round(g.a * 1000) / 10) + '%');
    set('--acr-blur-' + z.key, g.blur + 'px');
    if (g.color) set('--acr-color-' + z.key, 'rgb(' + g.color + ')');
    else el.style.removeProperty('--acr-color-' + z.key);
  }

  set('--acr-e', BASE_EDGE * P.edge);
  set('--acr-s', P.shadow);
  set('--acr-k', P.k);
  applyZoneClasses();
  SEQ++;
}

function removeVars() {
  var el = document.documentElement;
  if (!el) return;
  var keys = ['--acr-dye', '--acr-e', '--acr-s', '--acr-k'];
  for (var i = 0; i < ZONES.length; i++) {
    var k = ZONES[i].key;
    keys.push('--acr-a-' + k, '--acr-blur-' + k, '--acr-color-' + k);
  }
  for (var j = 0; j < keys.length; j++) el.style.removeProperty(keys[j]);
}

var ctx0 = null;

function persist() {
  try {
    var out = {
      v: CFG_VERSION,
      enabled: P.enabled, follow: P.follow, tint: P.tint,
      edge: P.edge, shadow: P.shadow, k: P.k, band: P.band,
    };
    for (var i = 0; i < ZONES.length; i++) {
      var k = ZONES[i].key;
      out[k] = {
        v: ZONE_VER[k], vb: ZONE_VER_BLUR[k],
        color: P[k].color, a: P[k].a, blur: P[k].blur, on: P[k].on,
      };
    }
    ctx0.storage.set(SETTINGS_KEY, out);
  } catch (e) { /* 存储不可用不影响当前会话 */ }
}

export function activate(ctx) {
  ctx0 = ctx;

  function log(msg) {
    try {
      if (window.__electronLog) window.__electronLog.info('[acr] ' + msg);
    } catch (e) { /* 忽略 */ }
  }

  function setEnabled(on) {
    P.enabled = on;
    document.documentElement.classList.toggle('acr-on', on);
    if (on) applyVars();
    else removeVars();
    persist();
  }

  function applyBand() {
    document.documentElement.classList.toggle('acr-band', Boolean(P.band));
  }

  // 立刻挂标记 + 注入变量。
  // 不依赖 storage 的结果：读取失败也必须让 CSS 生效，
  // 否则插件看起来「装了没反应」，排查成本极高。
  document.documentElement.classList.add('acr-on');
  applyVars();
  applyBand();

  var saved = null;
  try {
    saved = ctx.storage.get(SETTINGS_KEY);
  } catch (e) {
    log('storage.get threw: ' + e);
  }

  Promise.resolve(saved).then(function (s) {
    if (s && typeof s === 'object') {
      // 旧配置（v1.x 只有 l2/l3/l4/l5，没有分组键）不迁移数值 ——
      // 那套档位和新分组不是一一对应，硬映射只会得到怪值。
      // 只把「跟随主题色」强制打开：用户反馈不生效，就是旧版这条坏了。
      var fresh = s.v !== CFG_VERSION;

      if (typeof s.tint === 'number') P.tint = s.tint;
      if (typeof s.edge === 'number') P.edge = s.edge;
      if (typeof s.shadow === 'number') P.shadow = s.shadow;
      if (typeof s.k === 'number') P.k = s.k;
      if (typeof s.enabled === 'boolean') P.enabled = s.enabled;
      if (typeof s.band === 'boolean') P.band = s.band;
      P.follow = fresh ? true : (typeof s.follow === 'boolean' ? s.follow : true);

      for (var i = 0; i < ZONES.length; i++) {
        var k = ZONES[i].key;
        var g = s[k];
        if (g && typeof g === 'object') {
          // 颜色永远沿用（用户可能精心设过）。
          if (typeof g.color === 'string') P[k].color = g.color;
          // 浓度 / 磨砂各自一个分区版本号：
          //  · 浓度变了 = 这组东西变了（3.1 的播放栏从一排按钮变回整条
          //    底栏，旧的 22% 放到 1300px 宽的板上会淡得看不见）；
          //  · 磨砂变了 = 三组基准被拉平成同一档（3.1.1），旧值会让
          //    侧栏一直卡在 14px。
          // 没有版本字段 = 更早存的，播放栏一律按按钮语义作废。
          var sameA = (g.v === undefined) ? (k !== 'pl') : (g.v === ZONE_VER[k]);
          var sameB = (g.vb === undefined) ? (k !== 'pl') : (g.vb === ZONE_VER_BLUR[k]);
          if (sameA && typeof g.a === 'number') P[k].a = g.a;
          if (sameB && typeof g.blur === 'number') P[k].blur = g.blur;
          // 分区开关跟参数无关，任何版本都沿用（缺字段 = 老配置 = 默认开）
          if (typeof g.on === 'boolean') P[k].on = g.on;
        }
      }
    }

    // ── add（新建条）首次出现：按侧栏当前观感派生初值
    // 它原来跟着侧栏控件那组混算（浓度 ×1.6、磨砂同值），独立成组后如果
    // 直接落到写死的 38% / 16px，在把侧栏调得很淡的用户那里会显得特别重
    // （实测有人侧栏是 26% / 4px，细线却 38% / 16px，一眼就不同档）。
    // 所以第一次没有 add 字段时，照侧栏的比例推一遍：浓度 ×1.55 补细条的
    // 面积劣势，磨砂 ×0.7 略收。之后用户自己调，不再覆盖。
    if (s && typeof s === 'object' && !s.add) {
      P.add.a = Math.min(0.8, Math.round(P.sb.a * 1.55 * 100) / 100);
      P.add.blur = Math.max(0, Math.round(P.sb.blur * 0.7));
      log('add init from sb -> ' + P.add.a + '/' + P.add.blur);
    }

    // 老配置里 pl 的磨砂可能还存着 >25 的旧值（之前上限是 60），
    // 滑块已经收到 25，先夹住，否则滑块的填充段会溢出去。
    for (var ci = 0; ci < ZONES.length; ci++) {
      var ck = ZONES[ci].key;
      if (P[ck].blur > BLUR_MAX[ck]) P[ck].blur = BLUR_MAX[ck];
      if (P[ck].blur < 0) P[ck].blur = 0;
    }

    if (P.enabled) {
      applyVars();
      applyBand();
      document.documentElement.classList.add('acr-on');
    } else {
      removeVars();
      document.documentElement.classList.remove('acr-on');
    }
    log('v3.4.0 sb=' + P.sb.a + '/' + P.sb.blur + (P.sb.on ? '' : '(off)') +
        ' pl=' + P.pl.a + '/' + P.pl.blur + (P.pl.on ? '' : '(off)') +
        ' ct=' + P.ct.a + '/' + P.ct.blur + (P.ct.on ? '' : '(off)') +
        ' add=' + P.add.a + '/' + P.add.blur + (P.add.on ? '' : '(off)') +
        ' follow=' + P.follow + ' tint=' + P.tint + ' on=' + P.enabled);
  }).catch(function (e) {
    log('storage resolve failed: ' + e);
  });

  /* 吸顶板（style.css 0.3 那条 ::before）只在**头部收成「小」阶段**才显示。
     判据不是「有没有滚动」，而是「列表行有没有钻进吸顶区」——
     只有后者才会出现标题/工具栏/表头跟歌曲行叠在一起的杂乱。
     大 / 中阶段一律不盖，头部必须能直接看到壁纸。
     scroll 事件不冒泡，必须用捕获阶段在 document 上收。 */
  var SCROLLED = 'acr-scrolled';
  var STUCK = 'acr-stuck';

  /* 只看**当前视口里**那个 wrap：SPA 切页会新建一个 wrap，旧的还挂在
     DOM 上（display:none 但仍带 scrollTop），拿它判断就会把类永久卡住
     —— 表现就是「明明停在顶部，头部还是糊的」。 */
  function liveWrap() {
    var ws = document.querySelectorAll('.scrollbar-wrap');
    var best = null, st = 0;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      var r = w.getBoundingClientRect();
      if (r.width < 50 || r.height < 50) continue;            // 已切走的页面
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (w.scrollTop > st) { st = w.scrollTop; best = w; }
    }
    return { el: best, st: st };
  }

  /* 列表行是否进入吸顶区（= 页面进入「小」阶段）。
     吸顶区 = wrap 顶部往下 --page-sticky-inset 那么高的一条。
     行的顶边越过这条的底边，行就会跟吸顶栏叠在一起。 */
  var ROW_SEL = '.song-cover-frame, .song-list-row, .song-item, .album-card, .playlist-card';
  function stuckNow(wrap) {
    try {
      var a = wrap && wrap.closest ? wrap.closest('.page-scroll-area') : null;
      if (!a) return false;
      var inset = parseFloat(getComputedStyle(a).getPropertyValue('--page-sticky-inset')) || 0;
      if (inset <= 0) return false;                  // 没有吸顶栏的页面，永远不盖
      var wr = wrap.getBoundingClientRect();
      var edge = wr.top + inset;                     // 吸顶区底边（视口坐标）
      /* 不能只查第一行：滚深之后第一行早就翻到吸顶区上面去了（被容器裁掉），
         真正叠在吸顶栏上的是**后面那几行**。DOM 顺序就是从下往上的位置顺序，
         所以顺着扫，遇到第一个还没滚进来的就可以停。 */
      var rows = a.querySelectorAll(ROW_SEL);
      for (var i = 0; i < rows.length && i < 120; i++) {
        var rr = rows[i].getBoundingClientRect();
        if (rr.bottom <= wr.top) continue;           // 已经翻过去了
        if (rr.top >= edge - 6) return false;        // 还没滚进来（留 6px 防抖）
        return true;                                 // 有行正压在吸顶区里
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /* 吸顶板要跟下面列表托盘左右对齐，不能直接写死 24px：
     ECHO 在窄窗口会把内容区 padding 收窄（.px-6 → .px-4 之类），
     写死了板就又比列表宽出一截。量「列表/表头左边界 − 容器左边界」即可。 */
  var lastX = -1, lastCut = -1;
  /* 必须从**当前视口里那个 wrap** 反推 .page-scroll-area，不能用
     document.querySelector —— SPA 切走的老页面也带 .page-scroll-area，
     量到的是它的（不可见）布局，cut/x 就会算出 0。
     实测：用全局 querySelector 时 cut 恒为 0，板照旧盖在表头身上。 */
  function syncSticky(live) {
    var w = live && live.el;
    var a = w && w.closest ? w.closest('.page-scroll-area') : null;
    if (!a) return;

    // ── 左右：跟列表托盘对齐（写死 24 不行，窄窗口 ECHO 会收 padding）
    /* 注意：不能把这几个选择器塞进同一个 querySelector —— 它按**文档顺序**
       返回第一个匹配，头部里那个 .px-6 排在最前，量出来是 0，板就又满宽了。
       必须按优先级逐个试。 */
    /* 量的是**内容列的内缩量**，不是「某个元素的左边界」——
       托盘/表头被 3.5 那条规则向外扩了 --acr-sticky-grow（负 margin），
       再拿它们的 rect.left 去量就会少 12px，板又变成满宽（实测踩过）。
       所以往上找第一个带 padding 的祖先，用「祖先内容盒左边界」当基准，
       这跟我们怎么折腾托盘无关。托盘本来就在 .px-6 里，量到的就是那个 24。 */
    var ref = a.querySelector('.song-list-container') ||
              a.querySelector('div.h-11') ||
              a.querySelector('.px-6.pb-12') ||
              a.querySelector('.px-6');
    if (ref) {
      var ar = a.getBoundingClientRect();
      var x = -1;
      var p = ref.parentElement;
      while (p && p !== a) {
        var pp = parseFloat(getComputedStyle(p).paddingLeft) || 0;
        if (pp > 0) {
          x = Math.round(p.getBoundingClientRect().left + pp - ar.left);
          break;
        }
        p = p.parentElement;
      }
      if (x < 0) {                                   // 兜底：用 ref 自己的内容盒
        x = Math.round(ref.getBoundingClientRect().left +
          (parseFloat(getComputedStyle(ref).paddingLeft) || 0) - ar.left);
      }
      if (x >= 0 && x <= 80 && x !== lastX) {
        lastX = x;
        document.documentElement.style.setProperty('--acr-sticky-x', x + 'px', 'important');
      }
    }

    /* ── 高度：吸顶区最下面那行是列表表头，它自己有板（style.css 3.4）。
       板盖上去就是两层亚克力叠加，交界处明显深一档（用户点名不要），
       所以把表头占的那段从板高里砍掉。表头是 sticky 的，贴在吸顶区底边，
       量「吸顶区底边 − 表头顶边」就是该砍的高度。 */
    var ins = parseFloat(getComputedStyle(a).getPropertyValue('--page-sticky-inset')) || 0;
    var cut = 0;
    if (ins > 0) {
      var wr = w.getBoundingClientRect();
      var edge = wr.top + ins;
      /* 表头**不在** .page-scroll-area 里面（它跟吸顶栏一样浮在滚动容器外），
         所以必须在 document 上找 —— 只在 a 里找会得到一个空列表，
         cut 恒为 0，板照旧压在表头身上（实测踩过）。
         用「贴在吸顶区底边 + 宽度够」筛出真正生效的那个，滚走的旧页面不算。 */
      var hs = document.querySelectorAll('div.h-11');
      for (var i = 0; i < hs.length; i++) {
        if (!hs[i].querySelector('.song-sort-choice')) continue;
        var r = hs[i].getBoundingClientRect();
        if (r.width < 100) continue;                       // 切走/没渲染的
        if (r.top < wr.top - 2 || r.bottom > edge + 4) continue;
        cut = Math.max(cut, Math.round(edge - r.top));
      }
    }
    if (cut !== lastCut) {
      lastCut = cut;
      document.documentElement.style.setProperty('--acr-sticky-cut', cut + 'px', 'important');
    }
  }

  /* ▍显形要「连续满足」一段时间才放行（v3.3.8）
     原因：头部收拢的那一两帧里，scrollTop 已经是新值，但 ECHO 的
     --page-sticky-inset 要等下一个 tick 才写入 —— 于是 stuckNow() 拿
     「新的行位置」去比「旧的吸顶区高度」，误判成 true，板开始淡入，
     下一帧类又被摘掉，淡入只走到 10% 左右就被迫回头。
     肉眼看到的就是「中阶段某处闪一下亚克力」，截图很难抓（实测是单帧
     opacity≈0.10，脚本化滚动 12 个来回只抓到 1 次，概率性）。

     所以：
       · 显示 —— 必须连续满足 STUCK_HOLD 毫秒才挂类。过渡抖动只有 1~2 帧
         （<35ms），根本到不了门槛，闪现被彻底吃掉。
       · 隐藏 —— 立刻摘。延迟隐藏只会让板在「本该透明」的地方多赖一会儿，
         反而放大问题；淡出由 CSS 那条 90ms 收尾（见 style.css 0.3）。 */
  var STUCK_HOLD = 140;
  var candWant = null, candAt = 0;
  function syncStuck(want) {
    var cl = document.documentElement.classList;
    var cur = cl.contains(STUCK);
    if (want === cur) { candWant = null; return; }
    var now = Date.now();
    if (candWant !== want) { candWant = want; candAt = now; return; }
    if (!want) { cl.remove(STUCK); candWant = null; return; }   // 收：不延迟
    if (now - candAt >= STUCK_HOLD) { cl.add(STUCK); candWant = null; }
  }

  function syncScrolled() {
    var live = liveWrap();
    document.documentElement.classList.toggle(SCROLLED, live.st > 4);
    syncStuck(Boolean(live.el) && stuckNow(live.el));
    syncSticky(live);
  }
  function onAnyScroll(ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('scrollbar-wrap')) return;
    syncScrolled();
  }
  document.addEventListener('scroll', onAnyScroll, true);
  window.addEventListener('hashchange', syncScrolled);
  /* 兜底：切页会重置滚动条但**不触发 scroll 事件**（ECHO 是 spa，路由变了
     才 swap DOM），纯靠事件监听类会残留。300ms 轮询一次，代价可以忽略。 */
  var scrolledTimer = setInterval(syncScrolled, 300);

  ctx.dispose(function () {
    removeVars();
    document.documentElement.classList.remove('acr-on');
    document.documentElement.classList.remove('acr-band');
    document.documentElement.classList.remove(SCROLLED);
    document.documentElement.classList.remove(STUCK);
    // 分区开关类也要摘干净，否则下次装回来还会带着旧的关闭状态
    for (var zi = 0; zi < ZONES.length; zi++) {
      document.documentElement.classList.remove('acr-z-' + ZONES[zi].key);
    }
    document.documentElement.style.removeProperty('--acr-sticky-x');
    document.documentElement.style.removeProperty('--acr-sticky-cut');
    document.removeEventListener('scroll', onAnyScroll, true);
    window.removeEventListener('hashchange', syncScrolled);
    clearInterval(scrolledTimer);
    if (probeEl && probeEl.parentNode) probeEl.parentNode.removeChild(probeEl);
    probeEl = null;
  });



  // ════════ 设置面板 ════════
  var vue = ctx.vue;
  var h = vue.h;
  var reactive = vue.reactive;
  var defineComponent = vue.defineComponent;
  var defineAsyncComponent = vue.defineAsyncComponent;
  var Switch = defineAsyncComponent(ctx.ui.components.Switch);
  var Slider = defineAsyncComponent(ctx.ui.components.Slider);

  var SettingsPanel = defineComponent({
    setup: function () {
      var draft = reactive({
        enabled: P.enabled,
        band: P.band,
        follow: P.follow,
        tint: Math.round(P.tint),
        edge: Math.round(P.edge * 100),
        shadow: Math.round(P.shadow * 100),
        k: Math.round(P.k * 100),
        sb: { color: P.sb.color, a: Math.round(P.sb.a * 100), blur: P.sb.blur, on: P.sb.on },
        pl: { color: P.pl.color, a: Math.round(P.pl.a * 100), blur: P.pl.blur, on: P.pl.on },
        ct: { color: P.ct.color, a: Math.round(P.ct.a * 100), blur: P.ct.blur, on: P.ct.on },
        add: { color: P.add.color, a: Math.round(P.add.a * 100), blur: P.add.blur, on: P.add.on },
      });
      var tick = reactive({ n: 0 });   // 让色块跟着滑块刷新

      function commit() {
        P.band = Boolean(draft.band);
        applyBand();
        P.follow = Boolean(draft.follow);
        P.tint = Number(draft.tint);
        P.edge = draft.edge / 100;
        P.shadow = draft.shadow / 100;
        P.k = draft.k / 100;
        for (var i = 0; i < ZONES.length; i++) {
          var k = ZONES[i].key;
          P[k].color = draft[k].color || '';
          P[k].a = Number(draft[k].a) / 100;
          P[k].blur = Math.min(Number(draft[k].blur) || 0, BLUR_MAX[k]);
          P[k].on = Boolean(draft[k].on);
        }
        applyVars();   // 内含 applyZoneClasses，分区开关立刻生效
        tick.n++;
        persist();
      }

      function row(title, desc, ctrl) {
        return h('div', {
          style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;',
        }, [
          h('div', { style: 'flex:1;min-width:0;' }, [
            h('div', { style: 'font-weight:600;font-size:14px;line-height:1.4;' }, title),
            h('div', { style: 'font-size:12px;opacity:.6;margin-top:2px;line-height:1.5;' }, desc),
          ]),
          ctrl,
        ]);
      }

      function slider(title, desc, val, min, max, step, suffix, onInput) {
        return h('div', { style: 'display:flex;flex-direction:column;gap:2px;padding:6px 0;' }, [
          h('div', { style: 'font-weight:500;font-size:13px;' }, title),
          desc ? h('div', { style: 'font-size:11px;opacity:.55;margin-bottom:4px;line-height:1.45;' }, desc) : null,
          h(Slider, {
            modelValue: val, min: min, max: max, step: step,
            showValue: true, valueSuffix: suffix || '',
            'onUpdate:modelValue': onInput,
          }),
        ]);
      }

      function head(text) {
        return h('div', { style: 'font-weight:600;font-size:13px;opacity:.8;padding:16px 0 2px;' }, text);
      }

      function hint(text) {
        return h('div', { style: 'font-size:11px;opacity:.55;line-height:1.5;padding-bottom:4px;' }, text);
      }

      // 一组一张小卡片：开关 + 色块 + 恢复键，下面两个滑块
      function zoneCard(z) {
        var g = draft[z.key];
        void tick.n;   // 建立依赖，拖动滑块时重算色块
        var custom = g.color;
        // 没自定义时显示**当前真正生效**的颜色（染料算完的结果），
        // 否则色块会跟实际材质对不上，用户以为没生效。
        var eff = custom ? rgbStrToHex(custom)
                        : rgbStrToHex(rgbOnly(readVarColor('--acr-col-' + z.key)));
        return h('div', {
          style: 'border:1px solid rgb(128 128 128 / .18);border-radius:10px;' +
                 'padding:12px;margin:10px 0;transition:opacity 160ms ease;' +
                 'opacity:' + (g.on ? '1' : '.55') + ';',
        }, [
          h('div', { style: 'display:flex;align-items:center;gap:10px;' }, [
            h('div', { style: 'flex:1;min-width:0;' }, [
              h('div', { style: 'font-weight:600;font-size:13px;line-height:1.35;' }, z.name),
              h('div', { style: 'font-size:11px;opacity:.55;margin-top:1px;line-height:1.4;' }, z.desc),
            ]),
            h('input', {
              type: 'color',
              value: eff,
              title: custom ? '自定义色' : '跟随主题（点一下即固定成这个颜色）',
              style: 'width:40px;height:26px;border:0;border-radius:6px;padding:0;' +
                     'background:transparent;cursor:pointer;flex-shrink:0;' +
                     (custom ? '' : 'opacity:.72;'),
              onInput: function (ev) {
                draft[z.key].color = hexToRgbStr(ev.target.value);
                commit();
              },
            }),
            h('button', {
              title: '恢复为跟随主题',
              style: 'border:0;background:transparent;color:inherit;cursor:pointer;' +
                     'font-size:15px;line-height:1;padding:2px 3px;flex-shrink:0;' +
                     'opacity:' + (custom ? '.75' : '.2') + ';',
              onClick: function () {
                draft[z.key].color = '';
                commit();
              },
            }, '\u21ba'),
            // 分区总开关：关掉 = 这一组整块 CSS 规则不再命中，
            // 元素回到 ECHO 原生外观（不是调透明那种关一半）。
            // 数值原样保留，回头打开还是调好的样子。
            h('div', {
              style: 'flex-shrink:0;display:flex;align-items:center;',
              title: g.on ? '关闭这一组亚克力' : '打开这一组亚克力',
            }, [
              h(Switch, {
                modelValue: g.on,
                'onUpdate:modelValue': function (v) {
                  draft[z.key].on = Boolean(v);
                  commit();
                },
              }),
            ]),
          ]),
          slider('板材浓度', '板子有多不透明。0 = 完全透明只剩一圈轮廓，拖到最右基本就不透光了', g.a, 0, 80, 1, '%', function (v) {
            draft[z.key].a = Number(v); commit();
          }),
          slider('磨砂强度',
            z.key === 'pl'
              ? '只糊板背后的内容，不糊板本身也不糊文字。这一条面积大，20px 左右就把壁纸抹平了，所以上限只到 25。前提是 ECHO 设置里的「面板不透明度」低于 100%'
              : (z.key === 'add'
                ? '这根细条只有 9px 高，糊的就是条内那一小条壁纸，16px 足够。悬停撑开成板时用的也是这个值。前提是 ECHO 设置里的「面板不透明度」低于 100%'
                : '只糊板背后的内容，不糊板本身也不糊文字。这里的元件小，半径要够大才看得出糊，默认给到 26px。前提是 ECHO 设置里的「面板不透明度」低于 100%，否则板后面是纯白'),
            g.blur, 0, BLUR_MAX[z.key], 1, 'px', function (v) {
              draft[z.key].blur = Number(v); commit();
            }),
          h('div', {
            style: 'font-size:11px;opacity:.5;margin-top:2px;',
          }, (!g.on ? '已关闭 · 这一组现在完全是 ECHO 原生外观' : '当前实际生效：' + (function () {
            try {
              var cs = getComputedStyle(document.documentElement);
              // add 的板画在 ::before 上，要带伪元素参数才读得到 blur
              var spec = String(PROBE_SEL[z.key] || '').split('::');
              var el = document.querySelector(spec[0] || '');
              var bf = '—';
              if (el) {
                var st = getComputedStyle(el, spec[1] ? '::' + spec[1] : null);
                bf = st.backdropFilter || st.webkitBackdropFilter || 'none';
              }
              return '浓度 ' + cs.getPropertyValue('--acr-a-' + z.key).trim() +
                     ' · 磨砂 ' + (bf || 'none');
            } catch (e) { return '—'; }
          })())),
        ]);
      }

      // 从 getComputedStyle 结果里抠出 "r g b"
      function rgbOnly(c) {
        var m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(String(c || ''));
        if (!m) return NEUTRAL;
        return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])].join(' ');
      }

      return function () {
        var kids = [];
        kids.push(row('亚克力材质', '四组分区各自可开关、调颜色、厚度、模糊', h(Switch, {
          modelValue: draft.enabled,
          'onUpdate:modelValue': function (v) {
            draft.enabled = Boolean(v);
            setEnabled(draft.enabled);
          },
        })));

        if (draft.enabled) {
          kids.push(head('全局配色'));
          kids.push(row('跟随主题色', '板材取当前主题色与白混合。换主题会**自动**跟着变，不用重启', h(Switch, {
            modelValue: draft.follow,
            'onUpdate:modelValue': function (v) {
              draft.follow = Boolean(v);
              commit();
            },
          })));
          if (draft.follow) {
            kids.push(slider('染色浓度', '主题色占比。越高越像彩色玻璃，越低越接近中性灰白', draft.tint, 0, 90, 5, '%', function (v) {
              draft.tint = Number(v); commit();
            }));
          }

          kids.push(head('吸顶区'));
          kids.push(row('防穿透板',
            '只在头部收成吸顶条、歌曲行开始钻到标题栏底下时，' +
            '顶部盖一块圆角亚克力。大 / 中阶段始终直接透壁纸。' +
            '关掉则全程透壁纸，但那个阶段标题和歌曲行会叠在一起',
            h(Switch, {
              modelValue: draft.band,
              'onUpdate:modelValue': function (v) {
                draft.band = Boolean(v);
                commit();
              },
            })));

          kids.push(head('分区'));
          kids.push(hint('四组互不影响。右上角开关单独开关这一组（关掉就是 ECHO 原生外观，调好的数值会保留）；点色块可以把某一组固定成别的颜色，↺ 恢复跟随主题。'));
          ZONES.forEach(function (z) { kids.push(zoneCard(z)); });

          kids.push(head('质感'));
          kids.push(hint('没有高光，只有一圈极淡的板边轮廓。调 0 就是完全无边。'));
          kids.push(slider('板边轮廓', '板材和壁纸的分界那一圈', draft.edge, 0, 200, 5, '%', function (v) {
            draft.edge = Number(v); commit();
          }));
          kids.push(slider('投影', '板子离底面的悬浮感', draft.shadow, 0, 250, 5, '%', function (v) {
            draft.shadow = Number(v); commit();
          }));
          kids.push(slider('总强度', '一把梭，所有组一起缩放', draft.k, 0, 200, 5, '%', function (v) {
            draft.k = Number(v); commit();
          }));
        }

        return h('div', { style: 'display:flex;flex-direction:column;gap:2px;width:100%;' }, kids);
      };
    },
  });

  try {
    ctx.ui.settings.define({
      title: '亚克力材质 设置',
      component: SettingsPanel,
    });
  } catch (e) {
    log('settings panel failed: ' + e);
  }
}

export function deactivate() {
  removeVars();
  document.documentElement.classList.remove('acr-on');
}
