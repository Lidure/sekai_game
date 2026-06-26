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
├── AGENTS.md               # 本文件（项目说明书）
│
├── src/                    # ★ 游戏核心代码（模块化）
│   ├── SceneManager.js     # 场景过渡管理（goTo / launchOverlay / finishOverlay）
│   │                       # 也定义 GAME_FONTS 全局字体样式
│   ├── HUD.js              # 界面系统（生命值、Feelings 条、Boss 血条、连击显示、能力图标）
│   │
│   ├── entities/
│   │   ├── Player.js       # 玩家 Mafuyu（状态机、3种攻击+剑技3连击、冲刺、二段跳、连击、受击、死亡）
│   │   └── BossMafuyu.js   # Boss 真冬（2阶段 AI：近战/冲刺/解放俯冲，绝望模式）
│   │
│   ├── enemies/
│   │   ├── Enemy.js         # 敌人基类（受击、无敌帧、死亡粒子、可扩展）
│   │   ├── ShadowFragment.js # 地面巡逻+追击型敌人
│   │   ├── FloatingShard.js  # 悬浮漂移型敌人（无重力）
│   │   ├── Bat.js            # 蝙蝠：巡逻→追击→撤退 AI，正弦摆动飞行
│   │   └── Skeleton.js       # 骷髅：巡逻→接近→近战攻击，带前摇/判定/后摇
│   │
│   ├── systems/
│   │   ├── Bench.js          # 长椅：恢复+保存点，程序化图形渲染
│   │   ├── NPC.js            # NPC 对话系统（接近提示、打字机效果对话框、多行对话）
│   │   ├── Collectible.js    # 收集物（HP 上限/Feelings 上限提升、治疗球）
│   │   ├── AbilityItem.js    # 能力道具（冲刺/二段跳/剑，菱形晶体+获取动画）
│   │   └── AbilityGate.js    # 能力门（紫色屏障，获得能力后解锁消失）
│   │
│   ├── scenes/
│   │   ├── BootScene.js      # 启动场景：加载所有图片+音频+程序化纹理+动画
│   │   ├── MenuScene.js      # 主菜单（粒子背景、标题动画、NEW GAME/CONTINUE/CREDITS）
│   │   ├── GameScene.js      # 主游戏关卡（房间式架构，960×720/房间，8个房间）
│   │   ├── BossScene.js      # Boss 战（叠加层模式，GameScene 暂停）
│   │   └── CreditsScene.js   # 滚动致谢名单
│   │
│   └── ui/
│       ├── PauseMenu.js      # 暂停菜单（Resume/Main Menu/Fullscreen/Voice 滑块）
│       └── MapView.js        # 地图系统（M 键打开，区域探索状态、POI 标记、玩家位置）
│
├── scripts/                  # 开发工具脚本
│   └── generate-tilemaps.js  # 从 RoomDef 数据生成 Tiled .tmj 地图文件
├── assets/
│   ├── audio/                # 音效和音乐（7 BGM + 25+ SFX，已全部集成）
│   │   ├── bgm/              # menu_title, chiptune_exploration, boss_p1, boss_p2
│   │   └── sfx/              # player/sword/enemy/ui/combo 子目录
│   ├── images/               # 角色+敌人+道具 PNG 素材
│   │   ├── player_mfy/       # 玩家 Mafuyu 动画帧
│   │   ├── boss2_mfy/        # Boss Mafuyu 各状态帧
│   │   └── enemies/          # 已下载 625+ 像素敌人素材（待替换程序化纹理）
│   ├── maps/                 # Tiled .tmj 地图文件（8 房间）
│   │   ├── room_intro.tmj
│   │   ├── room_ascent.tmj
│   │   └── ...
│   └── 游戏素材/              # 原始美术素材归档
│
├── design/                   # ★ 游戏设计文档
│   ├── combat-design.md      # 战斗系统设计（玩家+ Boss+ HUD）
│   ├── audio-direction.md    # 音频设计文档
│   ├── sword-design.md       # 剑技升级系统设计
│   └── ...                   # 其他设计文档
│
└── production/               # 开发运维
    └── session-state/
```

## 🎮 操作说明
| 操作 | 按键 |
|------|------|
| 移动 | A / D |
| 跳跃 | K |
| 攻击（地面连击） | J（Attack1 → Attack2，有剑则 Attack3） |
| 空中攻击 | 跳跃中按 J |
| 冲刺 | L |
| 望远 | 长按 W / S |
| 地图 | M |
| 暂停 | ESC / P |
| 菜单导航 | ↑↓ / W S |
| 菜单确认 | J / Space / Enter |
| 对话推进 | J |

## 🧠 开发规范
- **风格**：ES6，camelCase，Phaser 3.87.0（CDN）
- **游戏分辨率**：1280×720（16:9），`Phaser.Scale.FIT` + `CENTER_BOTH`
- **缩放**：player setScale(0.63，~40px显示)，boss 0.18，敌人因类型而异
- **美术**：黑暗像素风，25-ji 色调（深蓝/青绿/紫），monospace 字体

## 🏗️ 场景架构
```
BootScene → MenuScene → GameScene ←→ BossScene (叠加层)
                            ↑              │
                            └── CreditsScene
```
- **BootScene**：加载所有资源 + 程序化纹理 + 玩家跑步动画
- **MenuScene**：粒子背景，NEW GAME / CONTINUE（有存档时激活）/ CREDITS
- **GameScene**：**房间式架构**，8 房间（960×720，竖井 720×960），自动等比填充游戏分辨率，房间过渡渐变黑→淡入，所有对象按房间构建/销毁。Tilemap .tmj 驱动所有几何/对象数据，RoomDef 只保留元数据
- **BossScene**：叠加层模式，2 阶段 Boss 战，胜利/死亡回调
- **CreditsScene**：自动滚动致谢，J 跳过/返回

## 🎮 游戏系统总览

### 玩家系统（Player.js）
- **状态机**：idle / run / jump / fall / attack1~3 / air_attack / hurt / dead / dash
- **地面连击**：Attack1（13/16 伤害）→ Attack2（22/24）→ [有剑] Attack3（35）
- **空中攻击**：18/22 伤害，下压 +120→+200px/s
- **冲刺**：L，快速水平移动
- **二段跳**：获得能力后可用
- **剑技**：SWORD OF TRUTH 道具获取，攻击增强+第三段连击
- **Feelings**：上限 100（可提升至 150），击中+8，受击+5，每秒衰减-1

### 敌人系统
| 类型 | HP | 接触伤害 | Feelings 掉落 | 行为 |
|------|----|---------|--------------|------|
| ShadowFragment | 3 | 5 | +2 | 地面巡逻→追击→返回 |
| FloatingShard | 4 | 8 | +5 | 悬浮漂移→漂移追击 |
| Bat | 3 | 6 | +3 | 正弦飞行→追击→撤退 |
| Skeleton | 8 | 3(体)/12(攻) | +8 | 巡逻→接近→近战攻击 |
| Boss Mafuyu | 300 | 5(体)/12~20(攻) | — | 2 阶段 AI |

### 探索系统
- **长椅**（4个）：恢复 HP/Feelings + 保存 + 重置敌人
- **NPC**（2个）：打字机效果对话，25-ji 风格剧情
- **收集物**：HP 上限提升（+10）、Feelings 上限提升（+50）、治疗球（+30 HP）
- **能力道具**：冲刺（x=2000）、二段跳（x=3200）、剑（x=2500）
- **能力门**：3 道紫色屏障（冲刺/二段跳/冲刺）
- **地图**：M 键打开，7 区域探索追踪，POI 标记
- **地图呈现基线**：保持房间图式，但视觉要克制，节点/连线/当前房间提示需接近 HK 的信息密度，不再回到“世界大地图”表达
- **跳跃手感基线**：当前跳跃以 HK 为参考，重点是更低的起跳高度、更快的下落、更明确的松键截断，不要改回漂浮型跳跃
- **单向门**：x=1600，阻止从左向右穿行

### UI 系统
- **HUD**：心形血条（10 格）、Feelings 条、Boss 血条、连击显示（RESONANCE ×N）、能力图标
- **暂停菜单**：Resume / Main Menu / Fullscreen 切换 / Voice 滑块
- **地图**：区域颜色区分（已探索/未探索），平台简图，POI 标记

### 存档系统
- **方式**：localStorage，5 槽位 `sekai_save_0` ~ `sekai_save_4`
- **触发**：暂停菜单 SAVE → 选槽位保存
- **读档**：主菜单 LOAD GAME → 选槽位读档
- **数据**：HP / Feelings / 能力 / 位置 / 已杀敌人 / 已收集道具 / 时间戳

### 音频系统（全部已集成）
- **BGM**：菜单、探索、Boss Phase1、Boss Phase2（含交叉淡入淡出）
- **SFX**：玩家（跳跃/攻击/受击/死亡）、武器、敌人（受击/死亡/吼叫）、UI（导航/确认）、连击
- **音量控制**：暂停菜单中 Voice 滑块可调节全局音量

### 视觉系统
- **粒子**：击中白色爆发、收集物彩色爆发、能力门解锁爆发、菜单背景浮动粒子
- **屏幕效果**：相机震动、hitStop（冻结帧）、flash（闪白/淡蓝）
- **纹理**：地面 tiles（Kenney 像素平台素材区色调合成）、视差背景（seamless-parallax-cave 实景洞窟）、场景装饰（warped-caves 道具素材）. 火炬/水晶/垂藤仍为程序化
- **跑步动画**：11 帧循环（16.7fps），基于 Phaser Animation

## ✅ 当前状态

### ✅ 已完整实现
- [x] Phaser 基础框架 + 场景系统 + 过渡管理
- [x] 主菜单（粒子、标题、菜单动画、键盘导航）
- [x] 玩家 Mafuyu（idle/run/jump/attack1~3/air/dash/doubleJump/hurt/dead）
- [x] 完整 3 段地面连击 + 剑技升级系统
- [x] 4 种敌人（ShadowFragment / FloatingShard / Bat / Skeleton）+ 基类
- [x] Boss Mafuyu 2 阶段 + 绝望模式
- [x] 房间式架构（8 房间，RoomDef.js 驱动，过渡渐黑淡入）
- [x] 4400×600 世界 → 已重构为房间式架构（960×720/房间）
- [x] 长椅休息+保存系统（4 个长椅）
- [x] NPC 对话系统（2 个 NPC，打字机效果）
- [x] 收集物系统（3 种类型，持久化追踪）
- [x] 能力道具系统（冲刺/二段跳/剑）
- [x] 能力门系统（3 道，紫色屏障）
- [x] 地图系统（M 键，区域探索，POI）
- [x] 单向门（秘密区域出口）
- [x] 暂停菜单（Resume/Menu/Fullscreen/Voice）
- [x] HUD（血条/Feelings/Boss血条/连击/能力图标）
- [x] 音频系统（7 BGM + 25+ SFX 全部集成）
- [x] 存档/读档系统（localStorage）
- [x] Credits 场景（自动滚动致谢）
- [x] 击中特效（粒子+震动+hitStop）
- [x] 受伤无敌帧（玩家 30f，敌人 30f，Boss 8f）
- [x] 玩家跑步动画（11 帧循环）
- [x] 玩家死亡处理（Boss 战通过 overlay 回调）
- [x] `broken_seikai_bg` 已作为第一大关背景接入，后续资源清理不要误删
- [x] `broken_seikai_bg` 当前以整张底图方式适配第一关，不要再改回只靠 tile 的弱表现
- [x] 第一关背景已提亮，当前以底图 + 轻色洗 + 低强度近景层呈现，不要再加重黑色遮罩
- [x] 骷髅敌人 sheet 已在 BootScene 中做紫底去除并拆成透明纹理，不要再直接用原始方底图渲染
- [x] `broken_seikai_bg` 章节背景已改为按全局章节坐标滚动，横向相邻房间不要再让背景相位重置
- [x] `broken_seikai_bg` 章节背景已固定铺满画布高度，不要再按素材原始高度显示
- [x] `broken_seikai_bg` 原图仅 544px 高，禁止再做纵向拉伸；若要补满 720px，应使用重复/补边而不是缩放
- [x] `broken_seikai_bg` 已改回等比例 cover 铺满画布，不要再恢复非等比拉伸
- [x] `MapView` 已改为直接读取 `currentRoomId / player.x / player.y / visitedRooms`，不要再恢复旧的全局坐标偏移映射
- [x] 当前跳跃参数已收紧到更接近 HK 的手感基线，后续只做小幅迭代，不要回滚到高浮空值
- [x] 当前攻击基线已向 HK 收紧：攻击前摇短、收招短、空中下压更快、命中反馈更强
- [x] 当前操作键位已更新为 J 攻击 / K 跳跃 / L 冲刺，W/S 只用于移动与镜头俯仰，不要再恢复旧的跳跃键位
- [x] 房间边界/出口视觉已向 HK 收敛：窄门框、短黑场切换、克制的出口提示，不要恢复大块发光标记
- [x] 房间边界只允许轻量外轮廓，不要再做内凹双线框或大面积黑色门洞，否则会出现“坑”感

### ❌ 未完成 / 待改进
- [x] **程序化纹理替换**：`enemy_shadow`(slime)/`enemy_shard`(ghost)/`enemy_bat`(bat)/`enemy_skeleton`(spritesheet) 已用实际像素素材替代
- [x] **素材包纹理升级**：地面 tiles（Kenney 像素平台素材区色调合成 7 区域风格）、视差背景（seamless-parallax-cave 实景洞窟 4 层）、场景装饰钟乳石（warped-caves 道具素材替换程序化纹理）
- [x] **背景视差层**：`bg_tile` 已替换为 3 层视差背景（远山 bg_far 0.05x / 中云 bg_mid 0.15x / 近栅格 bg_near 0.3x）
- [x] **地面图块多样化**：7 区域各有独立风格（intro 蓝灰 / ascent 紫 / secret 古金 / lower 暗绿 / mid 赤红 / preboss 焦黑 / boss 紫黑）
- [x] **场景装饰**：新增钟乳石、发光水晶、火炬（脉动）、垂藤、符文光点、区域标识文字
- [x] **Tilemap 迁移（Phase 1）**：RoomDef 精简为纯元数据（~95 行），GameScene 使用 Tiled .tmj 地图文件加载所有几何/对象数据，所有 `_build*` 方法改为从 `_spawn*` 数组读取
- [x] **平台碰撞修复**：TMJ Platform 层 y=0（移除 -16 偏移），tile row = T-1
- [x] **平台视觉改进**：tile layer alpha 0 → Graphics 绘制暗青填充 + 青色 3px 顶边
- [x] **空中攻击系统重写**：移除 velocity 限制/上限钳制；下压力 +520→+180/dt（HK 风格轻触）
- [x] **战斗数值重平衡**：Attack1 13→2, Attack2 22→4/5, Air 18/22→3/5, Attack3 28→6
- [x] **NPC 对话框 Zoom 修复**：`_recalcBox()` 将位置/尺寸除以 `cameras.main.zoom`
- [x] **所有长椅移除**：4 房间 bench 数据清除 + `_restAtBench`/`_getNearbyBench`/`benchesUsed` 代码删除
- [x] **所有房间装饰移除**：8 房间 `decorations: {}` + TMJ 再生
- [x] **NPC 安全区**：ascent/mid 房间最近敌人从 x=240 移到 x=360
- [ ] **Feelings 特殊攻击**：消耗 50 Feelings 的大范围斩击（已设计，待实现）
- [ ] **玩家跳跃/落地动画**：squash & stretch
- [ ] **HK 化继续微调**：如果继续调手感，只允许围绕跳跃高度、起跳截断、落地停顿、空中加速度做小幅迭代
- [ ] **Boss 攻击纹理修复**：`melee_active` 应显示 `boss_melee1` 而非 `boss_attack`
- [ ] **更多敌人类型**（从 625+ 素材中选择 3-5 种）
- [ ] **世界状态变化**：Boss 击败后的场景变化
- [ ] **音频闪避**（Ducking）：受伤时 BGM 降音量
- [ ] **HUD 动画润色**：心形受伤动画、Feelings 条满时发光

### 📋 当前 Sprint 计划
**Sprint 1 - 视觉资产大替换（已完成）：**
1. ✅ 敌人纹理替换（程序化→实际像素素材）
2. ✅ 背景视差分层（3层：远山 0.05x / 中云 0.15x / 近栅格 0.3x）
3. ✅ 地面图块多样化（7 区域不同风格）
4. ✅ 环境装饰元素（钟乳石/水晶/火炬/垂藤/符文光点/区域标识）

**Sprint 2（当前）- 房间式架构：**
1. ✅ 设计文档（ADR-0001）+ RoomDef.js 数据定义
2. ✅ GameScene.js 重构：8 房间，过渡系统，按房间创建/销毁
3. ✅ 存档系统适配：房间坐标/abilities 对象/all-room benches 持久化
4. ✅ 素材包整合（warped-caves/kenney/seamless-cave：地面 tiles、视差背景、钟乳石装饰）
5. ✅ 地图系统（MapView）改为房间网格并按 HK 风格收敛呈现

**Sprint 3 - 游戏反馈打磨（已完成）：**
角色动画完善、击中特效升级、屏幕特效、摄像机润色

**Sprint 4 - 音频系统完整集成：**
缺失 SFX 接入、BGM 动态切换、音频 Ducking、菜单音效完善

**Sprint 5 - 内容扩展：**
新敌人类型、Feelings 特殊攻击、绝望模式增强、世界状态持久化

**Sprint 6 - UI/UX 打磨：**
主菜单粒子增强、HUD 动画、暂停菜单设置页、地图系统美化

**Sprint 7（当前）- Tilemap 迁移（Phase 1 - Generator + GameScene）：**
1. ✅ 写 `scripts/generate-tilemaps.js` 从旧 RoomDef 数据生成 8 个 `.tmj` 文件
2. ✅ `BootScene.js` 添加 8 行 `this.load.tilemapTiledJSON()`
3. ✅ `RoomDef.js` 精简为纯元数据（~95 行，删掉所有坐标数组 + 装饰 + spawn 数据）
4. ✅ `GameScene.js` `_buildRoom` 重写为 tilemap 加载：`this.make.tilemap()` → createLayer → setCollisionByProperty → `_parseObjectLayers()` 读取 Exits/SpawnPoints/Gates/Doors/Decorations 对象层
5. ✅ 移除 `_buildGround`/`_buildPlatforms`（被 tilemap Ground/Platforms 层代替）
6. ✅ 旧 `_buildEnemies`/`_buildBenches`/`_buildNPCs`/`_buildCollectibles`/`_buildAbilityItems`/`_buildAbilityGates`/`_buildOneWayDoors`/`_buildBossTrigger`/`_buildDecorations` 全部移除 → 改为 `_build*FromSpawns` 从 `this._spawn*` 产物读取
7. ✅ `_checkExits` → 改用 `this._roomExits`（tilemap Exits 对象层）
8. ✅ `_setupRoomBoundary` / `_buildBackground` → 用 `this._roomPixelWidth/Height`
9. ✅ `MapView.js` → 用 `RoomDef.CONNECTIONS` 替代 `room.def.exits`；POI 简化；player marker 用常量宽高
10. ✅ `_clearRoom` 清理新增数组（`_oneWayDoorZones`/`_oneWayDoorGraphics`）
11. ✅ **player scale 0.63→0.85** + collision body 14×20→18×26 + hitbox 等比放大
12. ✅ **camera profiles**：default zoom 2.6×, shaft 1.6×, boss 1.3×（含 deadzone 重算）
13. ✅ **敌人缩放**：SF 1.0→1.35 / Shard 0.8→1.1 / Bat 0.1→0.14 / Skeleton 1.0→1.35 / Boss 0.18→0.24
14. ✅ **地面图块 64×64→16×16px 重制**：flat noise 纹理（去 3D 立体感），7 区域
15. ✅ **Tilemap 格子 32×32→16×16**：TMJ 再生（80×46 正常 / 60×61 shaft），地面碰撞 y=680（行 43，-8 offset），平台 y=T×16+8（-16 offset）
16. ✅ **平台布局重新设计**：8 房间全 HK 式阶梯（≤48px 步进），由 level-designer agent 完成
17. ✅ **平台薄视觉**：2px 青主线 + 1px 阴影 / 16×16 tile（tile layer alpha 0.15）
18. ✅ **enemyGroup 碰撞修复**：添加与 `_tileGround` 的碰撞（之前只撞平台）
19. ✅ **spawn 坐标校准 +24px**：benchY 666 / exit.y 624 / exit.targetY 660 / NPC y 660
20. ✅ **全部 23 JS 文件 node --check 通过**，8 TMJ 文件有效 JSON
21. ❌ 全流程验证（房间过渡 → 能力门 → Boss → 存档/读档）——TMJ 已再生 + 语法通过
22. ❌ Boss attack 纹理修复（`melee_active` → `boss_melee1`）：等待用户提供素材

## 🤖  AI 协作指南
- **最高优先级**：以 `AGENTS.md` 为项目状态唯一 Source of Truth
- 重大变更必须更新本文档
- 新 JS 文件需在 `index.html` 添加 `<script>` 标签
- 加载顺序：SceneManager → HUD → systems → entities → enemies → ui → scenes → game.js
- 代码提交前确保无语法错误

## ⚠️ 重要提醒
- PJSK 同人游戏，**非商业用途**
- 素材须为**原创或 CC0 授权**，严禁官方版权素材
- 首次执行任何任务前，请先阅读此文档了解当前状态

---

**最后更新时间**：2026-06-27（5 存档槽系统 + 暂停菜单 SAVE / 主菜单 LOAD GAME）
**维护者**：lidure

## Relevant Files
- `scripts/generate-tilemaps.js`：单数据源（ROOMS 字典含所有 8 房间的平台/出口/spawn 数据），所有装饰已清除，所有 benches: []；TMJ 再生 `node scripts/generate-tilemaps.js`
- `src/scenes/GameScene.js`：`_buildRoom` tilemap 加载；地面层 `TILE_OFFSET_Y + 8` offset；platform layer y=0（无偏移），碰撞=visual=row×16；damage 值已重平衡；bench/rest 代码已删除
- `src/scenes/BootScene.js`：preload 加载 8 个 tilemap JSON + 7 个 16×16 地面纹理
- `src/entities/Player.js`：跳跃 -280；body 18×26 @ scale 0.85；air attack 无 velocity 限制/上限钳制
- `src/systems/NPC.js`：`_recalcBox()` 将 box 位置/尺寸除以 `cameras.main.zoom`，对话框在 zoom 2.6×/1.6×/1.3× 下均可见
- `src/systems/RoomDef.js`：精简元数据 + CONNECTIONS 表
- `src/ui/MapView.js`：使用 `RoomDef.CONNECTIONS` + 常量宽高
- `src/ui/SaveSlotPicker.js`：5 存档槽选择器，暂停菜单 SAVE + 主菜单 LOAD GAME 共用
- `assets/maps/*.tmj`：8 房间，16×16 网格，平台 row T（TMJ y=0，无 -16 偏移），无装饰/长椅对象
