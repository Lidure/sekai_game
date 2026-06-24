# Enemy & Combat Design — Mafuyu as Player + Overworld Enemies

> **Status**: Final Draft
> **Author**: game-designer
> **Last Updated**: 2026-06-24
> **Target Scene**: GameScene (overworld) + global combat
> **Engine**: Phaser 3 + Arcade Physics (60fps target)
> **Theme**: 25-ji (Nightcord) — melancholic, introspective, "Facing Yourself"

---

## Table of Contents

1. [Mafuyu Player Adjustments](#1-mafuyu-player-adjustments)
2. [Enemy Specs](#2-enemy-specs)
3. [Enemy Class Architecture](#3-enemy-class-architecture)
4. [Integration with Existing Systems](#4-integration-with-existing-systems)
5. [Implementation Priority](#5-implementation-priority)

---

## 1. Mafuyu Player Adjustments

### 1.1 Design Rationale

Switching from 25miku to Mafuyu changes the combat identity:

| Dimension | 25miku (old) | Mafuyu (new) | Why |
|-----------|-------------|--------------|-----|
| **Combat feel** | Light, quick, rhythmic | Heavy, deliberate, weighty | Mafuyu's weapon (mfy_武器1.png) is visually massive — ~1328×1783 content vs sword's ~572×600. A larger weapon should feel heavier. |
| **Movement** | Swift, agile | Measured, grounded | Mafuyu's emotional state is burdened. Her movement reflects someone carrying weight. |
| **Damage profile** | Fast chip damage | Slow burst damage | Slower attacks need higher per-hit payoff to maintain TTK parity. |
| **Player fantasy** | Precise dancer | Powerful striker | Mafuyu's attacks should feel like they HURT — each swing is a release of emotional weight. |

**MDA Mapping (Mafuyu):**
- **Aesthetics**: Sensation (impact weight), Challenge (committing to slow attacks), Expression (heavy strikes as emotional release)
- **Dynamics**: More pause between actions, higher risk/reward on each attack, positioning matters more (can't spam)
- **Mechanics**: Longer frame data, higher damage, wider hitboxes, slightly slower movement

### 1.2 Movement Stat Changes

| Stat | 25miku (current) | Mafuyu (proposed) | Change |
|------|-----------------|-------------------|--------|
| **Max Speed** | 200 px/s | **180 px/s** | −10% |
| **Jump Velocity** | −420 px/s | **−400 px/s** | −5% (shorter jump) |
| **Acceleration** | 600 px/s² | **600 px/s²** | Unchanged (feels responsive) |
| **Drag** | 800 px/s² | **700 px/s²** | −12% (slower to stop, less responsive) |

**Rationale**: Mafuyu's sprite art shows a taller, more grounded silhouette compared to 25miku. The 10% speed reduction plus 12% drag reduction (slower deceleration) creates a sense of momentum — Mafuyu needs to commit to her movement, just as she commits to her attacks.

### 1.3 Updated Frame Data

All frame durations recalculated at 60fps baseline. Mafuyu's attacks are **slower** (+1–2 frames startup and recovery per attack) compared to 25miku's current values.

| Attack State | 25miku Frames (code) | Mafuyu Frames | Mafuyu Duration | vs Old |
|-------------|---------------------|---------------|-----------------|--------|
| **Slash 1 startup** | 5f | **7f** | 117ms | +40% |
| **Slash 1 active** | 4f | **5f** | 83ms | +25% |
| **Slash 1 recovery** | 8f | **10f** | 167ms | +25% |
| **Slash 2 startup** | 6f | **8f** | 133ms | +33% |
| **Slash 2 active** | 5f | **6f** | 100ms | +20% |
| **Slash 2 recovery** | 10f | **12f** | 200ms | +20% |
| **Air startup** | 6f | **7f** | 117ms | +17% |
| **Air active (max)** | 25f | **25f** | 417ms | Unchanged |
| **Air recovery** | 6f | **8f** | 133ms | +33% |
| **Hurt stun** | 0.3s | **0.3s** | 300ms | Unchanged |

**Combo window**: Moves with the recovery. For Mafuyu: the combo window is **frames 4–8** of the 10f Slash 1 recovery (a 5f window starting 4f into recovery). This gives the player a generous but non-trivial timing window.

**Code change**: Update `_getStateDuration()` in `Player.js`:
```javascript
case 'attack1_startup': return at60fps(7);
case 'attack1_active': return at60fps(5);
case 'attack1_recovery': return at60fps(10);
case 'attack2_startup': return at60fps(8);
case 'attack2_active': return at60fps(6);
case 'attack2_recovery': return at60fps(12);
case 'air_attack_startup': return at60fps(7);
case 'air_attack_active': return at60fps(25);
case 'air_attack_recovery': return at60fps(8);
```

Also update the combo window check in `_handleAttack1State()`:
```javascript
// Current check (line 235):
if (attack && this.stateTimer > 0.069 && this.stateTimer < 0.138) {
// Mafuyu: combo window = frames 4-8 of 10f recovery = 4/60=0.067 to 8/60=0.133
if (attack && this.stateTimer > 0.067 && this.stateTimer < 0.133) {
```

### 1.4 Updated Damage Values

| Attack | 25miku (code) | Mafuyu (proposed) | Change | TTK vs 100HP |
|--------|--------------|-------------------|--------|-------------|
| **Slash 1** | 10 | **13** | +30% | 8 hits |
| **Slash 2** | 18 | **22** | +22% | — |
| **Air thrust** | 15 | **18** | +20% | 6 hits |
| **Full combo (S1+S2)** | 28 | **35** | +25% | 3 combos (105) |

**TTK vs enemies**:
- Shadow Fragment (3 HP): Slash 1 kills in 1 hit (13 ≥ 3) ✓
- Floating Shard (4 HP): Slash 1 kills in 1 hit (13 ≥ 4) ✓ (but still needs physical reach — floating)
- Boss (300 HP): ~9 full combos (was ~11 with old damage — similar time-to-clear due to slower attack speed)

### 1.5 Updated Hitbox Dimensions

Mafuyu's weapon (mfy_武器1.png) is substantially larger than the standard sword. Hitboxes are increased proportionally.

| Attack | 25miku (code) | Mafuyu (proposed) | vs Old |
|--------|--------------|-------------------|--------|
| **Slash 1 hitbox** | 12w × 10h | **20w × 18h** | +67% wider, +80% taller |
| **Slash 2 hitbox** | 16w × 12h | **28w × 22h** | +75% wider, +83% taller |
| **Air thrust hitbox** | (bw−10)w × 18h | **(bw−8)w × 24h** | slightly wider, +33% taller (bw = body width = 24) |
| **Slash 1 Y offset** | +15 from body top | **+12 from body top** | Higher (weapon arcs from shoulder) |
| **Slash 2 Y offset** | +14 from body top | **+10 from body top** | Higher (wide arc from upper body) |
| **Air Y offset** | body.height × 0.6 | **body.height × 0.55** | Slightly higher (thrust originates higher) |

**Actual hitbox positions** (world pixels, assuming body is 24×40 at (body.x, body.y)):

| Attack | X (facing right) | Y | Width | Height |
|--------|-----------------|---|-------|--------|
| Slash 1 | body.x + 24 + 2 = body.x + 26 | body.y + 12 | 20 | 18 |
| Slash 2 | body.x + 24 + 2 = body.x + 26 | body.y + 10 | 28 | 22 |
| Air | body.x + 2 | body.y + 22 | 16 | 24 |

**Code change**: Update `_updateHitbox()` and `_updateAirHitbox()` in `Player.js`:
```javascript
// _updateHitbox (lines 381-398):
if (attackNum === 1) {
    w = 20; h = 18; oy = 12;
} else {
    w = 28; h = 22; oy = 10;
}

// _updateAirHitbox (lines 400-405):
this.slashHitbox.body.setSize(bw - 8, 24);
this.slashHitbox.body.x = this.body.x + 2;
this.slashHitbox.body.y = this.body.y + Math.floor(this.body.height * 0.55);
```

### 1.6 Knockback & Hitstop Adjustments

Heavier weapon → harder knockback, longer hitstop:

| Attack | Knockback X | Knockback Y | Screen Shake | Hitstop |
|--------|------------|-------------|-------------|---------|
| Slash 1 | 130 (+10) | −45 (−5) | 3px (+1) | 67ms (+17ms) |
| Slash 2 | 200 (+20) | −70 (−10) | 5px (+1) | 100ms (+17ms) |
| Air | 90 (+10) | −90 (−10) | 3px (same) | 67ms (same) |

**Code change**: Update damage lookup table in `BossScene._onPlayerHitBoss()` and in new enemy hit handler.

### 1.7 Feelings Meter Integration

| Event | Gain | Notes |
|-------|------|-------|
| Hit any enemy (including boss) | +8 | Same as current `onHitBoss()` → renamed `onHitEnemy()` |
| Kill Shadow Fragment | +2 | Tiny emotional fragment released |
| Kill Floating Shard | +5 | More significant release |
| Boss victory | +20 | Same as current |
| Take damage (any source) | +5 | Same as current |

### 1.8 Sprite/Texture Changes

Mafuyu's sprites replace 25miku's in both BootScene loading and Player.js texture references:

| State | Current texture | New texture | Source file |
|-------|----------------|-------------|-------------|
| idle/run/jump/fall/hurt | `player_idle` | `player_idle` | `mfy1.png` (cropped) |
| attack1_startup/active/recovery | `player_att1` | `player_att1` | `mfy_att1.png` |
| attack2_startup/active/recovery | `player_att2` | `player_att2` | `mfy_att2.png` |
| air_attack_* | `player_att2` | `player_att2` | `mfy_att2.png` |

**BootScene loading** — change source paths in `preload()`:
```javascript
// Old: 25miku sprites
this.load.image('player_idle', 'assets/images/player_idle.png');

// New: mfy sprites (copied to assets/images/ or loaded from 游戏素材/)
this.load.image('player_idle', '游戏素材/mfy/mfy1.png');
this.load.image('player_att1', '游戏素材/mfy/mfy_att1.png');
this.load.image('player_att2', '游戏素材/mfy/mfy_att2.png');
```

**Scale note**: Current scale = 0.12. If Mafuyu's sprite content has different proportions than 25miku's, adjust scale to make Mafuyu's on-screen size look right. Likely 0.12–0.15 range. Tune visually.

---

## 2. Enemy Specs

### 2.1 Shared Enemy Properties

All overworld enemies share:

| Property | Value |
|----------|-------|
| **Contact damage invulnerability** | 0.5s (30f) after being hit — same as player i-frames |
| **Knockback on hit** | 80px away from player, −30px up (reduced vs boss since enemies are smaller) |
| **Hit flash** | White tint for 100ms on damage |
| **Death effect** | Fade out over 500ms + 3–5 small particle bursts (white→blue fade, matching 25-ji palette) |
| **Feelings on hit** | +8 (uses `player.onHitEnemy()`) |
| **Platform collision** | `this.physics.add.collider(enemyGroup, platforms)` |
| **World bounds** | `setCollideWorldBounds(true)` — prevents falling off world |
| **Player contact damage** | Deals `contactDamage` on touch, respects player i-frames. Same pattern as `_onBossTouchPlayer()`. |

### 2.2 Enemy: Shadow Fragment (影の欠片)

**Visual**: Small dark blob with two faint teal-cyan eyes (~24×24 world pixels). Slightly translucent (alpha 0.85). Wispy edges.

**Player Fantasy**: Clearing tiny negative thoughts — satisfying to one-shot with Mafuyu's heavy slash.

**Stats**:

| Property | Value |
|----------|-------|
| **HP** | 3 |
| **Contact Damage** | 5 (same as boss contact damage) |
| **Patrol Speed** | 40 px/s |
| **Chase Speed** | 65 px/s |
| **Detection Range** | 150 px (horizontal distance from player) |
| **Turn-around at edges** | Yes — reverse patrol direction when reaching platform edge |
| **Drop (Feelings on kill)** | +2 |
| **Spawn Count** | 5–8 per map |
| **Physics Body** | 20×20 world pixels, centered in 24×24 visual |
| **Sprite Key** | `enemy_shadow` (generated texture) |

**AI State Machine**:

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   PATROL ◄────────────────────┐              │
  │   │                           │              │
  │   ├─ Move at patrolSpeed in current direction │
  │   ├─ Platform edge ahead? → reverse direction │
  │   ├─ World bounds? → reverse direction        │
  │   └─ Player within 150px? → CHASE             │
  │                                               │
  │   CHASE ─────────────────────┐                │
  │   │                          │                │
  │   ├─ Move toward player at chaseSpeed         │
  │   ├─ Hit wall/bounds? → PATROL (reverse dir)  │
  │   └─ Player beyond 200px? → PATROL            │
  │                                               │
  └──────────────────────────────────────────────┘
```

**State transitions**:

| From | To | Condition |
|------|----|-----------|
| PATROL | CHASE | `Math.abs(playerX - this.x) < 150` |
| CHASE | PATROL | `Math.abs(playerX - this.x) > 200` OR `this.body.blocked.left \|\| this.body.blocked.right` |
| PATROL | (reverse) | At platform edge (no ground below next step in patrol direction) |

**Update logic** (in `_updateAI(dt, playerX, playerY)`):

```javascript
switch (this.state) {
    case 'patrol':
        // Move in current direction
        this.body.setVelocityX(this.patrolDir * this.patrolSpeed);
        // Check for player
        const dist = playerX - this.x;
        if (Math.abs(dist) < 150) {
            this.state = 'chase';
        }
        // Edge detection: check if ground exists ahead
        // (Simplified: use body.blocked or a raycast)
        if (this.body.blocked.left) this.patrolDir = 1;
        if (this.body.blocked.right) this.patrolDir = -1;
        break;

    case 'chase':
        // Move toward player
        const dir = playerX > this.x ? 1 : -1;
        this.body.setVelocityX(dir * this.chaseSpeed);
        this.facingRight = dir > 0;
        // Check exit conditions
        if (Math.abs(playerX - this.x) > 200 || this.body.blocked.left || this.body.blocked.right) {
            this.state = 'patrol';
            if (this.body.blocked.left) this.patrolDir = 1;
            if (this.body.blocked.right) this.patrolDir = -1;
        }
        break;
}
```

**Edge cases**:

| Situation | Behavior |
|-----------|----------|
| Player jumps over fragment | It continues chasing toward player X. If it walks off a platform, edge detection triggers reverse. |
| Multiple fragments near player | Each independently detects player. They don't coordinate. A small swarm of 2–3 can cluster — intentional (these are "fragments of negative thoughts"). |
| Fragment at world edge | `setCollideWorldBounds(true)` prevents falling. It patrols back and forth at the edge. |

### 2.3 Enemy: Floating Shard (浮遊する破片)

**Visual**: Floating purple crystal/shape, faceted. Emits faint particles (~16×16 world pixels). Bobs up and down with a sine wave.

**Player Fantasy**: Reaching fragments of memory — requires positioning (jumping to their height) to hit a floating target.

**Stats**:

| Property | Value |
|----------|-------|
| **HP** | 4 |
| **Contact Damage** | 8 |
| **Drift Speed** | 35 px/s (slow horizontal movement toward player) |
| **Detection Range** | 100 px (horizontal only — vertical position fixed) |
| **Bob Amplitude** | ±6px from origin Y (cosmetic only) |
| **Bob Period** | 1.5s (sine wave, cosmetic only) |
| **Drop (Feelings on kill)** | +5 |
| **Spawn Count** | 3–4 per map |
| **Spawn Height** | Y ≈ 250–400 (above ground, reachable by jumping from platforms) |
| **Physics Body** | 14×14 world pixels, centered in 16×16 visual |
| **Gravity** | Disabled (`body.setAllowGravity(false)`) |
| **Sprite Key** | `enemy_shard` (generated texture) |

**AI State Machine**:

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   HOVER ◄──────────────────────┐             │
  │   │                            │             │
  │   ├─ Bob up/down at origin Y (cosmetic)      │
  │   ├─ Subtle random idle drift ±10px          │
  │   └─ Player within 100px horiz? → DRIFT      │
  │                                              │
  │   DRIFT ───────────────────────┐             │
  │   │                            │             │
  │   ├─ Move toward player X at driftSpeed       │
  │   ├─ Y position stays at originY              │
  │   └─ Player beyond 150px? → RETURN           │
  │                                              │
  │   RETURN ────────────────────┐               │
  │   │                          │               │
  │   ├─ Drift back to originX at driftSpeed     │
  │   └─ Reached originX (±10px)? → HOVER       │
  │                                              │
  └──────────────────────────────────────────────┘
```

**State transitions**:

| From | To | Condition |
|------|----|-----------|
| HOVER | DRIFT | `Math.abs(playerX - this.x) < 100` |
| DRIFT | RETURN | `Math.abs(playerX - this.x) > 150` |
| RETURN | HOVER | `Math.abs(this.x - this.originX) < 10` |
| RETURN | DRIFT | (can re-detect player during return) |

**Update logic** (in `_updateAI(dt, playerX, playerY)`):

```javascript
// Cosmetic Y-bob (visual only — physics body stays at originY)
const bobY = this.originY + Math.sin(this.scene.time.now / 1000 * Math.PI * 2 / 1.5) * 6;
this.sprite.y = bobY;

switch (this.state) {
    case 'hover':
        // Subtle idle drift
        this.body.setVelocityX(Math.sin(this.scene.time.now / 1000) * 10);
        // Check player proximity
        if (Math.abs(playerX - this.x) < 100) {
            this.state = 'drift';
        }
        break;

    case 'drift':
        // Move toward player X at drift speed
        const dir = playerX > this.x ? 1 : -1;
        this.body.setVelocityX(dir * this.driftSpeed);
        // Check exit
        if (Math.abs(playerX - this.x) > 150) {
            this.state = 'return';
        }
        break;

    case 'return':
        // Move back to origin X
        const dx = this.originX - this.x;
        this.body.setVelocityX(Math.sign(dx) * this.driftSpeed);
        if (Math.abs(dx) < 10) {
            this.body.setVelocityX(0);
            this.state = 'hover';
        }
        // Can re-detect player during return
        if (Math.abs(playerX - this.x) < 100) {
            this.state = 'drift';
        }
        break;
}
```

**Edge cases**:

| Situation | Behavior |
|-----------|----------|
| Player jumps to hit shard | The shard floats at fixed Y. Player needs to reach its height. Shards placed at reachable heights (Y=250–400, player jump reaches ~Y=180 from ground at Y=568). | 
| Shard hit by knockback | On hit, apply knockback (80px away from player, 0 Y). The shard can drift off-screen. If it exceeds originX ±300px, force-return to origin to prevent permanent loss. | 
| Shard hit twice quickly | HP = 4. Slash 1 (13) kills in 1 hit. Slash 2 (22) kills in 1 hit. Air attack (18) kills in 1 hit. Effectively a 1-hit enemy — the HP of 4 is just buffer against weak hypothetical attacks. | 
| Air attack on shard | Downward thrust hits for 18 damage. Kills in 1 hit. Satisfying since it requires positioning below the shard. | 

### 2.4 Enemy-Player Interaction Matrix

```
                  SHADOW       SHARD        BOSS
                FRAGMENT     
Slash 1 (13)    Dead (0)     Dead (0)     287 rem.
Slash 2 (22)    Dead (0)     Dead (0)     278 rem.
Air thrust (18) Dead (0)     Dead (0)     282 rem.
Full combo (35) Dead (0)     Dead (0)     265 rem.
Contact Dmg     5            8            5 / 12 / 15 / 20
Kill Feelings   +2           +5           +20
```

---

## 3. Enemy Class Architecture

### 3.1 Base Class: `Enemy`

A shared base class providing common functionality to all enemy types:

```javascript
// src/enemies/Enemy.js
class Enemy {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.state = 'idle';
        this.dead = false;
        this.invulnTimer = 0;

        // Stats from config
        this.hp = config.hp || 1;
        this.maxHp = config.hp || 1;
        this.contactDamage = config.contactDamage || 5;
        this.feelingsDrop = config.feelingsDrop || 0;

        // Sprite setup
        this.sprite = scene.physics.add.sprite(x, y, config.textureKey);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDepth(5);
        if (config.bodyWidth && config.bodyHeight) {
            this.sprite.body.setSize(config.bodyWidth, config.bodyHeight);
            if (config.bodyOffsetX) this.sprite.body.setOffset(config.bodyOffsetX, 0);
            if (config.bodyOffsetY) this.sprite.body.setOffset(this.sprite.body.offset.x, config.bodyOffsetY);
        }
        if (config.noGravity) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    get body() { return this.sprite.body; }

    update(delta, playerX, playerY) {
        if (this.dead) return;
        if (this.invulnTimer > 0) this.invulnTimer--;
        this._updateAI(delta, playerX, playerY);
    }

    /** Override in subclass — implement state machine logic */
    _updateAI(delta, playerX, playerY) {
        // no-op in base
    }

    takeDamage(amount, knockbackX, knockbackY) {
        if (this.invulnTimer > 0 || this.dead) return;
        this.hp -= amount;
        this.invulnTimer = 30; // 0.5s i-frames

        // Hit flash
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite && this.sprite.active && !this.dead) this.sprite.clearTint();
        });

        // Knockback
        this.body.velocity.x += knockbackX;
        this.body.velocity.y += knockbackY;

        // Death check
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.dead = true;
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.body.setEnable(false); // disable physics collision

        // Death particles
        this._spawnDeathParticles();

        // Fade out and destroy sprite
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => this.sprite.destroy(),
        });
    }

    _spawnDeathParticles() {
        for (let i = 0; i < 5; i++) {
            const p = this.scene.add.circle(
                this.x, this.y,
                Phaser.Math.Between(2, 4),
                0xa8d8ff, 0.8
            ).setDepth(50);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-25, 25),
                y: p.y + Phaser.Math.Between(-25, 25),
                alpha: 0,
                scale: 0.2,
                duration: 400,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }
}
```

### 3.2 Subclass: `ShadowFragment`

```javascript
// src/enemies/ShadowFragment.js
class ShadowFragment extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shadow',
            hp: 3,
            contactDamage: 5,
            feelingsDrop: 2,
            bodyWidth: 20,
            bodyHeight: 20,
            noGravity: false,
        });

        this.patrolSpeed = 40;
        this.chaseSpeed = 65;
        this.patrolDir = Math.random() < 0.5 ? 1 : -1; // random start direction
        this.state = 'patrol';
    }

    _updateAI(dt, playerX, playerY) {
        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'patrol':
                this.body.setVelocityX(this.patrolDir * this.patrolSpeed);

                // Edge/wall detection
                if (this.body.blocked.left) this.patrolDir = 1;
                if (this.body.blocked.right) this.patrolDir = -1;

                // Detect player
                if (absDist < 150) {
                    this.state = 'chase';
                }
                break;

            case 'chase':
                this.body.setVelocityX(Math.sign(dist) * this.chaseSpeed);

                // Exit conditions
                if (absDist > 200 || this.body.blocked.left || this.body.blocked.right) {
                    this.state = 'patrol';
                    if (this.body.blocked.left) this.patrolDir = 1;
                    if (this.body.blocked.right) this.patrolDir = -1;
                }
                break;
        }

        // Face movement direction
        this.sprite.setFlipX(this.body.velocity.x > 0);
    }
}
```

### 3.3 Subclass: `FloatingShard`

```javascript
// src/enemies/FloatingShard.js
class FloatingShard extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            textureKey: 'enemy_shard',
            hp: 4,
            contactDamage: 8,
            feelingsDrop: 5,
            bodyWidth: 14,
            bodyHeight: 14,
            noGravity: true,
        });

        this.originX = x;
        this.originY = y;
        this.driftSpeed = 35;
        this.state = 'hover';
    }

    _updateAI(dt, playerX, playerY) {
        // Cosmetic Y-bob (visual sprite only)
        const bobY = this.originY + Math.sin(this.scene.time.now / 1000 * Math.PI * 2 / 1.5) * 6;
        this.sprite.y = bobY;

        const dist = playerX - this.x;
        const absDist = Math.abs(dist);

        switch (this.state) {
            case 'hover':
                // Subtle idle drift
                this.body.setVelocityX(Math.sin(this.scene.time.now / 1000) * 10);

                // Detect player
                if (absDist < 100) {
                    this.state = 'drift';
                }
                break;

            case 'drift':
                // Move toward player X
                this.body.setVelocityX(Math.sign(dist) * this.driftSpeed);

                // Player lost
                if (absDist > 150) {
                    this.state = 'return';
                }
                break;

            case 'return':
                // Move back to origin
                const dx = this.originX - this.x;
                this.body.setVelocityX(Math.sign(dx) * this.driftSpeed);
                if (Math.abs(dx) < 10) {
                    this.body.setVelocityX(0);
                    this.state = 'hover';
                }
                // Re-detect during return
                if (absDist < 100) {
                    this.state = 'drift';
                }
                break;
        }
    }
}
```

### 3.4 GameScene Integration

**Changes to `GameScene.js`**:

```javascript
// New properties in create():
this.enemyInstances = [];       // Array of all Enemy subclass instances
this.enemyGroup = this.physics.add.group(); // Physics group for colliders

// After creating platforms and player (line 85):
this._createEnemies();

// ===== New methods =====

_createEnemies() {
    const shadowPositions = [
        { x: 300, y: 530 }, { x: 500, y: 530 },
        { x: 750, y: 530 }, { x: 1000, y: 530 },
        { x: 1250, y: 530 }, { x: 1500, y: 485 },
        { x: 1800, y: 485 },
    ];
    shadowPositions.forEach(pos => {
        const e = new ShadowFragment(this, pos.x, pos.y);
        this.enemyGroup.add(e.sprite);
        this.enemyInstances.push(e);
    });

    const shardPositions = [
        { x: 600, y: 300 }, { x: 1100, y: 250 },
        { x: 1400, y: 280 }, { x: 1750, y: 200 },
    ];
    shardPositions.forEach(pos => {
        const e = new FloatingShard(this, pos.x, pos.y);
        this.enemyGroup.add(e.sprite);
        this.enemyInstances.push(e);
    });

    this._createEnemyColliders();
}

_createEnemyColliders() {
    // Enemies collide with platforms
    this.physics.add.collider(this.enemyGroup, this.platforms);

    // Player slash hitbox overlaps enemies
    this.physics.add.overlap(
        this.player.slashHitbox,
        this.enemyGroup,
        (hitbox, enemySprite) => this._onPlayerHitEnemy(enemySprite),
    );

    // Player body overlaps enemies (contact damage)
    this.physics.add.overlap(
        this.player.sprite,
        this.enemyGroup,
        (_, enemySprite) => this._onEnemyTouchPlayer(enemySprite),
    );
}

_onPlayerHitEnemy(enemySprite) {
    const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
    if (!enemy || enemy.dead || enemy.invulnTimer > 0) return;

    let dmg, kbx, kby, shake, hitStop;
    switch (this.player.state) {
        case 'attack1_active':
            dmg = 13; kbx = 130; kby = -45; shake = 3; hitStop = 67;
            break;
        case 'attack2_active':
            dmg = 22; kbx = 200; kby = -70; shake = 5; hitStop = 100;
            break;
        case 'air_attack_active':
            dmg = 18; kbx = 90; kby = -90; shake = 3; hitStop = 67;
            break;
        default:
            return;
    }

    const dir = this.player.facingRight ? 1 : -1;
    enemy.takeDamage(dmg, kbx * dir, kby);

    // Player gains Feelings and combo
    this.player.onHitEnemy();

    // Impact effects (reduced vs boss)
    this.cameras.main.shake(hitStop * 0.6 / 1000, shake / 100);
    this._spawnHitParticles(enemy.x, enemy.y - 10);

    // Kill bonus Feelings
    if (enemy.dead && enemy.feelingsDrop > 0) {
        this.player.feelings = Math.min(100, this.player.feelings + enemy.feelingsDrop);
    }
}

_onEnemyTouchPlayer(enemySprite) {
    const enemy = this.enemyInstances.find(e => e.sprite === enemySprite);
    if (!enemy || enemy.dead) return;
    this.player.takeDamage(enemy.contactDamage, 60, -30);
}

_spawnHitParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        const p = this.add.circle(x, y, 3, 0xffffff).setDepth(50).setAlpha(1);
        this.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-20, 20),
            y: y + Phaser.Math.Between(-20, 20),
            alpha: 0, scale: 0.2, duration: 250, ease: 'Power2',
            onComplete: () => p.destroy(),
        });
    }
}
```

**Update loop addition** (in `GameScene.update()`, after `this.player.update(delta)`):

```javascript
// Update enemies — filter out dead ones
this.enemyInstances = this.enemyInstances.filter(e => !e.dead);
this.enemyInstances.forEach(e => {
    if (!e.dead) {
        e.update(delta, this.player.x, this.player.y);
    }
});
```

### 3.5 Enemy Texture Generation (BootScene)

Add to `BootScene.create()` after the existing ground/bg texture generation:

```javascript
// Shadow Fragment: dark blob with teal eyes
const sg = this.make.graphics({ add: false });
sg.fillStyle(0x1a1a3e, 0.85);
sg.fillCircle(12, 10, 10);
sg.fillStyle(0x40d0c0, 0.9);
sg.fillCircle(8, 8, 2);  // left eye
sg.fillCircle(16, 8, 2); // right eye
sg.generateTexture('enemy_shadow', 24, 24);
sg.destroy();

// Floating Shard: purple crystal triangle
const sh = this.make.graphics({ add: false });
sh.fillStyle(0x7b52c0, 0.9);
sh.fillTriangle(8, 0, 0, 16, 16, 16);
sh.fillStyle(0x9966ff, 0.6);
sh.fillTriangle(8, 4, 3, 14, 13, 14);
sh.generateTexture('enemy_shard', 16, 16);
sh.destroy();
```

### 3.6 Player.js Changes

| Change | Details |
|--------|---------|
| Rename `onHitBoss()` → `onHitEnemy()` | Lines 417–422. Same internal logic. |
| Update `_getStateDuration()` | All frame values per §1.3. |
| Update movement constants | SPEED 200→180, JUMP_VEL −420→−400, DRAG 800→700. |
| Update `_updateHitbox()` | Hitbox sizes per §1.5. |
| Update `_updateAirHitbox()` | Air hitbox sizes per §1.5. |
| Update combo window | `_handleAttack1State()` line 235 timings. |

### 3.7 BossScene.js Changes

| Change | Details |
|--------|---------|
| Damage values | 10→13, 18→22, 15→18. Knockback/hitstop per §1.6. |
| Method call | `this.player.onHitBoss()` → `this.player.onHitEnemy()`. |

---

## 4. Integration with Existing Systems

### 4.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     GameScene                            │
│                                                          │
│  create():                                               │
│    platforms ─── physics.collider ───┐                   │
│                                      ├── enemyGroup      │
│    player.sprite ── physics.collider ┤                   │
│                                      └── platforms       │
│    player.sprite ── physics.overlap ─── enemyGroup       │
│                      (contact damage)                    │
│    player.slashHitbox ── physics.overlap ─── enemyGroup  │
│                      (attack hit)                        │
│                                                          │
│  update():                                               │
│    player.update(delta)                                  │
│    enemies.forEach(e => e.update(delta, playerX, playerY))│
│    hud.drawPips(player.hp)                               │
│    hud.drawFeelings(player.feelings)                     │
│                                                          │
│  On enemy kill: player gains Feelings (kill bonus)       │
│  On boss trigger → BossScene (overlay, existing flow)    │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Files Modified

| File | Changes |
|------|---------|
| `src/scenes/BootScene.js` | Generate enemy textures. Load mfy sprites instead of 25miku. |
| `src/entities/Player.js` | Movement stats, frame durations, hitbox dimensions, combo window, rename `onHitBoss()` → `onHitEnemy()`. |
| `src/scenes/BossScene.js` | Update damage values, rename method call. |
| `src/scenes/GameScene.js` | Add enemy creation, enemy update loop, collision/overlap handlers, hit particles. |
| `src/scenes/MenuScene.js` | Optional subtitle update. |

### 4.3 New Files Created

| File | Purpose |
|------|---------|
| `src/enemies/Enemy.js` | Base class with shared functionality (~90 lines) |
| `src/enemies/ShadowFragment.js` | Shadow Fragment subclass (~45 lines) |
| `src/enemies/FloatingShard.js` | Floating Shard subclass (~50 lines) |

### 4.4 HUD Changes

No HUD changes required. Existing HP pips + Feelings meter work for all combat. No enemy health bars in the overworld.

---

## 5. Implementation Priority

### 5.1 Priority Table

| Priority | Task | Depends On | Effort | Notes |
|:--------:|------|-----------|:------:|-------|
| **P0** | Copy mfy sprites to `assets/images/` and update BootScene loading | — | 15 min | Load mfy1.png as `player_idle`, mfy_att1.png as `player_att1`, mfy_att2.png as `player_att2` |
| **P0** | Update Player.js frame durations (Mafuyu slower stats) | — | 10 min | 7 lines in `_getStateDuration()` |
| **P0** | Update Player.js hitbox dimensions | — | 10 min | `_updateHitbox()` and `_updateAirHitbox()` |
| **P0** | Update Player.js movement constants | — | 5 min | SPEED, JUMP_VEL, DRAG in `update()` |
| **P0** | Rename `onHitBoss()` → `onHitEnemy()` | — | 10 min | Player.js + BossScene.js callers |
| **P0** | Update BossScene damage/knockback values | — | 10 min | Match new Mafuyu frame data |
| **P1** | Create `src/enemies/Enemy.js` base class | — | 30 min | Shared constructor, takeDamage, die, particles |
| **P1** | Create `src/enemies/ShadowFragment.js` | Enemy.js | 20 min | Patrol + chase AI |
| **P1** | Create `src/enemies/FloatingShard.js` | Enemy.js | 25 min | Hover + drift + return AI |
| **P1** | Generate enemy textures in BootScene | — | 10 min | Programmatic textures |
| **P1** | Add enemy integration to GameScene | P1 enemies | 45 min | Group, colliders, hit handlers, update loop |
| **P2** | Death particles + hit flash for enemies | P1 enemies | 15 min | Already in base class, may need tuning |
| **P2** | Feelings kill bonuses on enemy death | P1 enemies | 10 min | +2 Shadow, +5 Shard in GameScene handler |
| **P2** | Menu subtitle update | — | 5 min | "Facing Yourself" |
| **P3** | Spawn animation (fade in from shadow) | P1 enemies | 15 min | Polish |

### 5.2 Sprint Plan

**Sprint 1 (P0 — core Mafuyu switch)**:
1. Copy mfy sprites → assets/images/, update BootScene references
2. Update Player.js: movement stats, frame durations, hitbox dimensions
3. Rename `onHitBoss()` → `onHitEnemy()` everywhere
4. Update BossScene damage values
5. **Result**: Mafuyu is playable with correct heavy feel

**Sprint 2 (P1 — enemies)**:
1. Create `src/enemies/Enemy.js` base class
2. Create `src/enemies/ShadowFragment.js`
3. Create `src/enemies/FloatingShard.js`
4. Generate enemy textures in BootScene
5. Integrate enemies into GameScene (group, collisions, hit handlers, update loop)
6. **Result**: Overworld has 2 killable enemy types, combat loop complete

**Sprint 3 (P2 — polish)**:
1. Tune death particles and hit flash colors
2. Verify Feelings kill bonuses work correctly
3. Update MenuScene subtitle
4. Playtest and balance tuning (enemy positions, spawn counts, etc.)

---

*End of Enemy & Combat Design Document.*
