# 亚克力分层材质 · echo-acrylic

给 ECHO Music 的可交互元素铺一层**染色亚克力板材**：半透明底 + 背后磨砂 + 主题色染色。
**不改背景**——ECHO 自己的面板底色、透明度、壁纸全部照旧生效，材质只挂在能点、能拖、能输入的东西上。

> An acrylic-material plugin for ECHO Music. It only paints interactive elements (buttons, cards, list rows, the player
> capsule) — the wallpaper and ECHO's own surfaces are left untouched.

- 版本：`3.4.0`
- 要求：ECHO Music `>= 2.2.6-beta.9`

---

## 它做什么

| 分区 | 覆盖的元素 |
|---|---|
| **侧栏** `sb` | 导航项、歌单条目、用户卡、快捷方块、收起态方块 |
| **播放栏** `pl` | 整条胶囊底板 + 上面那排按钮（上一首 / 播放 / 下一首 / 音量 / 队列） |
| **内容区** `ct` | 卡片、搜索框、按钮、歌曲列表、表头、个人主页数据条与会员卡（所有页面共用） |
| **新建条** `add` | 侧栏底部「+」那根细线（悬停会弹开成板） |

四组**互相独立**：各自有开关 + 颜色 + 浓度 + 磨砂。

## 它不做什么

- 不接管 ECHO 的 `--surface-*` 变量，不重画大面板底色（那是「换背景」，不是这个插件的事）
- 没有高光、没有渐变光泽、没有玻璃反光
- 不往列表里逐行叠卡片，整块列表是连续的一张板

---

## 安装

插件放在 ECHO 的插件目录下，一个目录一个插件：

```
%APPDATA%\echo-music\plugins\echo-acrylic\
├── manifest.json
├── index.js
├── style.css
└── icon.svg
```

Windows 上是 `C:\Users\<你>\AppData\Roaming\echo-music\plugins\echo-acrylic\`。

把本仓库的 `manifest.json` / `index.js` / `style.css` / `icon.svg` 复制进去，重启 ECHO 即可。
（`README.md`、`LICENSE`、`.gitignore` 不用复制，宿主不读它们。）

升级版本时**覆盖同名文件**后重启，配置存在 ECHO 的设置库里，不会丢。

## 使用

顶栏「插件管理」→ 「亚克力分层材质」卡片 → 「设置」。

面板分四块：

- **亚克力材质** — 总开关
- **全局配色** — 跟随主题色（换主题自动重算，不用重启）、染色浓度
- **吸顶区** — 防穿透板：只有当列表行真的滚到吸顶标题底下时才显形，静止和头部展开时完全透明
- **分区** — 四张卡片，每张右上角是这一组的开关；点色块可把该组固定成别的颜色，`↺` 恢复跟随主题
- **质感** — 板边轮廓、投影、总强度（一把梭缩放所有组）

关掉某一组不会清数值：实现上是摘掉 `<html>` 上的 `acr-z-<key>` 类，那一组的 CSS 规则整体不命中，元素 100% 回到 ECHO 原生外观，改回来还是你调好的样子。

---

## 常见问题

**磨砂强度拖了没反应？**
先看你的背景是不是**纯色**。磨砂的实质是"把板背后的内容糊开"，背后是纯色时，模糊纯色还是纯色，视觉上必然零变化——四组滑块全都一样。
用带背景图的主题（ECHO 设置 → 外观 → 选图片背景）就能立刻看到效果。
自检办法：把「质感 → 板边轮廓」调大，能看到板边说明材质生效了，那就只是背景没有可糊的内容。

**所有插件突然都不生效了，界面上没有任何亚克力，日志里也没有报错？**
ECHO 被强杀（`taskkill /F`、任务管理器结束进程）后会把渲染进程判成崩溃，写进 `plugins:safe-mode = true`，之后**所有插件一律不加载**。
正常退出应用，再改 `%APPDATA%\echo-music\echomusic.sqlite` 的 `app_kv` 表：`plugins:safe-mode` 置为 `false`，重启即可。
这也意味着：不要用强杀进程的方式重启 ECHO。

**播放栏的磨砂看不出来 / 内容区个别页面没有板？**
播放栏默认上限只给到 25px —— 那条面积大，20px 左右就把壁纸抹平了。内容区按 ECHO 的页面结构挂载，某些弹层和第三方插件自绘的容器不在覆盖范围内。

---

## 实现要点（给想改的人）

- **材质用 `background-image` 叠，不动 `background-color`**：ECHO 的原生底色仍然可见，插件只是往上压一层半透明染色。这样切换主题、调面板透明度都不会打架。
- **变量用 `documentElement.style.setProperty(k, v, 'important')` 写**：inline important 高于任何选择器，滑块必定生效。早期版本用 `<style>` 注入 `:root{}`，特异性打不过样式表里 `html.acr-on:is(...)`，表现就是"拖了没反应"。
- **颜色不采样**：`--acr-dye` 直接是 `color-mix(in srgb, var(--color-primary) N%, white)`，交给浏览器算，主题色一变自动重算，不需要 MutationObserver。
- **`backdrop-filter` 会被 backdrop root 截断**：祖先上任何 `filter` / `isolation:isolate` / `clip-path` 都会让子元素的磨砂失效。内容区的 `.scrollbar-wrap` 因此被设成 `clip-path:none`。
- **吸顶遮挡带**：`--page-sticky-inset` 是吸顶区高度，板高要减去表头高度避免两层叠加；显形判定要**连续满足 140ms** 才认，否则 SPA 切页时 `scrollTop` 已更新、吸顶高度还滞后一 tick，会闪一下。

## License

MIT，见 [LICENSE](LICENSE)。
