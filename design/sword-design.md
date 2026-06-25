# Sword Attack Upgrade System

> **Status**: Implemented (v1.0)
> **Author**: game-designer (collaborative)
> **Last Updated**: 2026-06-25
> **Engine**: Phaser 3 + Arcade Physics (60fps target)
> **Theme**: 25-ji (Nightcord) — melancholic but empowering

---

## Table of Contents

1. [Overview](#1-overview)
2. [Player Fantasy](#2-player-fantasy)
3. [Acquisition](#3-acquisition)
4. [Detailed Design](#4-detailed-design)
5. [Frame Data & States](#5-frame-data--states)
6. [Combo Windows](#6-combo-windows)
7. [Hitbox Specifications](#7-hitbox-specifications)
8. [Damage & Impact Values](#8-damage--impact-values)
9. [Texture Mapping](#9-texture-mapping)
10. [Balance Comparison](#10-balance-comparison)
11. [Feelings Special (Reserved)](#11-feelings-special-reserved)
12. [Edge Cases](#12-edge-cases)
13. [Dependencies](#13-dependencies)
14. [Tuning Knobs](#14-tuning-knobs)
15. [Files Modified](#15-files-modified)
16. [Acceptance Criteria](#16-acceptance-criteria)

---

## 1. Overview

The **Sword** is a permanent ability upgrade that transforms Mafuyu's basic attack kit into a heavier, more powerful weapon. When acquired:

- All attack textures switch from `mfy_att1/2` to the sword frames (`mfy_sword_1/3/5`)
- Attack damage increases across all hits
- A **third combo hit (Slash 3)** becomes available — a heavy overhead slam finisher
- The air attack uses the sword's overhead frame with increased damage
- Frame durations remain unchanged (Mafuyu's existing attack speed is preserved)

The sword is an ability gated item, found at `x=2500, y=400` in the mid-corridor after the vertical shaft area. It reuses the existing `AbilityItem` pickup system (teal diamond crystal visual).

---

## 2. Player Fantasy

The sword upgrade represents Mafuyu **finding her resolve**. Before the sword, her attacks are hesitant, short-ranged slashes (basic `mfy_att1/2`). After acquiring the sword, she fights with a full blade — each swing is wider, heavier, and more decisive.

**MDA Mapping:**
- **Aesthetics**: Challenge (extended combo requires good timing), Sensation (heavier hitstop, stronger screen shake), Expression (full 3-hit combo feels like finding your rhythm)
- **Dynamics**: The player now has a reason to land the full 3-hit chain (75 total damage vs 35 for 2-hit basic). Risk/reward calculation changes — committing to the longer recovery of Attack3 vs playing safe with 2 hits.
- **Mechanics**: New `attack3_*` states, conditional branching in `_onStateEnter()` for texture selection, conditional combo window in `_handleAttack2State()`.

**SDT Alignment:**
- **Competence**: Clear power progression — player feels the sword's increased reach and damage immediately. The 3-hit combo has a distinct rhythm.
- **Autonomy**: Sword upgrades damage values but does not change timing — player can mix 2-hit and 3-hit combos based on the enemy's punish window.
- **Relatedness**: The sword ties to narrative ("You carry her sword well" — NPC K dialogue at x=2500).

---

## 3. Acquisition

### 3.1 Pickup Location

| Property | Value |
|----------|-------|
| **World Position** | `(2500, 400)` — mid-corridor, after the vertical shaft area |
| **Item System** | `AbilityItem` (reuses existing class) |
| **Ability Key** | `sword` |
| **Display Name** | `SWORD` (shown as `◆ SWORD ACQUIRED ◆`) |
| **Visual** | Teal diamond crystal (same as other `AbilityItem` pickups, drawn via `Phaser.Graphics`) |
| **Color** | `0x2EC4B6` (teal-cyan — same as dash ability item) |
| **Collection Effect** | Screen flash (light blue), acquisition text popup, tracked in `GameScene.abilityItemsCollected[]` |

### 3.2 Persistence

- The sword is a **permanent upgrade** — once collected, `player.abilities.sword = true` persists through death, bench rests, and save/load cycles.
- If the save data has `abilityItemsCollected` containing `'sword'`, the pickup is not re-spawned on scene load.

### 3.3 Acquisition Text

Displayed centered on screen for 1.2s, then fades out over 1s:

```
◆ SWORD ACQUIRED ◆
```

Font: `monospace`, size `18px`, color `#7FE0DE` (teal), black stroke (`#000000`, 3px).

---

## 4. Detailed Design

### 4.1 How the Upgrade Works

When `player.abilities.sword` is `true`, the following changes take effect:

1. **Texture override**: All attack states check `this.abilities.sword` and choose sword textures instead of basic textures.
2. **Damage increase**: `GameScene._onPlayerHitEnemy()` and `BossScene._onPlayerHitBoss()` read `player.abilities.sword` and use the higher damage values.
3. **Third combo hit**: `_handleAttack2State()` checks `this.abilities.sword` to allow chaining to `attack3_startup`.
4. **Air attack damage**: Upgraded from 18 to 22. Texture uses `player_sword_5` instead of `player_att1`.

### 4.2 What Does NOT Change

- **Frame durations**: Identical for basic and sword (same startup/active/recovery timing). The attack speed is Mafuyu's native speed — the sword only changes visuals, damage, and combo length.
- **Hitbox sizes**: Identical for basic and sword (20×18 Att1, 28×22 Att2). Attack3 has its own larger hitbox (40×30) that only exists when sword is acquired.
- **Movement**: Sword does not affect movement speed, jump height, or any physics properties.
- **Feelings gain**: `onHitEnemy()` still gives +8 Feelings per hit regardless of weapon.

---

## 5. Frame Data & States

### 5.1 Attack Frame Table (60fps baseline)

All frame durations are defined in `Player._getStateDuration()` via the `at60fps()` helper: `duration = frames / 60`.

| State ID | Startup Frames | Active Frames | Recovery Frames | Total Frames | Total Duration |
|----------|---------------|---------------|-----------------|-------------|---------------|
| `attack1_*` | 7f (117ms) | 5f (83ms) | 10f (167ms) | 22f (367ms) | 22f |
| `attack2_*` | 8f (133ms) | 6f (100ms) | 12f (200ms) | 26f (433ms) | 26f |
| `attack3_*` | 8f (133ms) | 6f (100ms) | 14f (233ms) | 28f (467ms) | 28f |
| `air_attack_*` | 7f (117ms) | 25f max (417ms) | 8f (133ms) | 40f max (667ms) | 40f max |

### 5.2 Per-Attack Phase Details

#### Attack 1 (Horizontal Slash)

| Phase | Frames | Duration | Behavior |
|-------|--------|----------|----------|
| **Startup** | 1–7 | 117ms | Player flashes white. Lunge forward (20px over 7f). No hitbox. |
| **Active** | 8–12 | 83ms | Hitbox live (20×18). Can hit enemies/boss. |
| **Recovery** | 13–22 | 167ms | Cannot attack. Reduced movement speed (50%). |
| **Combo Window** | 16–18 | 50ms | Frames 3–5 of recovery. If attack buffered → chain to Attack2. |

#### Attack 2 (Wide Arc)

| Phase | Frames | Duration | Behavior |
|-------|--------|----------|----------|
| **Startup** | 1–8 | 133ms | Step forward (25px). Sword charges behind. No hitbox. |
| **Active** | 9–14 | 100ms | Hitbox live (28×22). Wider arc than Attack1. |
| **Recovery** | 15–26 | 200ms | Cannot act. Combo ends (basic) or chains (sword). |
| **Combo Window** | 15–18 | 67ms | Frames 0–3 of recovery. **Only if `abilities.sword`** → chain to Attack3. |

#### Attack 3 — Finisher (Sword Only)

| Phase | Frames | Duration | Behavior |
|-------|--------|----------|----------|
| **Startup** | 1–8 | 133ms | Player raises sword overhead. Minor forward step (15px). No hitbox. |
| **Active** | 9–14 | 100ms | Hitbox live (40×30). Wide overhead slam. |
| **Recovery** | 15–28 | 233ms | Long recovery. Cannot act. Combo ends. Heaviest commitment. |

#### Air Attack (Downward Thrust)

| Phase | Frames | Duration | Behavior |
|-------|--------|----------|----------|
| **Startup** | 1–7 | 117ms | Tilt sword downward. Added downward velocity: +120px/s. |
| **Active** | 8+ until landing or 25f max | 417ms max | Hitbox live below player. Extra downward force: +200px/s. |
| **Landing** | Instant on ground | — | Active ends. 8f recovery (133ms). |
| **Miss Recovery** | After 25f max | 133ms | If no ground contact, active ends and recovery in air. |

**Air attack ape detection**: Only available when `body.velocity.y >= -50` (at or past jump apex).

---

## 6. Combo Windows

### 6.1 Attack1 → Attack2 Chain (Always Available)

| Property | Value |
|----------|-------|
| **Recovery Duration** | 10f (0.167s at 60fps) |
| **Combo Window** | Frames 3–5 of recovery (0.100s → 0.067s remaining) |
| **Window Duration** | 3 frames (50ms) |
| **Implementation** | `if (attack && stateTimer > 0.067 && stateTimer < 0.133)` |
| **Buffer** | Attack press buffered for 5 frames. If buffer lands within window → chain. |

### 6.2 Attack2 → Attack3 Chain (Sword Only)

| Property | Value |
|----------|-------|
| **Recovery Duration** | 12f (0.200s at 60fps) |
| **Combo Window** | Frames 0–3 of recovery (0.200s → 0.133s remaining) |
| **Window Duration** | 4 frames (67ms) |
| **Implementation** | `if (attack && abilities.sword && stateTimer > 0.133)` |
| **Guard** | Chains to Attack3 ONLY if `this.abilities.sword === true`. If false, standard recovery with no chain. |

### 6.3 State Machine Diagram

```
IDLE / RUN
  │
  ├─ press attack (ground) ───→ attack1_startup (7f)
  │                                │
  │                                ↓
  │                           attack1_active (5f)
  │                                │
  │                                ↓
  │                           attack1_recovery (10f)
  │                                │
  │                   ┌────────────┼────────────┐
  │                   │  window    │  no press  │
  │                   ↓            ↓            │
  │              attack2_startup (8f)          IDLE
  │                   │
  │                   ↓
  │              attack2_active (6f)
  │                   │
  │                   ↓
  │              attack2_recovery (12f)
  │                   │
  │       ┌───────────┼───────────┐
  │       │ sword +   │  no sword │
  │       │ window    │  or miss  │
  │       ↓           ↓           │
  │  attack3_startup (8f)        IDLE
  │       │
  │       ↓
  │  attack3_active (6f)
  │       │
  │       ↓
  │  attack3_recovery (14f)
  │       │
  │       ↓
  │      IDLE
  │
  ├─ press attack (air) ───→ air_attack_startup (7f) → active → land/fall
```

---

## 7. Hitbox Specifications

Hitboxes are defined in `Player._updateHitbox()` and `Player._updateAirHitbox()`. All values are relative to the player's physics body `(body.x, body.y)`. Player body is 200w × 333h (pixels at native texture size, scaled by 0.12).

### Attack 1 Hitbox (Facing Right)

| Property | Value |
|----------|-------|
| **Width** | 20 world pixels |
| **Height** | 18 world pixels |
| **Y Offset** | +12px (from body top — chest height) |
| **X Offset (right)** | `body.x + body.width + 2` (gap + body width) |
| **X Offset (left)** | `body.x - 2 - 20` (gap + width, mirrored) |
| **Active frames** | 8–12 (5 frames) |

### Attack 2 Hitbox (Facing Right)

| Property | Value |
|----------|-------|
| **Width** | 28 world pixels |
| **Height** | 22 world pixels |
| **Y Offset** | +10px (from body top — slightly higher arc) |
| **X Offset (right)** | `body.x + body.width + 2` |
| **X Offset (left)** | `body.x - 2 - 28` |
| **Active frames** | 9–14 (6 frames) |

### Attack 3 Hitbox (Facing Right — Sword Only)

| Property | Value |
|----------|-------|
| **Width** | 40 world pixels |
| **Height** | 30 world pixels |
| **Y Offset** | +8px (from body top — overhead arc) |
| **X Offset (right)** | `body.x + body.width + 2` |
| **X Offset (left)** | `body.x - 2 - 40` |
| **Active frames** | 9–14 (6 frames) |

### Air Attack Hitbox

| Property | Value |
|----------|-------|
| **Width** | body.width - 8 (192 world pixels) |
| **Height** | 24 world pixels |
| **X Offset** | `body.x + 2` |
| **Y Offset** | `body.y + floor(body.height × 0.55)` (lower torso, angled down) |
| **Active frames** | 8 onward until landing or 25f max |

### Hitbox Implementation Note

> Hitbox sizes are **identical** between basic and sword for Attack1 and Attack2. Only Attack3 (sword-exclusive) has a larger hitbox. The sword's "increased reach" is primarily conveyed through:
> 1. The larger Attack3 hitbox (40×30 vs 28×22)
> 2. The visual appearance of a full blade in the sword sprites
> 3. Narrative context of finding a real weapon vs basic slashes

---

## 8. Damage & Impact Values

Damage values are defined in two locations:
- `GameScene._onPlayerHitEnemy()` — for overworld enemies
- `BossScene._onPlayerHitBoss()` — for boss encounters

Both use the same damage table, reading `player.abilities.sword` to choose values.

### 8.1 Damage Table

| Attack State | Basic Damage | Sword Damage | Change |
|-------------|-------------|--------------|--------|
| `attack1_active` | 13 | **16** | +23% |
| `attack2_active` | 22 | **24** | +9% |
| `attack3_active` | — | **35** | New (sword only) |
| `air_attack_active` | 18 | **22** | +22% |

### 8.2 Knockback & Hitstop

| Attack | KB X | KB Y | Screen Shake | Hitstop |
|--------|------|------|-------------|---------|
| Attack1 | 130px | −45px | 3px amp | 67ms (4f) |
| Attack2 | 200px | −70px | 5px amp | 100ms (6f) |
| Attack3 | 250px | −90px | 7px amp | 133ms (8f) |
| Air Attack | 90px | −90px | 3px amp | 67ms (4f) |

> Knockback and hitstop values are **identical** between basic and sword for shared attacks. Attack3 has the heaviest values — this is the sword's primary reward.

### 8.3 TTK vs Enemies

| Enemy | HP | Basic Combo | Sword Combo |
|-------|----|-------------|-------------|
| Shadow Fragment | 3 | 1× Att1 (13 ≥ 3) | 1× Att1 (16 ≥ 3) |
| Floating Shard | 4 | 1× Att1 (13 ≥ 4) | 1× Att1 (16 ≥ 4) |
| Skeleton | 15 | 1× Att2 (22 ≥ 15) | 1× Att2 (24 ≥ 15) |
| Boss Mafuyu | 300 | 9× full combo (35×9=315) | 4× full combo (75×4=300) |

> Boss TTK improvement with sword: 9 combos → 4 combos. This is the most dramatic balance impact, making the boss significantly faster to defeat if the player has explored enough to find the sword before the boss arena.

---

## 9. Texture Mapping

### 9.1 Loaded Textures (BootScene.preload)

| Texture Key | Source File | Size | Used? |
|-------------|------------|------|-------|
| `player_sword_1` | `assets/images/player_mfy/mfy_sword_1.png` | 720×720 | ✅ Attack1 startup/active/recovery |
| `player_sword_2` | `assets/images/player_mfy/mfy_sword_2.png` | 720×720 | ❌ Unused (reserved) |
| `player_sword_3` | `assets/images/player_mfy/mfy_sword_3.png` | 720×720 | ✅ Attack2 startup/active/recovery |
| `player_sword_4` | `assets/images/player_mfy/mfy_sword_4.png` | 720×720 | ❌ Unused (reserved) |
| `player_sword_5` | `assets/images/player_mfy/mfy_sword_5.png` | 720×720 | ✅ Attack3 (all phases) + Air attack |

### 9.2 Texture Selection Logic (Player._onStateEnter)

The per-state texture is chosen in `_onStateEnter()` using a ternary on `this.abilities.sword`:

| State | Basic Texture | Sword Texture |
|-------|--------------|---------------|
| `attack1_startup` | `player_att1` | **`player_sword_1`** |
| `attack1_active` | `player_att1` | **`player_sword_1`** |
| `attack1_recovery` | `player_att1` | **`player_sword_1`** |
| `attack2_startup` | `player_att2` | **`player_sword_3`** |
| `attack2_active` | `player_att2` | **`player_sword_3`** |
| `attack2_recovery` | `player_att2` | **`player_sword_3`** |
| `attack3_startup` | *(unreachable)* | **`player_sword_5`** (gated by `abilities.sword`) |
| `attack3_active` | *(unreachable)* | **`player_sword_5`** |
| `attack3_recovery` | *(unreachable)* | **`player_sword_5`** |
| `air_attack_startup` | `player_att1` | **`player_sword_5`** |
| `air_attack_active` | `player_att1` | **`player_sword_5`** |
| `air_attack_recovery` | `player_att1` | **`player_sword_5`** |

### 9.3 Texture Pipeline Note

> `player_sword_2` and `player_sword_4` are loaded from disk but **not referenced** in any state. They exist for:
> 1. Future polish (interpolated frames for smoother sword animation)
> 2. Potential Feelings special attack animation (uses all 5 frames as a spinning slash sequence)
>
> No game logic depends on these textures. They add ~2MB of preload weight.

---

## 10. Balance Comparison

### 10.1 Damage Comparison

| Attack | Basic | Sword | Difference |
|--------|-------|-------|------------|
| Attack1 | 13 | 16 | +3 (+23%) |
| Attack2 | 22 | 24 | +2 (+9%) |
| Attack3 | — | 35 | New |
| Air Attack | 18 | 22 | +4 (+22%) |
| **2-hit combo** | 35 | 40 | +5 (+14%) |
| **3-hit full combo** | — | 75 | New |
| **Feelings special** | — | *(reserved)* | — |

### 10.2 Combo Commitment vs Reward

| Combo | Total Damage | Total Duration | DPS | Risk |
|-------|-------------|---------------|-----|------|
| Basic 2-hit | 35 | 48f (800ms) | 43.75/s | Moderate — 12f recovery |
| Sword 2-hit | 40 | 48f (800ms) | 50.0/s | Same as basic |
| Sword 3-hit | 75 | 76f (1267ms) | 59.2/s | High — 14f final recovery |

### 10.3 Design Rationale

- The sword is **not** a strict DPS upgrade for 2-hit combos (40 vs 35, +14%). The real power is in the 3-hit chain (75 damage).
- The long recovery of Attack3 (14f) means the player must be confident the enemy can't punish during the long animation. This adds strategic depth.
- The sword's damage bonus is more significant against the boss (300 HP) where the 3-hit combo reduces the total number of required combos from 9 to 4.

---

## 11. Feelings Special (Reserved)

The Feelings special attack is **not implemented**. The design is reserved for future iteration:

### Proposed Design (Not Yet Coded)

| Property | Value |
|----------|-------|
| **Trigger** | Feelings meter ≥ 50 AND `abilities.sword` |
| **Input** | Hold J/Z for ≥ 500ms (instead of tap) |
| **Animation** | All 5 sword frames played in sequence as a spinning slash |
| **Damage** | 45 |
| **Hitbox** | 60×40 (wide arc) |
| **Feelings Cost** | 50 |
| **Cooldown** | None (limited by Feelings regeneration) |

### Implementation Status

- [ ] Input hold detection in `Player.update()` or `GameScene._attackHandlerJ()`
- [ ] New state `feelings_special_startup/active/recovery` in state machine
- [ ] Frame data and hitbox specs
- [ ] Visual effect (wide arc particles + extended screen shake)
- [ ] UI indicator: sword glows when Feelings ≥ 50

---

## 12. Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Player hits Attack3 without sword** | Impossible — `_handleAttack2State()` only chains to `attack3_startup` when `abilities.sword` is true. Without sword, recovery ends normally → idle. |
| **Sword acquired mid-combo** | The `abilities.sword` flag is set in the `AbilityItem._onPickup()` callback. If the player is currently attacking, the flag takes effect on the **next** attack (texture switch happens in `_onStateEnter()` at state transition). Safe. |
| **Save/load with sword** | `player.saveState()` serializes `abilities.sword`. `loadState()` restores it with `!!data.abilities.sword`. Works correctly across game sessions. |
| **Sword in BossScene** | `BossScene` receives `playerData.abilities` via `SceneManager.launchOverlay()`. Creates its own `Player` instance with `loadState()`. Sword works identically in boss arena. |
| **Death with sword** | `player.reset()` preserves abilities (`const savedAbilities = { ...this.abilities }`). Sword is retained through death. |
| **Sword texture not loaded** | If a sword texture fails to load, the `_setTextureStable()` call with a non-existent key will fail silently. Texture will appear missing (Phaser default). The programmer should add error handling for missing textures. |
| **Attack buffered during Attack3 recovery** | Buffer is checked in `_handleAttack3State()` but does NOT chain to anything (Attack3 is the finisher). Buffered input is consumed but ignored — player must wait for full recovery. |
| **Air attack with sword at y=0** | Works identically to basic air attack. Active frames cap at 25f. Extra downward velocity (120 + 200) applies. Texture uses `player_sword_5`. |

---

## 13. Dependencies

### 13.1 Upstream Dependencies (Systems This Depends On)

| System | Interface | Direction |
|--------|-----------|-----------|
| **AbilityItem** | Creates pickup at (2500, 400). Sets `player.abilities.sword = true` on collection. | Consumed by |
| **Player State Machine** | Must handle 3 new states (`attack3_startup/active/recovery`) with correct durations and transitions. | Modified |
| **BootScene (Texture Loading)** | Must load `player_sword_1..5` textures before GameScene starts. | Consumed by |

### 13.2 Downstream Dependents (Systems That Depend On This)

| System | Interface | Direction |
|--------|-----------|-----------|
| **GameScene** | `_onPlayerHitEnemy()` reads `player.abilities.sword` for damage values. Must include `attack3_active` case. | Provides to |
| **BossScene** | `_onPlayerHitBoss()` reads `player.abilities.sword` for damage values. Must include `attack3_active` case. | Provides to |
| **Save/Load** | `player.saveState()` and `player.loadState()` must handle `abilities.sword`. `GameScene._saveGame()` persists `abilityItemsCollected`. | Provides to |

### 13.3 Data Flow Diagram

```
BootScene
  │  load: player_sword_1..5 → textures ready
  ▼
GameScene
  │  creates AbilityItem at (2500, 400)
  │  player overlaps → _onPickup()
  │    → player.abilities.sword = true
  │    → tracked in abilityItemsCollected[]
  │
  ├──→ Player._onStateEnter() checks abilities.sword
  │      → textures switch to sword frames
  │
  ├──→ Player._handleAttack2State() checks abilities.sword
  │      → enables chain to attack3_startup
  │
  ├──→ GameScene._onPlayerHitEnemy() reads abilities.sword
  │      → damage values increase
  │      → new attack3_active case
  │
  └──→ BossScene (overlay)
         → receives playerData.abilities
         → damage values increase (same logic)
```

---

## 14. Tuning Knobs

All values are defined in code constants (not external data files). Future work should extract to a JSON config.

### 14.1 Damage Knobs

| Variable | Location | Current Value | Range | Category |
|----------|----------|--------------|-------|----------|
| Sword Attack1 damage | GameScene + BossScene | 16 | 13–20 | Curve |
| Sword Attack2 damage | GameScene + BossScene | 24 | 22–30 | Curve |
| Sword Attack3 damage | GameScene + BossScene | 35 | 30–45 | Curve |
| Sword Air damage | GameScene + BossScene | 22 | 18–28 | Curve |

### 14.2 Frame Data Knobs

| Variable | Location | Current Value | Range | Category |
|----------|----------|--------------|-------|----------|
| Attack3 startup | `_getStateDuration()` | 8f (0.133s) | 6–10f | Feel |
| Attack3 active | `_getStateDuration()` | 6f (0.100s) | 5–8f | Feel |
| Attack3 recovery | `_getStateDuration()` | 14f (0.233s) | 10–18f | Feel |
| Att2→Att3 combo window | `_handleAttack2State()` | `> 0.133s` (4f) | 2–6f | Feel |

### 14.3 Hitbox Knobs

| Variable | Location | Current Value | Range | Category |
|----------|----------|--------------|-------|----------|
| Attack3 hitbox width | `_updateHitbox()` | 40px | 32–48 | Feel |
| Attack3 hitbox height | `_updateHitbox()` | 30px | 24–36 | Feel |
| Attack3 hitbox Y offset | `_updateHitbox()` | 8px | 6–12 | Feel |

### 14.4 Impact Knobs

| Variable | Location | Current Value | Range | Category |
|----------|----------|--------------|-------|----------|
| Attack3 knockback X | GameScene + BossScene | 250px | 200–300 | Feel |
| Attack3 knockback Y | GameScene + BossScene | −90px | −60–(−120) | Feel |
| Attack3 screen shake | GameScene + BossScene | 7px amp | 5–10 | Feel |
| Attack3 hitstop | GameScene + BossScene | 133ms (8f) | 100–167ms | Feel |

---

## 15. Files Modified

### 15.1 Files Changed

| File | Changes |
|------|---------|
| `src/entities/Player.js` | `abilities` object now includes `sword: false`. `loadState()` restores `abilities.sword`. New states `attack3_*` in state machine. New handlers `_handleAttack3State()` and `_handleAttack3Active()`. Texture selection in `_onStateEnter()` uses `abilities.sword` ternaries. |
| `src/scenes/BootScene.js` | Loads `player_sword_1..5` textures in `preload()`. |
| `src/scenes/GameScene.js` | `_createAbilityItems()` includes sword pickup at (2500, 400). `_onPlayerHitEnemy()` reads `abilities.sword` for damage values. New `attack3_active` case. |
| `src/scenes/BossScene.js` | `_onPlayerHitBoss()` reads `abilities.sword` for damage values. New `attack3_active` case. |

### 15.2 Files NOT Changed (Intentionally)

- `src/systems/AbilityItem.js` — Reused as-is for sword pickup
- `src/HUD.js` — No new HUD elements needed
- `src/enemies/*` — Enemy behavior unaffected
- `index.html` — No new script tags needed

---

## 16. Acceptance Criteria

### 16.1 Functional Criteria

| # | Test | Expected Result |
|---|------|----------------|
| F1 | Walk over sword pickup at (2500, 400) | `player.abilities.sword` becomes `true`. "◆ SWORD ACQUIRED ◆" text appears. |
| F2 | Load save with sword collected | Sword pickup does not respawn. `player.abilities.sword` is `true` on load. |
| F3 | Ground attack combo with sword | Attack1→Attack2→Attack3 full chain plays. Attack3 uses `player_sword_5`. |
| F4 | Ground attack combo without sword | Attack1→Attack2 plays. No Attack3. Uses `player_att1/2`. |
| F5 | Air attack with sword | Uses `player_sword_5` texture. Deals 22 damage. |
| F6 | Damage values in GameScene | Attack1=16, Attack2=24, Attack3=35, Air=22 |
| F7 | Damage values in BossScene | Same as GameScene (boss uses identical damage table) |
| F8 | Attack1→Attack2 combo window | Buffer press during frames 3-5 of recovery → chains. Press outside window → no chain. |
| F9 | Attack2→Attack3 combo window (sword) | Buffer press during frames 0-3 of recovery → chains to Attack3. |
| F10 | Attack2→Attack3 combo window (no sword) | Same recovery but no chain. Recovery ends → idle. |
| F11 | Save/Load abilities | `saveState()` includes `sword`. `loadState()` restores it. `_saveGame()` persists via `abilityItemsCollected`. |
| F12 | Death with sword | `reset()` preserves sword ability. Player keeps sword through death. |

### 16.2 Visual Criteria

| # | Test | Expected Result |
|---|------|----------------|
| V1 | Sword texture on attack1_startup | Shows `player_sword_1` |
| V2 | Sword texture on attack2_startup | Shows `player_sword_3` |
| V3 | Sword texture on attack3_startup | Shows `player_sword_5` |
| V4 | Sword texture on air_attack_active | Shows `player_sword_5` |
| V5 | Basic texture without sword | Shows `player_att1` or `player_att2` as appropriate |
| V6 | Texture switch on acquisition | Collecting sword mid-game immediately switches next attack to sword frames |

### 16.3 Edge Case Criteria

| # | Test | Expected Result |
|---|------|----------------|
| E1 | Attack3 without sword | Cannot reach `attack3_*` states. Guarded by `if (abilities.sword)` in combo window. |
| E2 | Sword in BossScene after acquiring in GameScene | Player in BossScene has `abilities.sword = true`. Sword combo works. |
| E3 | Sword in BossScene without acquiring in GameScene | Player in BossScene has `abilities.sword = false`. Only basic 2-hit combo. |
| E4 | Buffer attack during Attack3 recovery | Input consumed but ignored (Attack3 is finisher). No chain possible. |
| E5 | Missing sword texture | Use `_setTextureStable()` which calls `_applyBodyConfig()`. Missing texture causes empty frame — log warning. |

---

*End of Sword Attack Upgrade System Design Document.*
