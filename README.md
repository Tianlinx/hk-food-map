# 香港美食地图 · FoodMapHK

一个基于**微信小程序 + 云开发**的香港美食探店地图。地图标点、投稿审核、评分筛选、主题切换、可拖拽的探店列表抽屉，开箱即用。

> 谁说美食地图不能有宝藏地方推荐？除中餐 / 西餐 / 饮品甜点外，还专门设了「好玩的」分类（棒棒糖图标），把值得一去的宝藏景点、小店一并收进地图。

---

## ✨ 功能特性

- 🗺 **地图探店**：基于微信原生 `map` 组件，按菜系分色标点（中餐红 / 西餐蓝 / 饮品甜点绿 / 好玩的紫）。
- 🔍 **智能筛选**：地区 + 菜系 + 评分三条件，支持「不限 / 全评分」；筛选面板底部弹出，避开自定义 tabBar 遮挡。
- 📱 **可拖拽探店抽屉**：列表浮于地图上层，可三档拖拽（收起 / 半展 / 全展）；地图全屏时列表下滑消失。
- 📝 **投稿审核（合规模型）**：用户投稿写入 `submissions`，管理员在 `review` 页审核通过后发布到 `restaurants`，规避个人主体小程序的 UGC 红线。
- 👑 **管理员自举**：全新环境下第一个登录的微信用户自动成为超级管理员，无需硬编码 openid。
- 🎨 **四套主题**：黑金 / 薄荷 / 暖阳 / 靛蓝，设置页一键切换并持久化。
- ⭐ **趣味评分**：1–5 星对应「拉完了 / NPC / 人上人 / 顶级 / 夯爆了」。
- 🍭 **「好玩的」分类**：美食之外的宝藏地点推荐，图标为棒棒糖。

---

## 🛠 技术栈

| 层 | 方案 |
|---|---|
| 前端 | 微信小程序原生（WXML / WXSS / JS） |
| 后端 | 微信云开发（云函数 `login` + 云数据库） |
| 导航 | 自定义 tabBar（`custom-tab-bar`）+ `navigation-bar` 组件 |
| 图标 | Python + Pillow 生成（`assets/gen_*.py`） |

---

## 📂 目录结构

```
hk-food-map/
├── app.js / app.json / app.wxss     # 小程序入口、全局配置、主题 CSS 变量
├── project.config.json              # 开发者工具项目配置（含 AppID，需自行替换）
├── sitemap.json
├── pages/                           # 页面
│   ├── index/                       # 首页：地图 + 可拖拽探店抽屉 + 筛选
│   ├── detail/                      # 店铺详情
│   ├── add/                         # 投稿 / 编辑
│   ├── search/                      # 搜索
│   ├── mine/                        # 我的（收藏、我的投稿）
│   ├── review/                      # 管理员审核台
│   ├── settings/                    # 设置（主题、版本号）
│   └── navigate/                    # 导航唤起（web-view 加载 nav.html）
├── components/navigation-bar/       # 自定义导航栏组件
├── custom-tab-bar/                 # 自定义底部 tabBar
├── cloudfunctions/login/           # 云函数：登录 / 注册 / 管理员 / 投稿审核
├── assets/                          # 图标资源与生成脚本
│   ├── cuisine/  markers/  tabbar/  # PNG 图标
│   └── gen_cuisine.py  gen_markers.py  gen_tabbar.py  gen_icons.py
├── web/index.html                   # Web 预览版（独立 HTML 演示）
└── nav.html                         # 导航唤起页托管的 HTML（由 navigate 页 web-view 加载）
```

---

## 🚀 快速开始

### 前置条件
- 微信开发者工具（稳定版）
- 一个微信小程序账号（[mp.weixin.qq.com](https://mp.weixin.qq.com)），已开通**云开发**

### 1. 导入项目
用微信开发者工具「导入项目」，目录选择本仓库根目录。

### 2. 替换 AppID 与云环境
- 打开 `project.config.json`，把 `appid` 改成你自己的小程序 AppID。
- 打开 `app.js`，把顶部的 `CLOUD_ENV` 改成你的云开发**环境 ID**：
  ```js
  const CLOUD_ENV = 'cloud1-xxxxxxxx' // ← 替换为你的云开发环境 ID
  ```

### 3. 开通云开发 & 部署云函数
- 顶部菜单「云开发」→ 开通，记下环境 ID（与第 2 步一致）。
- 左侧文件树右键 `cloudfunctions` 目录 → 「当前环境」→ 选择你的环境。
- 右键 `cloudfunctions/login` → 「上传并部署：云端安装依赖」。

### 4. 创建数据库集合与权限
在云开发控制台 → 数据库 → 新建以下集合，并按下表设置权限：

| 集合 | 权限 |
|---|---|
| `restaurants` | 所有用户可读，仅创建者可读写 |
| `submissions` | 仅创建者可读写 |
| `favorites` | 仅创建者可读写 |
| `users` | 仅创建者可读写 |
| `config` | 仅创建者可读写 |

> `config` 集合用于存放管理员名单（`{ _id: 'admin', admins: [...] }`），首次登录会自动写入。

### 5. 编译运行
点「编译」，用体验版或真机预览即可。首次用微信登录后，该微信会自动成为管理员（可到 `review` 页审核投稿）。

---

## 👑 管理员配置

`cloudfunctions/login/index.js` 支持两种管理员认定方式（优先级从高到低）：

1. **硬编码名单**（优先级最高，且不会触发自举）：把你的 openid 写进 `ADMIN_OPENIDS` 数组，重新部署云函数。
   ```js
   const ADMIN_OPENIDS = [
     // 'oXXXX-your-openid',
   ]
   ```
2. **首次登录自举**：`ADMIN_OPENIDS` 为空时，全新环境下第一个登录的微信用户自动成为超级管理员并写入 `config.admins`，之后锁定。

获取自己的 openid：编译运行小程序后，开发者工具底部 Console 会打印 `[openid] xxx`。

---

## 🎨 主题

设置页可切换四套主题（写入本地缓存，全局生效）：

| key | 名称 | 配色 |
|---|---|---|
| `blackgold` | 黑金（默认） | 暖炭黑 + 香槟金 |
| `mint` | 薄荷 | 清透绿 + 米白 |
| `warm` | 暖阳 | 暖沙橙 + 奶白 |
| `indigo` | 靛蓝 | 深空蓝 + 雾蓝 |

---

## 🍭 菜系与图标

| 菜系 | 地图标记颜色 | 图标 |
|---|---|---|
| 中餐 | 红 `#E64340` | `assets/markers/marker_zhongcan.png` |
| 西餐 | 蓝 `#3B82F6` | `assets/markers/marker_xican.png` |
| 饮品甜点 | 绿 `#22C55E` | `assets/markers/marker_yinpin.png` |
| 好玩的 | 紫 `#A855F7` | `assets/markers/marker_fun.png`（棒棒糖） |

> 数据库里已有的旧记录若 `cuisine` 为「特色小吃」，各页面读取时会自动归一为「好玩的」，无需手动改数据。

---

## 🖼 Web 预览版（`web/index.html`）

`web/index.html` 是一个**独立的单文件 HTML 预览**，用于快速演示地图与列表效果。

> ⚠️ 注意：该 Web 版为演示用途，写入逻辑直接落到 `restaurants`，**绕过了小程序侧的投稿审核流程**。生产环境请以小程序 + 云函数的合规审核模型为准。

---

## 🔧 图标生成脚本

`assets/` 下的 `gen_*.py` 用 [Pillow](https://python-pillow.org/) 重新生成全部 PNG 图标，方便你改色或改形状：

```bash
pip install pillow
python assets/gen_markers.py     # 生成地图 marker
python assets/gen_cuisine.py     # 生成菜系列表图标
python assets/gen_tabbar.py      # 生成 tabBar 图标
python assets/gen_icons.py       # 生成其余图标
```

---

## 📋 数据库集合说明

| 集合 | 用途 |
|---|---|
| `restaurants` | 已发布的探店（地图与列表的数据源） |
| `submissions` | 用户投稿，待管理员审核 |
| `favorites` | 用户收藏 |
| `users` | 用户资料（openid、昵称、头像） |
| `config` | 管理员名单等平台配置 |

---

## ⚠️ 合规说明（个人主体小程序）

本项目按**个人主体小程序**的合规模型设计：普通用户只能「投稿」，内容经管理员在 `review` 页审核通过后才会公开（`submissions → restaurants`），不直接展示 UGC。提交微信审核时建议：
- 类目选「餐饮 - 点评与推荐」；
- 功能描述写「香港美食餐厅推荐与展示，用户可投稿、由运营审核后发布」；
- 在公众平台补全「用户隐私保护指引」（位置信息 / 相册 / 用户信息）。

---

## 📄 开源协议

本项目基于 [MIT 协议](./LICENSE) 开源。

## 📝 免责声明

本项目为非官方、个人学习/展示用途的演示项目。地图与数据由用户投稿产生，不代表任何官方立场；使用前请遵守微信公众平台相关规范与当地法律法规。
