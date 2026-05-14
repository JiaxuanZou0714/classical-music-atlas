# 古典音乐时间地图

一个面向古典音乐爱好者的静态时间线网站。首页是品牌展示入口，`timeline.html` 是可长期扩展的作曲家时间地图。

## 本地预览

在项目根目录运行：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/
```

不要直接双击打开 `index.html`，因为浏览器会限制本地文件读取 `data/composers.json`。

## GitHub Pages 部署

这个项目是纯静态站点，可以直接部署到 GitHub Pages：

1. 把仓库推送到 GitHub。
2. 在仓库设置里打开 `Settings -> Pages`。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub Pages 构建完成。

项目里的 `.nojekyll` 会让 GitHub Pages 跳过 Jekyll 处理，按静态文件原样发布。

## 文件结构

```text
index.html             首页
timeline.html          完整 timeline 页面
assets/styles.css      视觉系统和响应式样式
assets/app.js          前端渲染与筛选交互
data/composers.json    作曲家静态数据
DATA_SOURCES.md        数据来源和校验规则
scripts/               数据校验脚本
PRODUCT.md             产品上下文
DESIGN.md              设计系统
.impeccable/design.json 设计 sidecar
```

## 数据校验

作曲家生卒年和外部 ID 可用 Wikidata 复核：

```powershell
node scripts\verify-composer-facts.mjs
```

校验通过后，需要刷新 `sourceIds` 和 `verifiedAt` 时运行：

```powershell
node scripts\verify-composer-facts.mjs --write-source-ids
```
