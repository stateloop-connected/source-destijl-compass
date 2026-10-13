# 几何构成 3D · De Stijl Compass
> 用圆规与直尺，构造蒙德里安的秩序。
> Straightedge and compass, in Mondrian's order.

一个用 **three.js** 写的三维尺规作图游戏：把经典的尺规作图搬到蒙德里安式的三维制图台上。
A 3D straightedge-and-compass construction game built with **three.js**, staged on a De Stijl drafting table.

**中英双语**（右上角 / `L` 切换）· 11 关 · 三维圆规 · 自动求交 · 星级评价
**Bilingual (zh/en)** · 11 levels · 3D compass · automatic intersections · star rating

---

## 玩法 · How to play
| 工具 Tool | 说明 |
| --- | --- |
| **点 Point** `1` | 在桌面空白处放置自由点 · drop a free point on the table |
| **线段 Segment** `2` | 依次点击两点连成线段 · click two points to join them |
| **圆 Circle** `3` | 先点圆心，再点半径端点 · centre, then a radius point |
| **球 Sphere** `4` | 三维圆规：以圆心与半径点作出球面 · the 3D compass |
| **移动 Move** `5` | 拖动自由点，所有派生对象实时重算 · drag free points, everything follows |

**自动求交** — 任意两条线段、圆或球相交时，交点 / 交线会自动生成并保持联动：

* 线段 ∩ 线段 → 点
* 线段 / 圆 / 球 两两相交 → 点
* 球 ∩ 球 → 圆（正四面体那一关的关键）
* 圆 ∩ 桌面 → 点

拖动画布上的自由点，整张构造图会实时重算。**球 ∩ 球得到圆、圆 ∩ 桌面得到点**，这就是把二维作图延伸到三维的钥匙。

**视角** — 可以 360° 自由旋转：拖动旋转，滚轮缩放，右键平移，`F` 回到本关默认视角。

**星级** — 以「标准步数」（par）完成得三星，多两步以内两星。步数越少，构造越优雅。

**过关判定** — 必须把图形**真正画出来**：例如等边三角形要求三条边都画出，正方形要求四条边围合，正四面体要求六条棱全部连起来。仅有交点不算完成。

### 快捷键 Shortcuts
`1`–`5` 切换工具 · `Esc` 取消 / 返回 · `Ctrl`+`Z` 撤销 · `R` 重置本关 · `H` 提示 · `F` 复位视角 · `L` 中英切换

---

## 关卡 Levels
| # | 关卡 | Level | Par |
| --- | --- | --- | --- |
| 1 | 等边三角形 | Equilateral Triangle | 4 |
| 2 | 线段中点 | Midpoint | 3 |
| 3 | 垂直平分线 | Perpendicular Bisector | 3 |
| 4 | 角平分线 | Angle Bisector | 4 |
| 5 | 过点作垂线 | Perpendicular Through a Point | 4 |
| 6 | 外接圆 | Circumcircle | 7 |
| 7 | 正方形 | Square (on a diagonal) | 8 |
| 8 | 正六边形 | Regular Hexagon | 10 |
| 9 | 黄金分割 | Golden Section | 3 |
| 10 | 圆的切线 | Tangent to a Circle | 5 |
| 11 | 正四面体 | Regular Tetrahedron (3D) | 9 |

此外还有**自由作图**模式（无目标，随便构造）。

每一关的判定都是**几何关系判定**，不绑定特定作法：任何满足题目关系的构造都会通过。
Every check tests the geometric relation, not a particular method.

---

## 运行 · Run
```bash
npm install
npm run dev      # http://localhost:5178
npm run build    # 输出到 docs/ (GitHub Pages 直接托管)
npm test         # 几何引擎与关卡可解性测试
```

## 结构 · Layout
```
index.html            页面骨架 / HUD
src/
  main.js             入口
  app.js              控制器：路由、指针交互、相机取景、计分、成就
  styles.css          De Stijl 样式
  core/
    config.js         常量与调色板
    math3.js          纯 3D 解析几何（球∩球、圆∩圆、圆∩平面…），零依赖
    model.js          构造图：对象、依赖关系、自动求交、撤销历史
    session.js        模型 × 关卡：给定条件、用户操作、计分
    levels.js         11 个关卡：判定函数、提示、par
    scene3d.js        three.js 场景：制图台、纸纹网格、De Stijl 背景、灯光
    visuals.js        构造对象 → three.js 对象（实线=所画，虚线=辅助/预览）
    camera.js         （取景逻辑在 app.js 中，使用数值拟合）
    audio.js          WebAudio 合成音效（不附带任何音频文件）
    i18n.js           中英文案
    storage.js        localStorage 进度 / 成就 / 设置
public/
  fonts/              Space Grotesk (SIL OFL 1.1)
  textures/           Mondrian 原作（公有领域，见 CREDITS.md）
test/                 26 个 node 测试：几何引擎 + 每关在 par 步内可解
tools/                贴图压缩脚本
docs/                 构建产物（GitHub Pages 发布目录）
```

## 设计要点 · Notes
* **几何引擎与渲染完全解耦**：`math3.js` / `model.js` / `levels.js` 不依赖 DOM 或 three.js，因此整局游戏可以在 node 里被完整模拟与测试（`npm test` 会为每一关实际跑一遍标准作法，并断言步数 ≤ par）。
* **依赖图 + 拓扑重建**：派生对象按插入顺序重建（插入顺序天然是拓扑序），拖动自由点时整张图实时联动。
* **自动求交有上限**：空间哈希去重 + 迭代上限 + 对象总数上限，避免病态爆炸。
* **性能**：脏标记渲染、共享材质、按 id 复用对象、圆的几何体只在半径真正变化时重建。
* **纸纹网格**：程序化生成的三级网格（10 / 50 / 100 单位）+ 坐标轴与刻度 + 颗粒噪点 + 暗角。
* **光照按物理单位标定**：总辐照度约为 π，使纸面 albedo 1:1 呈现，网格与纸纹才不会被过曝冲白。

## 授权 · License
代码以 **MIT** 授权，见 [LICENSE](LICENSE)。第三方素材（three.js、字体、Mondrian 原作）的来源与许可见 [CREDITS.md](CREDITS.md)。
Code is MIT. Third-party assets are listed in [CREDITS.md](CREDITS.md).
