# Audio Direction — SEKAI: A 25-ji Metroidvania

> **Document Type:** Design Document  
> **Author:** Audio Director  
> **Status:** Draft  
> **Last Updated:** 2026-06-24  
> **Target Engine:** Phaser 3.87.0 (Web Audio API)

---

## 1. Sonic Identity

### 1.1 Core Pillars

| Pillar | Audio Implication |
|--------|-------------------|
| **Dark pixel-art fantasy** | Chiptune foundation with dark ambient layers; lo-fi warmth |
| **PJSK emotional resonance** | Melodic, melancholic themes; clean leads over gritty beds |
| **Precise combat feedback** | Instant, punchy SFX; no latency; clear hit-confirm |
| **Exploration & discovery** | Atmospheric pads/ambient textures; dynamic intensity |

### 1.2 Palette

| Element | Style | Reference |
|---------|-------|-----------|
| **Instruments** | 8-bit pulse waves, triangle bass, noise percussion | Cave Story, Anodyne |
| **Texture** | Lo-fi (22 kHz sample rate), slight bit-crush on ambient layers | Hyper Light Drifter |
| **Reverb/Space** | Dark halls → long decay (2.5s), outdoors → short (0.4s) | — |
| **SFX materials** | Synth-chip for UI, noise-based for hits, tonal for pickups | — |

### 1.3 Emotional Map

| Game State | Emotion | Audio Treatment |
|------------|---------|-----------------|
| Menu | Anticipation / Melancholy | Slow chiptune arpeggios, sparse, reverb-heavy |
| Exploration | Curiosity / Unease | Soft pulse + ambient pads, occasional dissonant accents |
| Combat (normal) | Tension | BGM sub-bass increases, SFX punchy |
| Boss Phase 1 | Urgency | Driving BPM 145, aggressive leads |
| Boss Phase 2 | Desperation | BPM 185, distortion, higher pitch |
| Victory | Relief / Triumph | Ascending arpeggio, chime |
| Death | Failure / Regret | Slow fade-out, single piano-esque tone |

---

## 2. BGM Track Map

### 2.1 Files & Assignment

| Scene | Track | Loop | Volume | Crossfade |
|-------|-------|------|--------|-----------|
| `MenuScene` | `menu_title.mp3` | Yes | 0.35 (≈ −9 dB) | — |
| `GameScene` | `chiptune_exploration.mp3` | Yes | 0.30 (≈ −10 dB) | Fade in 1s on scene start |
| `BossScene` (Phase 1) | `8bit_action_boss_battle_bpm145.mp3` | Yes | 0.40 (≈ −8 dB) | Start immediately on scene create |
| `BossScene` (Phase 2) | `8bit_action_boss_battle_climax_bpm185.mp3` | Yes | 0.45 (≈ −7 dB) | Crossfade from Phase 1 over 1.5s |

### 2.2 Phase Transition Audio Flow (BossScene)

```
Phase 1 active: play bgm_boss_phase1 (loop)
  ↓ (HP ≤ 50%)
Phase Transition: 
  → Flash effect
  → bgm_boss_phase1.fadeOut(1500)
  → bgm_boss_phase2.fadeIn(1500) with 0.5s delay
Phase 2 active: bgm_boss_phase2 (loop)
  ↓ (HP ≤ 0)
Defeat: 
  → bgm_boss_phase2.stop()
  → Play sfx_combo_powerup (victory chime)
  → Silence during victory text
```

### 2.3 Scene Transition Audio Flow

```
MenuScene:
  → create(): play bgm_menu (loop, fade in 1s)
  → goTo('GameScene'): bgm_menu.fadeOut(500)

GameScene:
  → create(): play bgm_explore (loop, fade in 1s)
  → launchOverlay('BossScene'): bgm_explore.pause()
  → overlay result (victory): bgm_explore.resume()
  → overlay result (death): bgm_explore.resume()

BossScene:
  → create(): play bgm_boss_phase1 (loop)
  → finishOverlay(): stop all bgm
```

---

## 3. SFX Categories & Usage

### 3.1 Player SFX

| Trigger | File | Volume | Priority | Notes |
|---------|------|--------|----------|-------|
| Jump | `sfx_player_jump_01.wav` | 0.50 | High | Short chirp; play on each jump |
| Attack1 startup | `sword_synth_shing.mp3` | 0.60 | High | Bright synth shing |
| Attack2 active | `sword_attack.mp3` | 0.70 | High | Heavier, lower-pitched |
| Air attack active | `slash_rpg.mp3` | 0.55 | High | Whoosh + impact |
| Hurt | `sfx_player_hurt_01.wav` | 0.70 | Critical | Sharp, short; play on hit |
| Death | `player_death.mp3` | 0.80 | Critical | Slow descending tone |
| Combo hit confirmation | `sfx_combo_resonance_01.wav` | 0.50 | Medium | Percussive chime |
| Feelings gain | `sfx_combo_feelings_01.mp3` | 0.45 | Low | Subtle ascending tone |

### 3.2 Enemy SFX

| Trigger | File | Volume | Priority | Notes |
|---------|------|--------|----------|-------|
| Take damage (any) | `sfx_enemy_hurt_01.wav` | 0.65 | High | Generic blip |
| Death (any) | `sfx_enemy_death_01.wav` | 0.70 | High | Explosion burst |
| FloatingShard ambient | `sfx_enemy_fly_01.wav` | 0.15 | Low | Continuous loop? Or short periodic buzz |
| Boss melee telegraph | `sfx_enemy_roar_01.mp3` | 0.55 | High | Play during telegraph phase |
| Boss hit | `sfx_enemy_metal_hit_01.mp3` | 0.60 | High | Clang sound |
| Boss death | `sfx_enemy_death_02.mp3` | 0.75 | Critical | Long explosion |

### 3.3 UI SFX

| Trigger | File | Volume | Priority | Notes |
|---------|------|--------|----------|-------|
| Menu navigate (↑/↓) | `sfx_ui_navigate_01.wav` | 0.40 | Medium | Short tick |
| Menu confirm (J/Space) | `sfx_ui_confirm_01.wav` | 0.50 | Medium | Confirm blip |
| Start game | `menu_select.mp3` | 0.55 | Medium | Ascending arpeggio |
| Item pickup / coin | `sfx_ui_coin_01.wav` | 0.50 | Medium | Classic coin |

### 3.4 Combo / Feelings SFX

| Trigger | File | Volume | Priority | Notes |
|---------|------|--------|----------|-------|
| Combo ≥ 2 | `sfx_combo_resonance_01.wav` | 0.50 | Medium | Re-trigger on each combo hit |
| Feelings fill bar | `sfx_combo_feelings_01.mp3` | 0.40 | Low | Only when > 50% full |
| Powerup (boss defeated) | `sfx_combo_powerup_01.mp3` | 0.60 | High | Victory chime |

---

## 4. Mix Strategy

### 4.1 Volume Hierarchy (from loudest to quietest)

1. **Gameplay-critical SFX** (player hurt, enemy death) → 0 dB reference, must never be masked
2. **Combat SFX** (sword swings, hits) → −2 to −4 dB
3. **UI SFX** (menu, confirm) → −6 to −8 dB
4. **Ambient SFX** (fly loop, wind) → −12 to −16 dB
5. **BGM** → −8 to −12 dB (always under SFX)

### 4.2 Ducking Rules

- When `sfx_player_hurt` plays: duck BGM by −6 dB for 0.5s (Phaser: use `sound.setVolume()`)
- When boss roars (`sfx_enemy_roar`): duck BGM by −4 dB for 1.0s
- When `sfx_combo_resonance` triggers: reduce other SFX by −3 dB for 0.3s

**Implementation note:** Simple ducking via direct BGM volume modulation in the calling code (no need for a full mixer bus in Phaser 3).

### 4.3 Spatial Audio

- All audio is **mono** (retro aesthetic).  
- Pan can shift slightly based on player X position vs. sound source (±20° max).  
- **Not implemented in initial pass** — revisit if immersion requires it.

### 4.4 Frequency Balance Goals

| Band | Goal | Method |
|------|------|--------|
| Bass (20–200 Hz) | Clear but not boomy | Limit BGM sub-bass; SFX hits have short decay |
| Mid (200–2000 Hz) | Full but not muddy | SFX hits occupy 400–800 Hz, BGM occupies 200–600 Hz |
| High (2k–20k Hz) | Crisp, not piercing | Chiptune leads at 2k–4k; noise at 6k–8k with gentle rolloff |

---

## 5. Audio Event Architecture

### 5.1 Event → Trigger Map

| Game Event | Trigger Type | Audio Response | Priority |
|------------|-------------|----------------|----------|
| Player presses jump | `keydown` | `sfx_player_jump` | High |
| Player enters attack1 startup | state machine | `sfx_sword_att1` | High |
| Player enters attack2 active | state machine | `sfx_sword_att2` | High |
| Player enters air attack active | state machine | `sfx_sword_air` | High |
| Player.takeDamage() called | function call | `sfx_player_hurt` | Critical |
| Player.die() called | function call | `sfx_player_death` | Critical |
| Enemy.takeDamage() called | function call | `sfx_enemy_hurt` | High |
| Enemy.die() called | function call | `sfx_enemy_death` | High |
| Boss.takeDamage() called | function call | `sfx_boss_hit` | High |
| Boss enters melee_telegraph | state machine | `sfx_enemy_roar` | High |
| Boss enters phase_transition | state machine | BGM crossfade | Critical |
| Boss._die() called | function call | `sfx_enemy_death_02` → `sfx_combo_powerup` | Critical |
| Menu _navigate() called | function call | `sfx_ui_navigate` | Medium |
| Menu _confirmItem() called | function call | `sfx_ui_confirm` / `sfx_ui_start` | Medium |
| Player.onHitEnemy() called | function call | `sfx_combo_resonance` (if combo ≥ 2) | Medium |
| Feelings increases | value change | `sfx_combo_feelings` (if value > 50 after change) | Low |

### 5.2 Playback Rules

- **No more than 2 instances of the same SFX simultaneously** (Phaser allows unlimited — prevent stacking by checking `this.scene.sound.get('key')` length or using a cooldown).
- **One-shot SFX** use `scene.sound.play(key, config)`.  
- **Looping SFX** (ambient fly, BGM) use `scene.sound.add(key, { loop: true })` and store reference.
- **BGM** is managed as a single `this.bgm` reference per scene.

### 5.3 Concurrency Limits

| Category | Max Simultaneous Instances | Behavior at Limit |
|----------|---------------------------|-------------------|
| Player SFX | 2 | Oldest stopped |
| Enemy SFX | 3 | Oldest stopped |
| UI SFX | 2 | Newest dropped |
| BGM | 1 | Fade out current, start new |
| Ambient | 1 | Always plays |

---

## 6. Asset Specifications

### 6.1 Format & Quality

| Attribute | BGM | SFX |
|-----------|-----|-----|
| Format | MP3 | MP3 / WAV |
| Sample rate | 44.1 kHz | 44.1 kHz (MP3) / 22.05 kHz (WAV) |
| Bitrate | 192 kbps (VBR) | 192 kbps (CBR) |
| Channels | Stereo (collapsed for retro feel) | Mono |
| Loudness (integrated) | −14 LUFS | −12 LUFS |
| True peak | −2 dB | −2 dB |
| Max file size | 6 MB | 200 KB |
| Loop points | Seamless (no clicks) | — |

### 6.2 Naming Convention

All files follow the project standard:
```
[category]_[context]_[name]_[variant].[ext]
```

Examples in use:
- `sfx_player_jump_01.wav`
- `sfx_enemy_hurt_01.wav`
- `sfx_combo_resonance_01.wav`
- `bgm_menu_title.mp3` (internal key: `bgm_menu`)

### 6.3 File Size Budget

| Category | Total Budget | Current | Remaining |
|----------|-------------|---------|-----------|
| BGM | 25 MB | ~15 MB (7 tracks) | 10 MB |
| Player SFX | 1 MB | ~140 KB (5 files) | 860 KB |
| Enemy SFX | 2 MB | ~470 KB (12 files) | ~1.5 MB |
| UI SFX | 1 MB | ~190 KB (9 files) | 810 KB |
| Combo SFX | 500 KB | ~100 KB (5 files) | 400 KB |
| Zip archives | 6 MB (dev only) | ~4.8 MB (3 zips) | 1.2 MB |
| **Total (runtime)** | **~30 MB** | **~16 MB** | **14 MB** |

---

## 7. Implementation Plan

### 7.1 Phase 1 — Core Integration (This Session)

1. Add audio preload to `BootScene.js`
2. Add player SFX to `Player.js` (jump, attack, hurt, death)
3. Add enemy SFX to `Enemy.js` (hurt, death)
4. Add boss SFX to `BossMafuyu.js` (roar, hit, phase transition, death)
5. Add BGM + UI SFX to `MenuScene.js`
6. Add exploration BGM to `GameScene.js`
7. Add boss BGM to `BossScene.js` (Phase 1 / Phase 2 crossfade)
8. Add combo SFX to `HUD.js`

### 7.2 Phase 2 — Polish (Future)

- Ducking BGM on critical SFX
- Spatial pan based on entity position
- Dynamic intensity layer for exploration BGM (added tracks for combat)
- Audio settings menu (master volume, SFX volume, BGM volume)
- Hit-stop audio sync (stretch audio during hit-stop frames)

---

## 8. Reference Games

| Game | Element to Emulate |
|------|--------------------|
| **Cave Story** | Sharp, immediate SFX; memorable chiptune melodies |
| **Hyper Light Drifter** | Sparse, atmospheric texture; impactful hits |
| **Anodyne** | Lo-fi warmth; melancholic exploration themes |
| **Shovel Knight** | Clean instrument separation; clear priority hierarchy |

---

*This document is a living reference. Update as audio evolves.*
