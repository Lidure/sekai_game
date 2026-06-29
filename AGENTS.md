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
│   │   ├── Enemy.js             # 敌人基类（受击、无敌帧、死亡粒子、pogo检测）
│   │   ├── ShadowFragment.js    # HK式：120px leash，Quick Pounce+Rush双攻击
│   │   ├── FloatingShard.js     # HK式：120px leash，Quick Burst+Cross Barrage
│   │   ├── Bat.js               # HK式：150px leash，Swoop+Dive双攻击模式
│   │   ├── Skeleton.js          # HK式：120px leash，Shield Bash+Melee+Backstep
│   │   ├── BloatedShadow.js     # HK式：150px leash，Slam+Sweep+child spawn
│   │   └── WandererCrystal.js   # HK式：160px leash，Laser+Pulse Burst
│   │
│   ├── systems/
│   │   ├── Bench.js          # 长椅：恢复+保存点，程序化图形渲染
│   │   ├── NPC.js            # NPC 对话系统（接近提示、打字机效果对话框、多行对话）
│   │   ├── Collectible.js    # 收集物（HP 上限/Feelings 上限提升、治疗球）
│   │   ├── AbilityItem.js    # 能力道具（冲刺/二段跳/剑，菱形晶体+获取动画）
│   │   ├── AbilityGate.js    # 能力门（紫色屏障，获得能力后解锁消失）
│   │   └── DestructibleWall.js # 可破坏墙（HK 式，攻击击碎，3 级裂缝渐进）
│   │
│   ├── scenes/
│   │   ├── BootScene.js      # 启动场景：加载所有图片+音频+程序化纹理+动画
│   │   ├── MenuScene.js      # 主菜单（粒子背景、标题动画、NEW GAME/CONTINUE/CREDITS）
│   │   ├── GameScene.js      # 主游戏关卡（房间式架构，960×720/房间，8个房间）
│   │   ├── BossScene.js      # Boss 战（叠加层模式，GameScene 暂停）
│   │   └── CreditsScene.js   # 滚动致谢名单
│   │
│   └── ui/
│       ├── PauseMenu.js      # 暂停菜单（Resume/Status/Save/MainMenu/Fullscreen/Language/主音量滑块）
│       ├── MapView.js        # 地图系统（M 键打开，HK风格房间图、平台简图、方向箭头、图例、POI标记）
│       ├── CharacterPanel.js # 角色信息面板（Tab/暂停菜单打开，HP/Feelings/能力/地图进度/战斗统计）
│       └── MobileControls.js # 移动端触屏虚拟按键（左/右/跳跃/攻击/冲刺，设置菜单 PC/Mobile 切换）
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
│   ├── maps/                 # Tiled .tmj 地图文件（9 房间）
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
| 角色面板 | Tab |
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
- **GameScene**：**房间式架构**，9 房间（960×720，竖井 720×960），自动等比填充游戏分辨率，房间过渡渐变黑→淡入，所有对象按房间构建/销毁。Tilemap .tmj 驱动所有几何/对象数据，RoomDef 只保留元数据
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
| ShadowFragment | 12 | 1 | +2 | HK式120px leash，Ambush→Alert→Pounce/Rush→Daze，受击分裂 |
| FloatingShard | 15 | 1 | +5 | HK式120px leash，Hover→Drift→Homing/Quick Burst→Recover |
| Bat | 8 | 1 | +3 | HK式150px leash，Patrol→Chase→Swoop→Dive→Recover |
| Skeleton | 25 | 1 | +8 | HK式120px leash，Patrol→Approach→Bash/Melee→Backstep，35%格挡，≤5HP怒 |
| BloatedShadow | 18 | 3 | +8 | HK式150px leash，Chase→Slam→Sweep→Vulnerable，4s生成分身 |
| WandererCrystal | 10 | 1 | +6 | HK式160px leash，Aim→Laser/Pulse Burst→Cooldown |
| Boss Mafuyu | 600 | 5 | — | 2 阶段 AI + 绝望模式 |

### 探索系统
- **长椅**（4个）：恢复 HP/Feelings + 保存 + 重置敌人
- **NPC**（2个）：打字机效果对话，25-ji 风格剧情
- **收集物**：HP 上限提升（+10）、Feelings 上限提升（+50）、治疗球（+30 HP）
- **能力道具**：冲刺（lower）、二段跳（preboss）、剑（mid）
- **能力门**：3 道紫色屏障（dash/shadowCloak/doubleJump）
- **地图**：M 键打开，9 区域探索追踪，POI 标记，平台简图，方向箭头
- **地图呈现基线**：保持房间图式，但视觉要克制，节点/连线/当前房间提示需接近 HK 的信息密度，不再回到“世界大地图”表达
- **跳跃手感基线**：当前跳跃以 HK 为参考，重点是更低的起跳高度、更快的下落、更明确的松键截断，不要改回漂浮型跳跃
- **单向门**：x=1600，阻止从左向右穿行

### UI 系统
- **HUD**：心形血条（10 格）、Feelings 条、Boss 血条、连击显示（RESONANCE ×N）、能力图标
- **暂停菜单**：Resume / Status / Save / Main Menu / Fullscreen 切换 / Language 切换 / 主音量滑块
- **地图**：区域颜色区分（已探索/未探索），平台简图，POI 标记，方向箭头，图例
- **角色面板**：Tab 键打开，显示 HP/Feelings/能力/地图进度/战斗统计

### 存档系统
- **方式**：localStorage，5 槽位 `sekai_save_0` ~ `sekai_save_4`
- **触发**：暂停菜单 SAVE → 选槽位保存
- **读档**：主菜单 LOAD GAME → 选槽位读档
- **数据**：HP / Feelings / 能力 / 位置 / 已杀敌人 / 已收集道具 / 时间戳

### 音频系统（全部已集成）
- **BGM**：菜单、探索、Boss Phase1、Boss Phase2（含交叉淡入淡出）
- **SFX**：玩家（跳跃/攻击/受击/死亡）、武器、敌人（受击/死亡/吼叫）、UI（导航/确认）、连击
- **音量控制**：`master` / `bgm` / `sfx` 三段式音量；暂停菜单主音量滑块调节 `master`

### 视觉系统
- **粒子**：击中白色爆发、收集物彩色爆发、能力门解锁爆发、菜单背景浮动粒子
- **屏幕效果**：相机震动、hitStop（冻结帧）、flash（闪白/淡蓝）
- **纹理**：地面 tiles（Kenney 像素平台素材区色调合成）、视差背景（seamless-parallax-cave 实景洞窟 3 层：远山 0.02x / 中云 0.07x / 近栅格 0.14x），chapter bg（broken_seikai_bg 0.18x）。场景装饰（warped-caves 道具素材）。火炬/水晶/垂藤仍为程序化
- **跑步动画**：11 帧循环（16.7fps），基于 Phaser Animation
- **HK 风格前景**：所有碰撞 tile（Ground + Platform）渲染为纯黑 `0x000000` 填充 + 青色 `0x7FE0DE` 边缘感知轮廓（仅暴露边绘制）
- **房间色调**：位于深度 -2，仅影响背景层，不污染玩家/敌人
- **环境尘埃**：每房间慢速上飘半透明青色粒子（ADD 混合），深度 -1

## ✅ 当前状态

### ✅ 已完整实现
- [x] Phaser 基础框架 + 场景系统 + 过渡管理
- [x] 主菜单（粒子、标题、菜单动画、键盘导航）
- [x] 玩家 Mafuyu（idle/run/jump/attack1~3/air/dash/doubleJump/hurt/dead）
- [x] 完整 3 段地面连击 + 剑技升级系统
- [x] 6 种敌人（ShadowFragment / FloatingShard / Bat / Skeleton / BloatedShadow / WandererCrystal）+ 基类 + Boss Mafuyu
- [x] Boss Mafuyu 2 阶段 + 绝望模式
- [x] 房间式架构（9 房间，RoomDef.js 驱动，过渡渐黑淡入）
- [x] 4400×600 世界 → 已重构为房间式架构（960×720/房间）
- [x] 长椅休息+保存系统（4 个长椅）
- [x] NPC 对话系统（2 个 NPC，打字机效果）
- [x] 收集物系统（3 种类型，持久化追踪）
- [x] 能力道具系统（冲刺/二段跳/剑）
- [x] 能力门系统（3 道，紫色屏障）
- [x] 地图系统（M 键，区域探索，POI）
- [x] 单向门（秘密区域出口）
- [x] 暂停菜单（Resume/Menu/Fullscreen/Language/主音量）
- [x] 音频设置拆分（`master` / `bgm` / `sfx`），主菜单设置页与暂停菜单统一接入 `AudioSettings`
- [x] 主菜单新增 `SETTINGS` 入口（音量 / 全屏 / 语言）
- [x] HUD（血条/Feelings/Boss血条/连击/能力图标）
- [x] 音频系统（7 BGM + 25+ SFX 全部集成）
- [x] 音频资源已改为启动时从 `src/audio-manifest.js` 读取内嵌 data URI，再交给 `load.audio()`，不要再恢复直接指向 `assets/audio/*.mp3`
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
- [x] 友方 NPC 已改用 `knd_stand` / `knd_walk` 素材，并支持小范围漫步或静止站立，不要回到纯图形 NPC；静止态统一使用 `stand`，不要再切回 `idle`
- [x] 友方 NPC 对话已适配语言设置：支持 `Lang` 键、`{cn,en}` 对象，以及当前房间里已有的英文对白映射，不要再只按单语言字符串处理
- [x] 友方 NPC 对话框已改为视口固定 UI，避免随相机 zoom 变大、模糊或超出视角；不要再改回跟随世界缩放的做法
- [x] 友方 NPC 对话框必须固定在屏幕底部 UI 层，不能缩放到世界相机里，否则会因为 zoom 导致看不见或发虚
- [x] 友方 NPC 对话框现在挂在 `HUDScene`，不得再放回 `GameScene` 的世界层；显示、隐藏、换行都由 HUD 负责
- [x] 骷髅敌人已改为拆 GIF 逐帧动画（idle/run/attack/death），并且朝向以“面向右侧”为基准；体型要比当前更小，生成点要上移 8px，攻击必须用前方扇面命中且不要再做镜头抖动，不要回退到 `skeleton-Sheet` 的错误切帧或把右侧文字区当成姿势帧
- [x] 血量 HUD 已放大并增加更强的轮廓/发光感，读档后必须通过 `HUDScene.refreshFromPlayer()` 立即重画，不要只改数值不刷新显示
- [x] `HUDScene` 可能晚于 `GameScene` 完成初始化，读档后的 HUD 刷新必须支持延迟补绘，不能依赖启动顺序
- [x] 存档槽里的血量展示必须使用 `ui_hp_mask`，不要再用旧的程序化心形图形

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
- [x] **可破坏墙系统**：HK 式攻击击碎屏障，6 HP，3 级裂缝渐进 + 粒子 + 震屏 + 持久化存档
- [x] **敌人 AI HK 化大改**：所有 6 种敌人 leash 收紧至 120-160px，2+ 攻击模式（Pounce/Rush、Cross Barrage/Quick Burst、Swoop/Dive、Shield Bash/Melee、Slam/Sweep、Laser/Pulse Burst），pogo 支持、telegraph 规范、retreat/recover 行为
- [x] **视觉适配**：6 个新程序化 VFX 纹理（fx_pounce_tell/fx_sweep_arc/fx_bash_impact/fx_pulse_ring/fx_quick_burst_proj/fx_swoop_trail）+ 每种新攻击的粒子效果 + 标准化状态色调
- [x] **新房间"THE VOID"**：secret→void→lower 捷径，7 个盘旋平台，1 WandererCrystal + 1 ShadowFragment
- [x] **地图 UI 重设计**：HK 风格房间微型轮廓、方向箭头、POI 系统（6 种类型）、图例、玩家标记增强（脉冲发光+面向指示）、打开/关闭动画
- [x] **角色信息面板**：Tab/暂停状态打开，显示 VESSEL/FEELINGS/ABILITIES/MAP/COMBAT 信息
- [x] **三个已知 BUG 已修复**：mid→shaft UP出口可达、能力门阻挡主线、secret 房间可进入（新增 void 房间作为出口）
- [ ] **Feelings 特殊攻击**：消耗 50 Feelings 的大范围斩击（已设计，待实现）
- [ ] **玩家跳跃/落地动画**：squash & stretch
- [ ] **Boss 攻击纹理修复**：`melee_active` 应显示 `boss_melee1` 而非 `boss_attack`
- [ ] **更多敌人类型**（从 625+ 素材中选择 3-5 种）
- [ ] **世界状态变化**：Boss 击败后的场景变化
- [ ] **音频闪避**（Ducking）：受伤时 BGM 降音量
- [ ] **HUD 动画润色**：心形受伤动画、Feelings 条满时发光
- [ ] **NPC 行为细化**：若后续需要，让部分房间 NPC 走更长的巡游路径或按剧情固定站位

### 📋 当前 Sprint 计划
**Sprint 1 - 视觉资产大替换（已完成）：**
1. ✅ 敌人纹理替换（程序化→实际像素素材）
2. ✅ 背景视差分层（3层：远山 0.05x / 中云 0.15x / 近栅格 0.3x）
3. ✅ 地面图块多样化（7 区域不同风格）
4. ✅ 环境装饰元素（钟乳石/水晶/火炬/垂藤/符文光点/区域标识）

**Sprint 2 - 房间式架构（已完成）：**
1. ✅ 设计文档（ADR-0001）+ RoomDef.js 数据定义
2. ✅ GameScene.js 重构：8 房间，过渡系统，按房间创建/销毁
3. ✅ 存档系统适配：房间坐标/abilities 对象/all-room benches 持久化
4. ✅ 素材包整合（warped-caves/kenney/seamless-cave：地面 tiles、视差背景、钟乳石装饰）
5. ✅ 地图系统（MapView）改为房间网格并按 HK 风格收敛呈现

**Sprint 3 - 游戏反馈打磨（已完成）：**
角色动画完善、击中特效升级、屏幕特效、摄像机润色

**Sprint 4 - 音频系统完整集成（已完成）：**
缺失 SFX 接入、BGM 动态切换、音频 Ducking、菜单音效完善

**Sprint 5 - 内容扩展（已完成）：**
新敌人类型、Feelings 特殊攻击、绝望模式增强、世界状态持久化

**Sprint 6 - UI/UX 打磨（已完成）：**
主菜单粒子增强、HUD 动画、暂停菜单设置页、地图系统美化

**Sprint 7 - Tilemap 迁移 Phase 1（已完成）：**
1. ✅ 写 `scripts/generate-tilemaps.js` 从旧 RoomDef 数据生成 8 个 `.tmj` 文件
2. ✅ `BootScene.js` 加载 tilemap JSON
3. ✅ `RoomDef.js` 精简为纯元数据
4. ✅ `GameScene.js` `_buildRoom` 重写为 tilemap 加载
5. ✅ 移除所有 `_build*` 方法，改为 `_build*FromSpawns`
6. ✅ `_checkExits` → 使用 `this._roomExits`
7. ✅ MapView 适配
8. ✅ `_clearRoom` 清理新数组
9. ✅ player scale 0.63→0.85
10. ✅ camera profiles
11. ✅ tile 16×16
12. ✅ 平台薄视觉
13. ✅ spawn 坐标校准

**Sprint 8 - 平台布局重新设计 + 可破坏墙系统（已完成）：**
1. ✅ 8 房间全平台重新设计
2. ✅ lower 单向门替换为可破坏墙
3. ✅ 所有 TMJ 再生验证
4. ✅ 三个已知 BUG 修复

**Sprint 9 - 敌人 AI + 新房间 + UI 重设计（已完成）：**
1. ✅ 所有 6 种敌人 AI HK 化大改
2. ✅ 6 个 VFX 纹理 + 粒子效果
3. ✅ 怪物布局重新平衡
4. ✅ 新房间"THE VOID"
5. ✅ 地图 UI HK 风格重设计
6. ✅ 角色信息面板
7. ❌ 全流程游戏内验证
8. ❌ Boss attack 纹理修复

**Sprint 10（当前）- 移动端操作支持：**
1. ✅ `MobileControls.js`：虚拟按键（圆型按钮，半透明深色底+青色边框），支持左/右/跳跃/攻击/冲刺
2. ✅ `ControlMode`：localStorage 持久化 PC/Mobile 切换
3. ✅ `MenuScene` 设置页增加 Controls 切换选项
4. ✅ `GameScene` 集成：创建 MobileControls + 暂停时重置防幻触
5. ✅ `Player` 集成：移动端按钮输入与键盘输入一起处理
6. ✅ NPC 对话支持移动端攻击按钮操作
7. ❌ 真机/浏览器测试

### 🔴 已知 BUG（待修复）
- **Boss 攻击纹理**：`melee_active` 状态使用 `boss_attack` 纹理而非 `boss_melee1`（需用户提供素材）

## 🤖  AI 协作指南
- **最高优先级**：以 `AGENTS.md` 为项目状态唯一 Source of Truth
- 重大变更必须更新本文档
- 新 JS 文件需在 `index.html` 添加 `<script>` 标签
- 加载顺序：SceneManager → i18n → HUD → systems → entities → enemies → ui → scenes → game.js
- 代码提交前确保无语法错误

### ❌ 已记录的致命错误（所有 agent 禁止再犯）

1. **同 X 坐标的直上直下台阶**：连续台阶的 x 坐标必须错开（+48~+60px），指向上一层缺口位置。同 x 坐标的台阶在平台游戏中玩家会撞头，无法连续跳跃。
2. **移动平台（电梯）放在实体地面上而非缺口里**：电梯必须填补楼层之间的缺口，让玩家能从一侧走到缺口里的电梯上，电梯经过各层时自然跨过缺口。电梯放在 slab 的实心部分则完全无效——玩家不需要穿过缺口，电梯的存在没有意义。
3. **移动平台行程不够覆盖玩家起点**：电梯的底部（maxY）必须设在玩家进入房间时所在的楼层高度，不能设在更高位置。玩家从某层进入 → 电梯就在该层 → 直接上车。否则玩家要爬楼梯追电梯 → 电梯早就走了。

## ⚠️ 重要提醒
- PJSK 同人游戏，**非商业用途**
- 素材须为**原创或 CC0 授权**，严禁官方版权素材
- 首次执行任何任务前，请先阅读此文档了解当前状态

---

**最后更新时间**：2026-06-29（Sprint 10 进行中：移动端虚拟按键 + PC/Mobile 切换 + 全流程测试）
**维护者**：lidure

## Relevant Files
- `scripts/generate-tilemaps.js`：单数据源（ROOMS 字典含所有 9 房间的平台/出口/spawn 数据），所有装饰已清除，所有 benches: []；TMJ 再生 `node scripts/generate-tilemaps.js`
- `src/scenes/GameScene.js`：`_buildRoom` tilemap 加载；地面层 `TILE_OFFSET_Y + 8` offset；platform layer y=0（无偏移），碰撞=visual=row×16；damage 值已重平衡；bench/rest 代码已删除
- `src/scenes/BootScene.js`：preload 加载 9 个 tilemap JSON + 7 个 16×16 地面纹理 + 6 个 VFX 程序化纹理
- `src/entities/Player.js`：跳跃 -280；body 18×26 @ scale 0.85；air attack 无 velocity 限制/上限钳制；dash 默认 false
- `src/systems/NPC.js`：`_recalcBox()` 将位置/尺寸除以 `cameras.main.zoom`，对话框在 zoom 2.6×/1.6×/1.3× 下均可见
- `src/systems/NPC.js`：友方 NPC 使用 `knd` 素材，支持 `wander` / `stand` 行为，保持对话系统不变
- `src/systems/RoomDef.js`：精简元数据 + CONNECTIONS 表 + mapPOIs
- `src/ui/MapView.js`：使用 `RoomDef.CONNECTIONS` + 常量宽高 + 平台简图 + 方向箭头 + 图例 + 打开/关闭动画
- `src/ui/CharacterPanel.js`：角色信息面板（VESSEL/FEELINGS/ABILITIES/MAP/COMBAT）
- `src/ui/PauseMenu.js`：暂停菜单含 Status 选项
- `src/ui/SaveSlotPicker.js`：5 存档槽选择器，暂停菜单 SAVE + 主菜单 LOAD GAME 共用
- `src/systems/DestructibleWall.js`：可破坏墙（HK 式），攻击破坏，3 级裂缝 + 粒子爆发 + 持久化存档
- `src/systems/MovingPlatform.js`：移动平台电梯，垂直载人升降（shaft 房间 x=600, 96px 宽, 448px 行程, 60px/s）
- `assets/maps/*.tmj`：9 房间，16×16 网格，平台 row T（TMJ y=0，无 -16 偏移），无装饰/长椅对象
- `src/i18n.js`：本地化系统，中英文词典，localStorage 持久化语言设置，暂停菜单 LANGUAGE 切换
