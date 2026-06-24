# 项目名称：sekai_game

## 📖 项目概述
- **项目类型**：像素风格类银河恶魔城（2D 横版平台跳跃 + 探索 + 战斗）
- **主题/IP**：Project SEKAI（PJSK）同人游戏
- **目标平台**：网页端（浏览器）
- **部署地址**：http://lidure22.xyz/sekai_game/

## 🛠️ 技术栈
- **游戏引擎**：Phaser 3.87.0（纯静态 HTML + JavaScript，CDN 加载）
- **前端框架**：无（纯静态页面）
- **构建工具**：无（直接使用 HTML + JS，多文件通过 `<script>` 引入）
- **版本控制**：Git + GitHub
- **托管平台**：GitHub Pages
- **域名解析**：Cloudflare（DNS 加速）

## 📁 项目目录结构
```
sekai_game/
├── index.html              # 游戏主页面（引入所有 JS 文件）
├── game.js                 # Phaser 配置入口（config + new Phaser.Game）
├── style.css               # 页面样式（当前为空）
│
├── src/                    # ★ 游戏核心代码（模块化）
│   ├── SceneManager.js     # 场景过渡管理（goTo / launchOverlay / finishOverlay）
│   ├── HUD.js              # 界面系统（生命值、Feelings 条、Boss 血条、连击显示）
│   ├── entities/
│   │   ├── Player.js       # 玩家（状态机、3种攻击、连击、受击、死亡）
│   │   └── BossMafuyu.js   # Boss 真冬（2阶段 AI：近战/冲刺/解放俯冲）
│   ├── enemies/
│   │   ├── Enemy.js         # 敌人基类（受击、无敌帧、死亡粒子、可扩展）
│   │   ├── ShadowFragment.js # 地面巡逻+追击型敌人
│   │   └── FloatingShard.js  # 悬浮漂移型敌人（无重力）
│   └── scenes/
│       ├── BootScene.js     # 启动场景：加载图片 + 程序化生成纹理
│       ├── MenuScene.js     # 主菜单（粒子背景、导航、过渡动画）
│       ├── GameScene.js     # 主游戏关卡（2400×600 地图）
│       └── BossScene.js     # Boss 战（叠加层模式，GameScene 暂停）
│
├── assets/
│   ├── 游戏素材/             # ★ 角色独立美术素材（各角色使用自有文件夹，互不共用）
│   │   ├── ★ 纹理加载映射（文件夹 → Phaser 纹理键）：
│   │   │   ├── player_mfy/   → player_*      (玩家真冬：idle/att1/att2/run1~11/jump/down/weapon)
│   │   │   │   ├── mfy1.png         → player_idle
│   │   │   │   ├── mfy_att1.png     → player_att1
│   │   │   │   ├── mfy_att2.png     → player_att2
│   │   │   │   ├── mfy_down.png     → player_down
│   │   │   │   ├── mfy_jump.png     → player_jump
│   │   │   │   ├── mfy_武器1.png    → player_weapon
│   │   │   │   └── mfy_run1~11.png  → player_run1~11 (动画 key: player_run)
│   │   │   ├── boss2_mfy/   → boss_*      (Boss 真冬：独立 boss 角色)
│   │   │   │   ├── boss_mfy.png             → boss_idle
│   │   │   │   ├── boss_mfy_攻击.png       → boss_attack
│   │   │   │   ├── boss_mfy_飞行冲撞.png   → boss_dash
│   │   │   │   ├── boss_mfy_解放攻击.png   → boss_liberation
│   │   │   │   └── boss_mfy_蜷缩.png       → boss_cower
│   │   │   ├── boss1_miku/  → (预留，未实现)
│   │   │   └── weapons/     → 备用武器精灵
│   │   ├── player_mfy/      # 玩家真冬专用素材
│   │   ├── boss2_mfy/       # Boss 真冬专用素材
│   │   ├── boss1_miku/      # Boss Miku（预留）
│   │   └── weapons/         # 武器精灵素材
│   ├── images/              # 旧图文件夹（遗留，仅存敌人素材等）
│   │   ├── enemies/         # 敌人素材（已下载 625+ 文件）
│   │   │   ├── common/      # 通用小怪：slime/rat/crab/pebble/spider/swamp_thing
│   │   │   │   ├── slime_green/  slime_spiked/  dark_forest_slime/
│   │   │   │   ├── rat/  crab/  pebble/  spider/
│   │   │   │   └── swamp_thing/  enemy_death/
│   │   │   ├── floating/    # 漂浮系：bat/ghost/witch
│   │   │   │   ├── bat/  bat_1bit/  bat_calcium/
│   │   │   │   ├── ghost_cc0/  ghost_ars/  ghost_gothicvania/
│   │   │   │   └── witch/
│   │   │   ├── shadow/      # 暗影系：skeleton/golem/skull/canine/zombie
│   │   │   │   ├── skeleton/  skeleton_ars/  zombie/
│   │   │   │   ├── golem/  golem_armored/
│   │   │   │   ├── skull/  canines/
│   │   │   │   ├── swamp_thing/  rtx_monsters/
│   │   │   │   └── ───
│   │   │   └── _downloads/  # 原始 ZIP 存档及未分类素材
│   │   ├── particles/       # 粒子素材（当前为空，使用程序化生成）
│   │   ├── tilesets/        # 地图图块（可使用程序化生成的 ground/bg_tile）
│   │   └── backgrounds/     # 背景图片
│   ├── audio/               # 所有音效和音乐（暂未集成）
│   └── fonts/               # 自定义字体（暂未使用，当前使用 monospace）
│
├── design/                  # ★ 游戏设计文档
│   ├── combat-design.md
│   ├── enemy-combat-design.md
│   ├── menu-visual-design.md
│   ├── art-asset-plan.md
│   ├── mfy-player-art-plan.md
│   ├── qa-report.md
│   └── fix-validation-report.md
│
├── 游戏素材/                  # ★ 原始美术素材（.png / .svg / .webp 等）
│
├── production/               # 开发运维
│   └── session-state/
│
├── .opencode/               # OpenCode 配置（AI 工作室）
│
├── AGENTS.md                # 本文件（项目说明书）
└── README.md                # 项目介绍（面向人类）
```

## 🎮 游戏设计概要
- **核心玩法**：平台跳跃 + 探索 + 战斗
- **玩家角色**：PJSK 原创角色（像素风格，程序化纹理 + PNG 素材）
- **敌人类型**：ShadowFragment（地面巡逻+追击）、FloatingShard（悬浮漂移）、Boss Mafuyu（2阶段）
  - 已下载 625+ 像素素材(rat/slime/bat/ghost/skeleton/golem/canine 等 >20 种变体)
- **关卡设计**：线性关卡（2400×600）+ Boss 战叠加层
- **收集要素**：道具、能力升级（待设计）
- **资源系统**：Feelings（战斗积攒，随时间衰减，可通过击杀敌人获得）

## 🎮 操作说明
- **移动**：A / D 键（左右行走）
- **跳跃**：空格键 / 上方向键（↑）
- **攻击**：J 键 / Z 键（地面可连击 Attack1→Attack2，空中攻击）
- **菜单导航**：↑↓ / W S 键切换选项
- **菜单确认**：J 键 / 空格键

## 🧠 开发规范
- **代码风格**：使用 ES6 语法，变量命名采用 camelCase
- **Phaser 版本**：3.87.0（通过 CDN 加载：`phaser@3.87.0`）
- **像素尺寸**：
  - 玩家/Boss：加载大尺寸 PNG 后通过 `setScale()` 缩放（player 0.12, boss 0.18），源图建议至少 48×48+ 才能保留 PJSK 角色特征
  - 敌人：ShadowFragment 24×24, FloatingShard 16×16（程序化生成，临时占位；已下载 32×32 实际素材待替换）
  - 地面图块：64×36（程序化生成）
- **美术风格**：黑暗奇幻像素风，PJSK 角色特征（发色、服装）需保留
- **音效风格**：复古芯片音乐（Chiptune）+ 氛围音效（暂未集成）

## 🏗️ 场景架构（重要）
```
BootScene (启动加载) → MenuScene (主菜单) → GameScene (主关卡)
                       ↑                            │
                       │                     (触发 Boss 区域)
                       │                            ↓
                       └──── BossScene (叠加层) ────┘
                              │ 胜利/死亡后             
                              └── 通过 SceneManager.finishOverlay() 返回 GameScene
```
- **BootScene**：加载所有图片资源 + 程序化生成 ground/bg_tile/enemy_shadow/enemy_shard 纹理
- **MenuScene**：粒子背景，标题动画，NEW GAME / CONTINUE(disabled) / CREDITS(disabled)
- **GameScene**：2400×600 横版关卡，7个 ShadowFragment + 4个 FloatingShard，右端 Boss 触发区域
- **BossScene**：使用 `SceneManager.launchOverlay()` 叠加启动，GameScene 暂停，结束后通过 `finishOverlay()` 传回结果

## 📌 当前状态（请保持更新）

### ✅ 已完成
- [x] **Phaser 基础框架搭建**（800×600、Arcade Physics、FIT 缩放、像素模式）
- [x] **多场景系统**（Boot → Menu → Game → Boss，SceneManager 统一管理过渡）
- [x] **场景过渡管理**（fadeOut/fadeIn 切换、叠加层 launch/finish 模式）
- [x] **主菜单系统**（粒子背景、标题浮动、菜单项 fade-up 入场动画、键盘导航 + 选择高亮）
- [x] **玩家移动**（A/D 键移动，加速度+阻力模拟，最大速度限制）
- [x] **玩家跳跃**（空格/上方向键，固定跳跃速度 -400）
- [x] **地面和平台碰撞**（static group 实现平台 + 玩家/敌人物体碰撞）
- [x] **玩家攻击系统**：
  - Attack1（13伤害，7f 前摇→5f 判定→10f 后摇，可衔接 Attack2）
  - Attack2（22伤害，8f 前摇→6f 判定→12f 后摇）
  - 空中攻击（18伤害，7f 前摇→25f 判定→8f 后摇，带下压）
  - J/Z 双键绑定，输入缓冲（5帧 buffer）
- [x] **敌人 AI**：
  - **ShadowFragment**（巡逻型）：地面巡逻 → 玩家进入 150px 范围 → 追击（65速度）→ 超出 200px 或碰墙 → 返回巡逻
  - **FloatingShard**（悬浮型）：原点悬浮 + 正弦波动 → 玩家进入 100px → 漂移追击 → 超出 150px → 返回原点
- [x] **敌人受击系统**（无敌帧 30帧、白色闪白、击退、死亡粒子爆发）
- [x] **Boss 战（Mafuyu 真冬）**：
  - Phase 1：近战攻击 + 冲刺攻击，HP ≤ 50% 进入 Phase Transition
  - Phase 2：解放形态，新增解放俯冲（大范围），冲刺变为 3连段，空中悬浮 AI
  - Boss 血条（渐变颜色，低血量闪红警告）
  - 击败后显示 "MEMORY FRAGMENT ACQUIRED" 胜利文字
- [x] **基础地图系统**：2400×600 世界、重复背景 tile、多个平台位置、相机跟随+deadzone
- [x] **UI 系统（HUD）**：
  - 心形生命值条（10格，每格 10HP，已损失半格渐变显示）
  - Feelings 资源条（上限 100，击中+8，受击+5，击杀敌人额外+2~+5，随时间衰减）
  - Boss 血条（渐变颜色，低血量闪烁效果）
  - 连击显示（RESONANCE ×N，2秒超时归零）
- [x] **Combo/Feelings 系统**（连击计数+资源管理，击中刷新计时，受击清空连击）
- [x] **击中特效**（白色粒子爆发 + 相机震动，Boss 战增加 hitStop）
- [x] **无敌帧**（玩家 30帧，敌人 30帧，Boss 8帧）
- [x] **程序化纹理生成**：ground、bg_tile、enemy_shadow、enemy_shard
- [x] **玩家死亡处理**：透明度渐隐渐出，Boss 战死亡通过 overlay 回调传回 GameScene
- [x] **敌人素材库扩展**：从 OpenGameArt 下载 10 个素材包，625+ 文件，涵盖 common/floating/shadow 三大类（slime/rat/crab/bat/ghost/skeleton/golem/canine 等 20+ 种敌人变体）
- [x] **玩家纹理重映射**：player_mfy → player_* (idle/att1/att2/run1~11/jump/down/weapon)
- [x] **玩家跑步动画**：11帧跑步循环（player_run1~11，16.7fps），通过 Phaser Animation 播放
- [x] **玩家武器精灵**：跟随角色的 weaponSprite（player_weapon，随翻转/移动同步更新位置）
- [x] **角色素材分离**：玩家使用 player_mfy/，Boss2 使用 boss2_mfy/，互不共用图片

### ❌ 未完成
- [ ] **关卡内收集系统**（血瓶、Feelings 碎片、能力升级等）
- [ ] **存档/读档系统**（"CONTINUE" 菜单项已禁用）
- [ ] **Credits 界面**（菜单项已禁用）
- [ ] **更多关卡/地图区域**（目前只有 2400×600 单屏线性关卡）
- [ ] **玩家 defeat/vanish 动画**（player_defeat*.png, player_vanish*.png 已存在但未使用）

### 📋 待办（优先级排序）
1. **敌人纹理替换**（用已下载的 32×32 像素素材替换程序化生成的 enemy_shadow/enemy_shard，需更新 BootScene 加载方式和碰撞体尺寸）
2. **添加关卡内收集物**（血瓶补充 HP、Feelings 碎片、钥匙/能力道具）
3. **集成音效**（跳跃、攻击命中/未命中、受击、Boss 战 BGM、菜单导航）
4. **扩展地图**（更多区域、分支路径、传送点）
5. **实现存档系统**（Save/Load，解锁 "CONTINUE" 菜单项）
6. **Credits 界面**（解锁菜单项，展示制作人员）
7. **玩家动画完善**（使用已有的 player_down/defeat/vanish 纹理实现完整动画状态机）
8. **游戏循环完善**（GameScene Boss 战后的世界状态变化、难度递增）
9. **性能优化**（优化纹理/物理对象数量，相机剔除）

## 🤖 AI 协作指南
- 所有专家请以本文档为**最高优先级**参考
- 如有疑问，请先查阅 `AGENTS.md` 再行动
- 重大变更（如技术选型变更、方向调整）需更新本文档
- 新功能开发前，请先参考待办列表，避免重复工作
- **代码已模块化到 `src/` 目录**，修改前请确认对应的文件

## ⚠️ 重要提醒
- 本项目为 PJSK **同人游戏**，所有素材（角色、背景等）须为**原创或 CC0 授权**，严禁使用官方版权素材
- 项目为**非商业用途**，仅供学习和同人创作交流
- 代码提交前请确保 `index.html` 和 `src/**/*.js` 无语法错误
- **新增 JS 文件时，请同时在 `index.html` 中添加对应的 `<script>` 标签**（注意加载顺序：SceneManager → HUD → entities → enemies → scenes → game.js）

---

**最后更新时间**：2026-06-24
**维护者**：lidure
