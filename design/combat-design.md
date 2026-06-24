# Combat System Design — 25miku vs Mafuyu

> **Status**: Final Draft
> **Author**: game-designer (collaborative with user)
> **Last Updated**: 2026-06-24
> **Target Scene**: GameScene (Boss Arena)
> **Engine**: Phaser 3 + Arcade Physics (60fps target)
> **Theme**: 25-ji (Nightcord) — melancholic but empowering

---

## Table of Contents

1. [System 1: Player Attack System](#system-1-player-attack-system)
2. [System 2: Boss Battle (Mafuyu)](#system-2-boss-battle-mafuyu)
3. [System 3: Player Stats & HUD](#system-3-player-stats--hud)
4. [Combat Flow Reference](#combat-flow-reference)

---

## System 1: Player Attack System

### 1.1 Player Fantasy

The player should feel **precise, rhythmic, and emotionally expressive**. Each slash is deliberate — not a frantic button mash. The timed combo window rewards the player who learns the rhythm of the blade, tying directly to PJSK's music/rhythm identity. The Feelings meter represents 25miku's emotional resonance — building it through combat, releasing it in a cathartic special.

**MDA Mapping:**
- **Aesthetics**: Challenge (timing precision), Sensation (hit stop, screen shake), Expression (combat rhythm as self-expression)
- **Dynamics**: Hit → pause → read enemy → time next attack. The player dances with the boss.
- **Mechanics**: Timed combo windows, hitbox positioning, Feelings meter gain on connect.

### 1.2 Input

| Action | Key | Type |
|--------|-----|------|
| Attack | `J` or `Z` | On-press (JustDown) |
| (Movement) | WASD / Arrows | Held |
| (Jump) | `W` / Up / Space | JustDown |
| (Dash) | Not yet implemented | — |

### 1.3 Ground Combo: Two-Hit Slash Chain

The ground combo has two stages: **Slash 1** and **Slash 2**. Pressing attack during the **combo window** (late recovery of Slash 1) chains into Slash 2. If the window is missed, the combo ends and the player must start fresh.

#### Slash 1 (Horizontal Arc) — Sprite: `25miku_att1.png`

| Phase | Frames (60fps) | Duration (ms) | Behavior |
|-------|----------------|---------------|----------|
| **Startup** | 1–5 | 5f / 83ms | Player flashes white. Slight lunge forward (20px over 5 frames). No hitbox yet. |
| **Active** | 6–9 | 4f / 67ms | Hitbox is live. Can hit the boss. |
| **Recovery** | 10–17 | 8f / 133ms | Cannot attack. Can move (reduced speed, 50% normal). |
| **Combo Window** | 11–15 | 5f / 83ms | If `J`/`Z` pressed during these frames → chain to Slash 2 startup. Otherwise → end. |
| **Total (no chain)** | 1–17 | 17f / 283ms | Full animation. |
| **Total (chained)** | 1–10 (+ Slash 2) | 10f + Slash 2 | Combo continues. |

#### Slash 2 (Wide Arc) — Sprite: `25miku_att2.png`

| Phase | Frames (60fps) | Duration (ms) | Behavior |
|-------|----------------|---------------|----------|
| **Startup** | 1–6 | 6f / 100ms | Player steps forward (25px). Sword charges behind. No hitbox. |
| **Active** | 7–11 | 5f / 83ms | Hitbox is live. Wider arc than Slash 1. |
| **Recovery** | 12–21 | 10f / 167ms | Cannot act at all (full recovery). Combo ends. |
| **Total** | 1–21 | 21f / 350ms | Full animation. |

#### Total Ground Combo Duration (optimal chain)

- Slash 1 startup → chain to Slash 2 → Slash 2 recovery: **10f + 21f = 31 frames = 517ms**
- During this time, the player is committing to the combo. Cannot cancel out.

#### Key Design Notes:
- The combo window (frames 11–15 of Slash 1) overlaps with early recovery. This means the player must press **before** Slash 1 visually finishes — it's predictive, not reactive.
- If the player mashes `J`/`Z`, the input during Slash 1 active frames is **buffered** (stored for up to 5 frames). If the buffer aligns with the combo window, it chains. This prevents pure mashing from working — you need to learn the rhythm.
- **Buffer implementation**: Store the last attack press. On each frame during recovery, check if buffer time is within the combo window. Clear buffer after use.

### 1.4 Air Attack (Downward Thrust)

Triggered by pressing `J`/`Z` while the player is **airborne** (not touching ground) AND has upward velocity (rising) OR has passed the apex of the jump.

| Phase | Frames (60fps) | Duration (ms) | Behavior |
|-------|----------------|---------------|----------|
| **Startup** | 1–6 | 6f / 100ms | Player tilts sword downward. Added downward velocity: +120px/s (stacks with gravity). |
| **Active** | 7+ (until landing or 25f max) | 18f / 300ms max | Hitbox is live below player. Player descends faster (additional +80px/s, total +200px/s extra downward). |
| **Landing** | Instant on ground contact | — | Active ends immediately. Recovery: 6f / 100ms (player pulls sword out of ground). |
| **Miss Recovery** | After 25f max | 6f / 100ms | If no ground contact after 25f (400ms), active ends and player enters recovery in air. |

**Apex detection**: The air attack should only be available once the player has passed the jump apex (velocity.y >= 0). This prevents it from being a downward slam that instantly cancels upward momentum. For gameplay feel, check: `if (!onGround && body.velocity.y >= -50)` — allows the attack just before the actual apex.

### 1.5 Hitbox Specifications

All hitboxes are relative to the player's physics body top-left corner `(player.body.x, player.body.y)`. The player body is 24px wide × 40px tall. Hitboxes are created as Phaser.Physics.Arcade.Overlap zones attached to the player.

#### Slash 1 Hitbox (Facing Right)

| Property | Value |
|----------|-------|
| **X offset** | +22px (from player body left edge) |
| **Y offset** | -2px (from player body top edge) |
| **Width** | 28px |
| **Height** | 22px |
| **Center** | (body.x + 36, body.y + 9) |
| **Shape** | Rectangle, slightly in front and at torso/waist height |
| **Active frames** | 6–9 (4 frames) |

*If facing left: X offset = body.x - 28px (mirrored, hitbox in front of the flipped sprite)*

#### Slash 2 Hitbox (Facing Right)

| Property | Value |
|----------|-------|
| **X offset** | +26px |
| **Y offset** | -4px |
| **Width** | 36px |
| **Height** | 26px |
| **Center** | (body.x + 44, body.y + 9) |
| **Shape** | Rectangle, wider arc — covers more area in front and slightly above |
| **Active frames** | 7–11 (5 frames) |

#### Air Downward Thrust Hitbox

| Property | Value |
|----------|-------|
| **X offset** | +2px |
| **Y offset** | +22px (below player body) |
| **Width** | 20px |
| **Height** | 28px |
| **Center** | (body.x + 14, body.y + 50) |
| **Shape** | Rectangle, narrow but tall — a stab downward |
| **Active frames** | 7 onward (until landing, max 25f) |

#### Hitbox Implementation Notes for Phaser 3:
```javascript
// Slash 1 hitbox creation (conceptual)
this.slashHitbox = this.add.zone(0, 0, 28, 22);
this.physics.add.existing(this.slashHitbox, false); // not static
this.slashHitbox.body.setAllowGravity(false);
this.slashHitbox.setVisible(false); // invisible in production

// On attack active frame start:
const dir = this.player.flipX ? -1 : 1;
this.slashHitbox.body.x = this.player.body.x + (dir > 0 ? 22 : -28);
this.slashHitbox.body.y = this.player.body.y - 2;
this.physics.add.overlap(this.slashHitbox, this.boss, this.onHit, null, this);
```

### 1.6 Damage & Knockback

| Attack | Base Damage | Knockback X | Knockback Y | Hitstun | Hit Stop |
|--------|------------|-------------|-------------|---------|----------|
| **Slash 1** | 10 | 120px (away from player) | -40px (up) | 0.3s (18f) | 3f (50ms) |
| **Slash 2** | 18 | 180px (away) | -60px (up) | 0.5s (30f) | 5f (83ms) |
| **Air Thrust** | 15 | 80px (away) | -80px (up) | 0.4s (24f) | 4f (67ms) |

**Damage reduction**: Not implemented in this initial version. All hits deal full damage.

**Hit Stop (Freeze Frames)**:
- On hit, BOTH player and boss animations freeze for the specified duration.
- Particles and screen shake continue during freeze (creates dramatic impact).
- Frame timer does not count down during hit stop for active-frame tracking (hitbox remains live when hit stop ends, but only for remaining active frames).
- **Implementation**: Pause the scene's time scale locally for these actors, OR use a manual frame counter that skips update logic for the specified actors.

### 1.7 Visual Feedback on Hit

| Effect | Slash 1 | Slash 2 | Air Thrust |
|--------|---------|---------|------------|
| **Screen Shake** | 2px amplitude, 3f duration | 4px amplitude, 6f duration | 3px amplitude, 4f duration |
| **Flash** | White flash on enemy (1f) | White flash (2f) | White flash (1f) |
| **Hit Particles** | 3 small white arc particles | 5 larger arc particles + 1 tear-shaped particle | 2 vertical white streak particles |
| **Hit Spark** | Small spark at contact point | Medium spark | Small spark below contact |
| **Knockback Visual** | Enemy pushed back, slight tilt | Enemy pushed back hard, tilt + spin | Enemy slammed downward |

**Color Palette for Particles**: White (#ffffff) → Light blue (#a8d8ff) → Dark blue (#2d3561) fade. Matches 25-ji cold/melancholic aesthetic. No warm colors. No red. The cold white-blue palette reinforces the emotional tone.

### 1.8 Feelings (Resolve) Meter

| Property | Value |
|----------|-------|
| **Max Meter** | 100 units |
| **Gain on hit (any attack)** | +8 units |
| **Gain on kill** | +20 units |
| **Gain on taking damage** | +5 units (resilience through pain) |
| **Passive decay** | -1 unit per second out of combat (3s delay after last hit) |
| **Special cost** | 50 units (consume 50 on special activation) |
| **Special damage** | 35 base damage, full-screen arc, 8f hit stop, 6px shake |

**Special Attack Details** (future implementation — reserve the design space now):
- Trigger: `J`/`Z` held for 0.5s (or dedicated special key) when meter ≥ 50
- Wide hitbox: 64px × 48px in front of player
- Cleaves through all enemies
- Consumes 50 meter
- If meter ≥ 50 and special is available, the sword glows white-blue

### 1.9 Player State Machine

```
IDLE
  │
  ├─ press attack (ground) ───→ SLASH_1_STARTUP
  │                                │
  │                                ├─ active frames ──→ SLASH_1_ACTIVE
  │                                │                      │
  │                                │                      ├─ hit → HIT_STOP → continue active
  │                                │                      └─ active ends ──→ SLASH_1_RECOVERY
  │                                │                                          │
  │                                │                               ┌──────────┤
  │                                │                               │          │
  │                          press during combo window ──→ SLASH_2_STARTUP    │
  │                                │                               │          │
  │                          recovery ends ──→ IDLE          (same flow)      │
  │                                                                           │
  ├─ press attack (airborne) ──→ AIR_ATTACK_STARTUP                            │
  │                                │                                           │
  │                                ├─ active (descending) ──→ hit or miss      │
  │                                │                              │            │
  │                                ├─ land ──→ AIR_ATTACK_LAND_RECOVERY ──→ IDLE
  │                                └─ timeout ──→ AIR_ATTACK_AIR_RECOVERY ──→ IDLE
  │
  ├─ taking damage ──→ HITSTUN (0.3s) ──→ IDLE
  │
  └─ HP = 0 ──→ DEFEAT (death animation)
```

### 1.10 Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Attack input during startup frames** | Buffered for up to 5f. If buffer aligns with combo window, chains. Otherwise, buffered input is consumed but ignored (must re-press). |
| **Attack input during active frames** | Buffered. Same handling as above. Prevents "I pressed during the swing but it didn't register" feel. |
| **Player knocked out of Slash 2 recovery** | Recovery is interrupted. Player enters hitstun. This is intentional — committing to Slash 2 is a risk. |
| **Air attack from max height (y=0)** | If player can reach the top of the world (600px), air attack works normally. Active frames cap at 25f even without landing. |
| **Air attack very close to ground** | If player is within 20px of ground during startup, the attack completes startup but immediately transitions to land recovery (6f). The hitbox is active for at least 3f to prevent "I pressed attack and nothing happened" feel. |
| **Multiple enemies hit** | All enemies in the hitbox take full damage. Hit stop and shake trigger once on first hit. |
| **Hitbox active but boss is invulnerable (phase transition)** | No hit registers. Visual feedback: small "blocked" spark (gray, no screen shake). Meter does not gain. |
| **Special meter at 100** | Excess gain is lost (no overflow). Cap is 100. |
| **Player spams attack on ground** | First press starts Slash 1. If no timing match, combo ends. Player must wait for full recovery + idle before starting a new Slash 1. No benefit to mashing. |

---

## System 2: Boss Battle (Mafuyu)

### 2.1 Player Fantasy

This fight should feel like **reaching someone through combat**. Mafuyu isn't a monster — she's a girl in pain. The player should feel the weight of each hit. The fight is about persistence, understanding her patterns, and finally breaking through her emotional walls.

**MDA Mapping:**
- **Aesthetics**: Challenge (pattern recognition), Fantasy (tragic duel), Narrative (emotional arc through phases)
- **Dynamics**: Patience → Observation → Punishment rhythm. Not fast-paced combos — careful engagement.
- **Mechanics**: Telegraphs with melancholic visual language, delayed attacks that test patience, phase transition that changes the emotional register.

### 2.2 Boss Stats

| Stat | Value |
|------|-------|
| **Total HP** | 300 |
| **Phase 1 HP** | 300–151 (100% → ~50%) |
| **Phase 2 HP** | 150–0 (~50% → 0%) |
| **Ground Speed** | 150 px/s (walks/runs) |
| **Flight Speed** | 220 px/s (Phase 2) |
| **Dash Speed** | 400 px/s (Pattern B, Pattern D) |
| **Boss Body Size** | 48px × 64px (hitbox) |
| **Boss Sprite Size** | Rendered at ~64px × 80px (visual, with padding) |

### 2.3 Boss Hitbox

- **Collision body**: (`boss.x + 8`, `boss.y + 8`) with dimensions 48×64
- **Hurtbox** (where player attacks connect): Same as collision body
- **Contact damage hitbox**: Same 48×64 body — touching Mafuyu during non-attack states deals 5 contact damage to player
- **Active attack hitboxes**: Defined per pattern below (larger than body)

### 2.4 Phase 1: Grounded Reluctance (HP 300 → 151)

Mafuyu stays grounded. Her movement is slow, deliberate. She walks toward the player. Her attacks have clear, melancholic tells — she hesitates before each strike, giving the player time to react.

#### Pattern A: Run → Melee Slash

| Property | Value |
|----------|-------|
| **Trigger** | Distance > 80px from player, or Pattern B on cooldown |
| **Behavior** | Mafuyu runs toward player at 150px/s. Stops at 40px distance. Telegraph (0.5s = 30f). Swings sword in arc. |
| **Telegraph** | Mafuyu enters `boss_mfy_攻击.png` pose. Slow raise of sword over 0.5s (30f). A thin blue-white glow travels up the blade. |
| **Active frames** | 6f (100ms) — the slash itself is fast |
| **Hitbox** | 40px × 30px in front of Mafuyu. Active frames 4–9 of the swing animation. |
| **Damage** | 12 per hit |
| **Cooldown** | 2.5s after recovery ends |
| **Dodge** | Jump over her (safe). Dash behind her during the 0.5s telegraph (tight timing). Move away during run (she stops at 40px, so retreat works). |
| **Punish window** | 0.8s (48f) after the slash misses — Mafuyu is recovering. Get 1–2 hits. |
| **Notes** | If the player is behind her during telegraph, she turns around before swinging. No back-attack exploit. |

#### Pattern B: Backstep → Flight Dash Charge

| Property | Value |
|----------|-------|
| **Trigger** | Player is within 60px (close range) AND Pattern A is on cooldown |
| **Behavior** | Mafuyu backsteps quickly (100px over 10f = 167ms). Pauses in `boss_mfy_飞行冲撞.png` pose for 0.8s (48f). Color flash. Dashes forward. |
| **Telegraph** | Mafuyu shifts to `boss_mfy_飞行冲撞.png`. Her body glows white → teal over 0.8s. Eyes narrow. A soft wind particle effect appears around her. |
| **Dash speed** | 350px/s |
| **Dash distance** | 250px (travels this distance unless hitting a wall) |
| **Active frames** | Entire dash (active as soon as she moves forward, ~17f / 283ms at 350px/s covering 250px) |
| **Hitbox** | 36px × 30px in front of Mafuyu during the dash |
| **Damage** | 15 |
| **Cooldown** | 3s |
| **Dodge** | Jump over the dash (tight timing — jump as she lunges). Dash upward if aerial. Stand behind a platform (she stops at wall/edge). |
| **Punish window** | 0.6s (36f) after dash ends — Mafuyu skids to a stop and recovers. |
| **Notes** | If she hits a wall during dash, she stops immediately and enters a 0.4s stun. This rewards positioning near arena walls. |

#### Phase 1 AI Decision Tree (evaluated every 1.5s)

```
IF Pattern A cooldown ready AND (distance > 80px)
  → Execute Pattern A (60% chance)
  → Walk toward player otherwise

IF Pattern B cooldown ready AND (distance < 80px)  
  → Execute Pattern B (30% chance)
  → Walk toward player otherwise

IF distance > 200px
  → Walk toward player (close gap)

IF distance < 40px AND no pattern executing
  → Execute Pattern A (melee range) — 70% chance
  → Backstep (no attack, just reposition) — 30% chance
```

### 2.5 Phase 2: Liberation (HP 150 → 0)

#### Phase Transition (HP ≤ 150)

1. Mafuyu stops all action. If mid-attack, the attack completes but she doesn't start a new one.
2. 0.5s pause. Screen begins to darken (tint overlay fades to near-black over 1s).
3. Mafuyu rises into the air (floating upward over 1s to y=150). Uses `boss_mfy_解放攻击.png` pose.
4. Screen flash: full-screen white flash (2 frames). A cold, stark flash — not explosive, but emotionally stark.
5. A single line of text appears at screen center (subtitled): *"...I see. So this is what's inside."* or similar 25-ji emotional line. Fades over 3s.
6. Phase 2 begins. Mafuyu now flies. Arena lighting shifts to a slightly more desaturated/blue tone.

During the transition, the player can move but cannot attack Mafuyu (she is invulnerable). Player should use this time to position on a platform if desired.

#### Pattern C: Fly Up → Liberation Attack (Dive Bomb)

| Property | Value |
|----------|-------|
| **Trigger** | Phase 2. Distance > 120px from player ideal. Cooldown: 6s. |
| **Behavior** | Mafuyu flies up to y=80 (near top of screen). Hovers for 0.5s. The screen begins to tremble (subtle camera shake, 1px). She raises her arms — a blue-white orb forms at her chest over 1.5s. She dives diagonally toward the player's position at time of dive. On impact, creates an 80px radius explosion. |
| **Telegraph** | 1.5s total telegraph: (A) 0–0.5s: Fly to top, camera tremor starts. (B) 0.5–1.5s: Orb formation at chest — `boss_mfy_解放攻击.png` sprite. Screen gets a blue vignette. A targeting reticle (faint blue circle) appears on the ground at the impact point, growing brighter over the 1.5s. (C) 1.5s: She dives. |
| **Dive speed** | 500px/s (fast — covers 600px vertical in ~1.2s) |
| **Explosion hitbox** | 80px radius circle centered on impact point |
| **Damage** | 20 (highest single-hit damage in the fight) |
| **Cooldown** | 6s after landing + recovery |
| **Dodge** | Watch the ground reticle during the 1.5s telegraph. Walk/dash out of the circle. The targeting reticle locks to player position at the START of the dive, not during — so you can bait her to one side and dash to the other. |
| **Punish window** | 1.0s (60f) after impact — Mafuyu is recovering on the ground (she lands and is briefly stunned). Good time for a full combo. |
| **Notes** | If the dive misses entirely, she crashes into the ground and is stunned for 1.2s — a major punish opportunity. This rewards good positioning reads. |

#### Pattern D: Aerial Rapid Dashes

| Property | Value |
|----------|-------|
| **Trigger** | Phase 2. Mafuyu is airborne. Distance 100–200px from player. Cooldown: 5s. |
| **Behavior** | Mafuyu takes flight at y=200. She dashes horizontally at the player 3 times in quick succession. Each dash: 400px/s speed, covers ~250px before stopping and turning. 0.3s pause between dashes. |
| **Telegraph** | Mafuyu assumes `boss_mfy_飞行冲撞.png` pose in air. Her body flashes teal 3 times (rapidly, 0.5s total telegraph). Then she dashes. |
| **Dash hitbox** | 36px × 30px in front of Mafuyu during each dash |
| **Damage per dash** | 10 (if all 3 hit: 30 total) |
| **Cooldown** | 5s |
| **Dodge** | Each dash is horizontal. Jump over each one. Or stand on a platform at the right height to make her dash below you. The 0.3s pause between dashes gives you time to react. |
| **Punish window** | After the 3rd dash, Mafuyu hovers for 0.5s, breathing heavily (fatigue telegraph). This is a brief punish window — tight, air-to-air only. |
| **Notes** | Her dashes track roughly to player height. If you're on the ground for dash 1, jump for dash 2, land for dash 3 — pattern becomes predictable with practice. |

#### Phase 2 AI Decision Tree (evaluated every 2s)

```
IF just transitioned to Phase 2
  → 100% chance: Execute Pattern C (Liberation) as "welcome to phase 2"

IF Pattern C cooldown ready AND (distance > 100px) AND random < 40%
  → Execute Pattern C

IF Pattern D cooldown ready AND Mafuyu is airborne AND random < 35%
  → Execute Pattern D

IF Pattern A cooldown ready AND Mafuyu is on ground AND random < 40%
  → Land → Execute Pattern A

IF Pattern B cooldown ready AND close range AND random < 30%
  → Execute Pattern B

OTHERWISE:
  If airborne: Fly toward player, maintain height ~200px
  If grounded: Walk toward player, take off after 3s if no pattern fires
```

### 2.6 Phase 2.5: Desperation (HP ≤ 50 — HP ≤ 50)

When Mafuyu reaches 50 HP or below, she enters **Desperation Mode**:

- Attack patterns get **shorter cooldowns** (multiply all cooldowns by 0.7x)
- Pattern C (Liberation) gets a **faster telegraph** (1.0s instead of 1.5s)
- Mafuyu's movement becomes more erratic (speed +15%)
- **Visual change**: Mafuyu's sprite flickers between normal and a slightly desaturated version. Small blue particle tears float upward from her constantly.
- **Audio cue**: Music shifts to a more intense/desperate mix (if audio is implemented)
- **No new patterns** — she uses existing ones, just faster and more aggressive
- **Player HP warning**: The screen gets a very subtle red vignette when the player is below 20 HP

### 2.7 Boss Contact Damage

| Situation | Damage to Player |
|-----------|-----------------|
| Touching Mafuyu's body (non-attack state) | 5 contact damage, 0.2s knockback (push away) |
| Touching Mafuyu during active attack frames | Full attack damage (12/15/20/10 per dash) |
| Invulnerability period after being hit | 0.5s (30f) — standard i-frames |
| Knockback on player hit | Push player 80px away from Mafuyu, 40px up. Hitstun: 0.25s. |

### 2.8 Arena Layout

```
                    WORLD BOUNDS (y=0)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │                                  (y=200)                                 │
  │                                                                          │
  │    ┌──────────────┐                        ┌──────────────┐              │
  │    │  Platform A   │ (y=420)               │  Platform B   │ (y=360)    │
  │    │  128x16       │                        │  128x16       │             │
  │    └──────────────┘                        └──────────────┘              │
  │                                                                          │
  │                                                                          │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                                  GROUND (y=568)                          │
  │  ═══════════════════════════════════════════════════════════════════════  │
  │  x=0                          x=1600                         x=1600     │
  └──────────────────────────────────────────────────────────────────────────┘
```

| Element | Position | Size | Purpose |
|---------|----------|------|---------|
| **Ground** | y=568 to y=600 | 1600×32 | Main fighting surface |
| **Platform A** | (400, 420) | 128×16 | Allows player to jump up and air-attack Mafuyu from below in both phases |
| **Platform B** | (1100, 360) | 128×16 | Higher platform for evading Pattern D dashes. Also gives player aerial advantage. |
| **Left wall** | x=0 | Full height | World boundary |
| **Right wall** | x=1600 | Full height | World boundary |
| **Ceiling** | y=0 | Full width | World boundary (camera tracks, but Mafuyu can fly up here) |
| **Player spawn** | (200, 500) | — | Player enters from left side |
| **Boss spawn** | (800, 500) | — | Mafuyu starts at center |

**Arena boundary**: When boss battle starts, lock the camera to the arena bounds. The player cannot leave (invisible walls at x=0 and x=1600, or use `this.physics.world.setBounds`). The boss health bar appears at the top of the screen.

### 2.9 Win/Lose Conditions

| Condition | Trigger | Outcome |
|-----------|---------|---------|
| **Win** | Boss HP reaches 0 | Mafuyu pauses mid-action. 1s silence. She looks at her hands. Slow fade to white. Emotional death animation (she doesn't explode — she fades like dissolving memories). Screen goes white. Player is returned to the hub/normal world. Boss drops a "memory fragment" collectible. |
| **Lose** | Player HP reaches 0 | Player stumbles, collapses (25miku defeat sprites). Screen fades to dark over 2s. Text appears: *"The feelings scatter... but they remain."* Options: "Try Again" (restart phase) or "Return" (exit to hub). Player restarts from the current phase (Phase 1 or 2) — not from full HP boss. |
| **Retry checkpoint** | Phase transition completed | Player's last save point is at phase transitions: Phase 1 start, Phase 2 start. Retrying after death restores player to 50% HP (not full). |

### 2.10 Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Boss pushed into wall during Pattern B dash** | Dash stops. Mafuyu enters 0.4s stun. Punish window is shorter than normal dash miss. |
| **Player at y=0 during Pattern C dive bomb** | Dive bomb explosion hitbox still works (it's a circle). Player cannot escape by going to the ceiling. |
| **Both Pattern A and B cooldowns ready** | AI evaluates both, picks one. Preference: Pattern A if distance > 80px, Pattern B if distance < 60px. |
| **Player never attacks (runs away)** | Mafuyu walks toward player. If distance stays > 300px for 5s, she does a short "burst" run (250px/s for 1s) to close gap. No infinite running. |
| **Mafuyu at exactly 0 HP during Liberation attack dive** | Boss HP = 0 overrides current action. She immediately stops, hangs in air for 1s, then enters death animation. The dive bomb does not complete. Player is safe. |
| **Multiple patterns triggered simultaneously** | Patterns are evaluated sequentially in priority order. Priority: C > D > A > B > walk. Only one pattern fires per evaluation cycle. |
| **Boss room transition** | When player walks into boss room area (x ≈ 0, the left entrance), camera locks. Boss spawns. Door closes behind player (visual wall). |

---

## System 3: Player Stats & HUD

### 3.1 Player Stats

| Stat | Value | Notes |
|------|-------|-------|
| **Max HP** | 100 | Total health pool |
| **Heart Pip Value** | 10 HP per pip | 10 pips total |
| **Base Attack (Slash 1)** | 10 | Per hit |
| **Base Attack (Slash 2)** | 18 | Per hit |
| **Base Attack (Air)** | 15 | Per hit |
| **Feelings Meter Max** | 100 units | Builds on hit |
| **Feelings Gain per Hit** | +8 units | Any attack |
| **Feelings Gain on Taking Damage** | +5 units | Resilience mechanic |
| **Feelings Decay** | -1/s after 3s out of combat | Returns to 0 over time |
| **Contact Damage Taken** | 5 per touch | From boss body |
| **Invulnerability After Hit** | 0.5s (30f) | Cannot be hit again during this window |
| **Movement Speed** | 200 px/s (max) | Existing value |
| **Jump Velocity** | -420 px/s | Existing value |

### 3.2 Damage Scaling

For this version, damage values are **fixed** (no damage scaling based on stats or upgrades). Design space reserved for future:

- **Future**: If the game gains upgrade/level systems, damage formula becomes:
  `FinalDamage = BaseDamage × (1 + 0.1 × UpgradeLevel)`
- **Future crit system**: Landing Slash 2 at the very end of the combo window (frame 15 of Slash 1) could give 1.5x damage (rewards perfect timing)

### 3.3 HUD Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥                    ■ Mafuyu ■                        │
│  [❤❤❤❤❤❤❤❤❤❤]                     [████████████████░░░░░] 150/300 HP       │
│                                                                              │
│                                                                              │
│                                        ◆ Feelings ◆                          │
│                                        [████████░░░░] 40/100                │
│                                                                              │
│                                                                              │
│                                   ┌──────────────────────┐                   │
│                                   │   × 3 (combo counter)│  (brief, fades)   │
│                                   └──────────────────────┘                   │
│                                                                              │
│  ◄─────────────── 1600px arena ─────────────────────────────────►            │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### HUD Elements (top to bottom):

| Element | Position | Style | Behavior |
|---------|----------|-------|----------|
| **Heart Pips** | Top-left: (20, 20) | 10 small tear/heart shapes. Filled = full 10 HP. Empty = lost that pip. Half-pip = 5 HP remaining in that pip. | Drawn each frame based on player HP. Pips animate on damage (brief shake, then fade out). Color: white when full, dark blue-grey when empty. |
| **Boss Name** | Top-center: (800, 20) | Text: "Mafuyu" (or "???" before first encounter). Font: pixel font, size 16, color #a8d8ff (light blue). | Only visible during boss fight. Fades in over 0.5s when boss spawns. |
| **Boss HP Bar** | Top-center: (800, 40) | Width: 200px, Height: 12px. Background: dark (#1a1a2e). Bar: gradient from #a8d8ff (light blue) → #2d3561 (dark blue). Segments for each 10% HP. | Updates smoothly (lerp over 0.3s). When bar depletes to 0, flashes white then fades out. |
| **Feelings Meter** | Bottom-center: (800, 570) | Thin bar: 120px × 6px. Background: dark (#1a1a2e). Bar: white → light blue gradient. Label: small "FEELINGS" text above. | Visible always. Fills on hit. Glows when ≥ 50 (special ready). Pulses subtly. |
| **Combo Counter** | Center-right: temporary | Small number "×N" in white. Appears when hitting the boss in rapid succession. Combo = hits within 2s of each other. Fades out after 1.5s of no hits. | Purely visual reward — no mechanical effect. Renamed per 25-ji theme: "Resonance ×3" |

#### HUD Implementation Notes for Phaser 3:

```javascript
// Health pips as Phaser GameObjects
// Create 10 sprites or graphics objects
const pipWidth = 14;
const pipHeight = 14;
const pipSpacing = 4;
for (let i = 0; i < 10; i++) {
    this.hudHeartPips[i] = this.add.graphics()
        .setScrollFactor(0) // fixed to camera
        .setDepth(100); // always on top
    // Draw filled or empty based on HP
    // Position: (20 + i * (pipWidth + pipSpacing), 20)
}
```

#### HUD Update Logic:

```javascript
updateHUD() {
    // Health pips
    for (let i = 0; i < 10; i++) {
        const pipHP = 10; // 10 HP per pip
        const playerHPInPip = Math.max(0, this.playerHP - i * pipHP);
        const pipFull = playerHPInPip >= pipHP;
        const pipHalf = playerHPInPip >= pipHP / 2 && !pipFull;
        // Draw filled, half, or empty based on above
    }

    // Boss HP bar (if boss active)
    const bossHPPercent = this.bossHP / this.bossMaxHP;
    this.bossBar.clear();
    this.bossBar.fillStyle(0x2d3561, 1);
    this.bossBar.fillRect(700, 36, 200 * bossHPPercent, 12);

    // Feelings meter
    const feelingsPercent = this.feelings / 100;
    this.feelingsBar.clear();
    this.feelingsBar.fillStyle(0xa8d8ff, 1);
    this.feelingsBar.fillRect(740, 567, 120 * feelingsPercent, 6);
}
```

### 3.4 HUD Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Player HP at exactly 50** | Show 5 full pips, 5 empty. Pip 6 (the 60th HP) is empty. |
| **Boss HP bar during phase transition** | Bar stays at the transition threshold (~50%) during the animation. Updates after phase 2 begins. |
| **Feelings meter at exactly 50** | Bar shows 50% full. Glow activates (special ready). |
| **Multiple boss encounters** | Boss HP bar shows the current boss. For now, only Mafuyu boss exists. |
| **Combo counter during phase transition** | Counter resets to 0 when boss becomes invulnerable. |

---

## Combat Flow Reference

### 4.1 Typical Boss Encounter (Experienced Player)

**Opening (0–10s):**
1. Player enters arena. Camera locks. Boss health bar appears.
2. Mafuyu stands at center, facing player. No aggro for 1s (dramatic pause).
3. Player closes distance (~3s of running).
4. Mafuyu begins Pattern A telegraph. Player reads the tell and jumps over the slash.
5. Player lands behind Mafuyu, executes Slash 1 (press `J`). Hit connects. +8 Feelings.
6. Player times the combo window: presses `J` on frame 13 of Slash 1 recovery. Slash 2 chains. Hit connects for 18 damage. +8 Feelings. Screen shake. Hit stop.
7. Mafuyu recovers. Player backs off.

**Mid Phase 1 (10–60s):**
1. Mafuyu uses Pattern A. Player dodges → punishes with Slash 1 → Slash 2 combo.
2. Mafuyu uses Pattern B. Player jumps over the dash. Mafuyu hits the right wall and stuns briefly.
3. Player rushes in for a quick Slash 1 (no time for full combo during the short stun).
4. Cycle repeats. Player learns that Pattern B → wall stun is the best punish opportunity.
5. Mafuyu at ~50% HP (150 HP remaining). She pauses.

**Phase Transition (60–65s):**
1. Mafuyu stops moving. Screen darkens. She rises into the air.
2. Flash. Dialogue line. Phase 2 begins.
3. Player uses this time to climb Platform B (y=360) for aerial advantage.
4. Feelings meter should be around 40–60 by now (from all the hits).

**Phase 2 (65–120s):**
1. Mafuyu opens with Pattern C (Liberation dive bomb). Player sees the targeting reticle on the ground, dashes out. Mafuyu crashes into the ground.
2. Major punish: Player lands a full Slash 1 → Slash 2 combo. Feelings meter hits 70+.
3. Mafuyu takes flight. Pattern D: 3 rapid dashes. Player jumps over dash 1, stays airborne for dash 2, lands and dodges dash 3.
4. During the fatigue window after dash 3, player does an air attack (jump → downward thrust). Hits Mafuyu for 15 damage.
5. Cycle: Pattern A (ground), Pattern D (air), Pattern C (dive bomb), Pattern B (close range).
6. Player learns which positions are safe for each pattern.

**Desperation (120–140s):**
1. Mafuyu at 50 HP. Faster cooldowns. Screen flickers slightly.
2. Pattern C comes fast (1.0s telegraph). Player must react quickly.
3. Player finally lands the killing blow. Slash 2 connects at 0 HP.

**Resolution (140s+):**
1. Mafuyu stops mid-action. Looks at her hands. Slow fade.
2. Screen goes white. Memory fragment collected.
3. Player exits the arena.

### 4.2 Beginner Experience (First Attempt)

- **First 30s**: Player gets hit by Pattern A because they didn't read the telegraph. Takes 12 damage. Learns the tell (sword raise → jump). Tries again.
- **Next 30s**: Player learns to dodge Pattern A. Starts landing Slash 1 but misses the combo window for Slash 2 (too early, too late).
- **Next 30s**: Player starts landing the full combo. Hits Phase 1 consistently.
- **Phase 2 shock**: Pattern C dive bomb hits the player the first time (didn't see the reticle). 20 damage — a big hit. Player learns to watch the ground.
- **Typical first clear**: 3–5 attempts. Each attempt teaches one pattern. Clear time: ~3 minutes when mastered.
- **Player HP at end**: Usually 20–40 HP remaining for first clear (tense finish). Gets cleaner with practice.

### 4.3 Loop Mapping

| Loop Layer | Duration | Content |
|-----------|----------|---------|
| **Micro-loop** | 0.5–2s | Attack → hitstop → recovery → read boss → position |
| **Meso-loop** | 10–30s | Dodge a pattern → punish window → land combo → reset to neutral |
| **Macro-loop** | 2–3 min | Phase 1 → Phase Transition → Phase 2 → Desperation → Victory |

---

## Future Design Space (Not Implemented Yet)

These are reserved for future iterations and are noted here for architectural awareness:

| Feature | Notes |
|---------|-------|
| **Upward attack** | Use a different attack sprite. Hitbox above player. |
| **Downward attack (on ground)** | Crouching attack? Not needed for Metroidvania. |
| **Dodge roll** | I-frames on roll. Would change boss balance significantly. |
| **Wall jump** | Would add verticality to boss arena design. |
| **Feelings special attack** | Consume 50 meter for wide slash. Damage: 35. |
| **Upgrade system** | Damage scaling formula reserved. |
| **Parry/block** | Would add a new layer to combat. Boss attacks could have parry windows. |
| **Multiple bosses** | Future: Other 25-ji members (Mizuki, Kanade, Ena) could be optional bosses. |
| **Boss rush mode** | Time attack against all bosses sequentially. |

---

*End of Combat System Design Document.*
