# Hit Feedback Enhancement & Camera Polish

> **Status**: Draft for Review  
> **Author**: game-designer  
> **Target**: Phaser 3.87 / Arcade Physics  
> **Theme**: 25-ji dark pixel-metroidvania  
> **Last Updated**: 2026-06-26

---

## Table of Contents

1. [Part 1: Hit Feedback Upgrade](#part-1-hit-feedback-upgrade)
   - [1.1 Design Goals](#11-design-goals)
   - [1.2 Current State Analysis](#12-current-state-analysis)
   - [1.3 HitStop: Proper Freeze-Frame Implementation](#13-hitstop-proper-freeze-frame-implementation)
   - [1.4 Per-Attack Hit Effect Matrix](#14-per-attack-hit-effect-matrix)
   - [1.5 Hit Particles: Directional Burst](#15-hit-particles-directional-burst)
   - [1.6 Screen Effects Matrix](#16-screen-effects-matrix)
   - [1.7 Enemy Hit Reactions](#17-enemy-hit-reactions)
   - [1.8 Boss Hit Reactions](#18-boss-hit-reactions)
   - [1.9 Audio Integration Notes](#19-audio-integration-notes)
   - [1.10 Edge Cases](#110-edge-cases)
2. [Part 2: Camera Polish](#part-2-camera-polish)
   - [2.1 Camera Profiles](#21-camera-profiles)
   - [2.2 Default Room Camera (1280×720)](#22-default-room-camera-1280x720)
   - [2.3 Vertical Shaft Camera (720×960)](#23-vertical-shaft-camera-720x960)
   - [2.4 Boss Room Camera](#24-boss-room-camera)
   - [2.5 Room Transitions](#25-room-transitions)
   - [2.6 Landing Catch-Up Bounce](#26-landing-catch-up-bounce)
   - [2.7 Hit-Triggered Camera Effects](#27-hit-triggered-camera-effects)
   - [2.8 Tuning Knobs](#28-tuning-knobs)

---

# Part 1: Hit Feedback Upgrade

## 1.1 Design Goals

Player Fantasy — making **every landed hit feel impactful**. Each attack type should have a distinct sensory signature. The player should feel the **weight** of the blade connecting, the **rhythm** of the combo, and the **power** of each upgrade. This directly serves the Aesthetics of **Sensation** (visceral hit feel) and **Challenge** (reading whether a hit landed through feedback alone).

**HK Reference Points:**
- Short, punchy hitStop (40-60ms) with a clear audio "thwack"
- Directional particle burst matching the swing arc
- Enemy recoil that visually communicates hitstun
- Camera snap + subtle screen flash on big hits
- Different feel for nail vs spell vs descending dark (our equivalent: no-sword vs sword vs finisher)

**Self-Determination Theory Mapping:**
- **Competence**: Clear feedback tells the player exactly when a hit connects, enabling precise timing for combos
- **Autonomy**: Distinct feedback per attack type lets the player feel ownership over their combat style

## 1.2 Current State Analysis

| Flaw | Current Behavior | Target |
|------|-----------------|--------|
| **No real hitStop** | `hitStop` variable computed (67/100ms) but only used for shake duration. No freeze-frame. | Actual freeze of all game logic for 40-100ms |
| **Generic particles** | 5 white circles burst in uniform random directions. Same for all attacks. | Directional arc particles matching attack type |
| **No screen flash** | No flash on normal hits. Flash on boss phase transition only. | Subtle white flash on finisher/critical hits |
| **Enemies lack knockback arc** | `body.velocity.x += kbx` / `body.velocity.y += kby` applied directly. No tweened arc. | Brief tweened knockback that visually communicates hitstun |
| **No hit separation per attack** | All hits share particle size/color/count. | Different particle profile per attack type |
| **Boss hit feels same as normal** | Same shake, same particle logic (just scaled slightly). | Boss hits emphasize different feedback: heavier sound, distinct flash |

## 1.3 HitStop: Proper Freeze-Frame Implementation

**The current `hitStop` variable is computed but never used to freeze the scene.** This is the single biggest missing piece.

### Implementation Approach

Use `scene.time.timeScale` to pause the entire scene clock for the freeze duration, then resume. This is the simplest approach that freezes all tweens, physics, and animations simultaneously.

However, note that `timeScale` in Phaser 3 has quirks. The more reliable approach for short freezes:

```javascript
// In GameScene._onPlayerHitEnemy() or a shared _doHitStop(duration):
_doHitStop(duration) {
    // Pause physics
    this.physics.world.isPaused = true;
    
    // Pause scene time (stops tweens, timers, animations)
    this.time.paused = true;
    
    // Schedule resume
    this.time.delayedCall(duration, () => {
        this.physics.world.isPaused = false;
        this.time.paused = false;
    });
    
    // Note: input remains responsive so player can buffer next attack
}
```

Wait — `time.delayedCall` won't fire if `this.time.paused = true`. Use a manual `scene`-level timer instead:

```javascript
// More robust: track hitStop frames in update loop
// In GameScene:
this._hitStopFrames = 0;

// In update():
if (this._hitStopFrames > 0) {
    this._hitStopFrames--;
    // Skip all game logic this frame
    return;
}

// In _onPlayerHitEnemy:
_dohitStop(frames) {
    this._hitStopFrames = frames;
}
```

### HitStop Duration Table

| Hit Type | Duration (60fps frames) | Duration (ms) | Notes |
|----------|------------------------|---------------|-------|
| Attack1 (no sword) | 3f | 50ms | Light tap, quick recovery |
| Attack1 (with sword) | 4f | 67ms | Noticeable pause |
| Attack2 (any) | 5f | 83ms | Heavier impact |
| Attack3 / Finisher (sword) | 6f | 100ms | Biggest freeze, combo payoff |
| Air attack (landing) | 4f | 67ms | Slam impact |
| Air attack (miss, no landing) | 3f | 50ms | Brief pause |
| Boss hit (any) | +2f over normal | — | Boss hits feel heavier |
| Boss finisher / kill blow | 10f | 167ms | Dramatic slow-motion |

During hitStop, **visual effects continue**: particles still animate (they're in their own tweens), camera shake still plays (it's driven by the camera system, not time). Only physics, animation timers, and AI logic freeze.

## 1.4 Per-Attack Hit Effect Matrix

Every attack gets a distinct **effect profile** in this matrix:

| Attack | HitStop (f) | Shake (px) | Shake (ms) | Flash | Particles | Color | Sound |
|--------|------------|-----------|-----------|-------|-----------|-------|-------|
| **Attack1 (no sword)** | 3 | 2 | 50 | None | 3 small arc | #ffffff | `sfx_punch` |
| **Attack1 (sword)** | 4 | 3 | 67 | Subtle white (50ms) | 5 arc burst | #a8d8ff → #ffffff | `sfx_sword_att1` |
| **Attack2** | 5 | 5 | 83 | White flash (80ms) | 7 wide arc | #ffffff → #a8d8ff | `sfx_sword_att2` |
| **Attack3 (finisher)** | 6 | 6 | 100 | Bright white (100ms) + blue vignette | 9 burst + 2 large shards | #ffffff → #2d3561 | `sfx_combo_hit` |
| **Air hit (no sword)** | 3 | 2 | 50 | None | 3 downward streak | #ffffff | `sfx_sword_air` |
| **Air hit (sword)** | 4 | 4 | 67 | Subtle white (50ms) | 5 downward spray | #a8d8ff → #ffffff | `sfx_sword_air` |
| **Air slam (landed)** | 4 | 5 | 83 | White flash (80ms) | 8 ground impact radial | #ffffff → #a8d8ff | `sfx_punch` (louder) |
| **Boss hit (normal)** | +2 base | 6 | base+33% | Blue-white (100ms) | 8 burst | #2d3561 → #ffffff | `sfx_boss_hit` |
| **Boss phase transition** | 12 | 8 | 200 | Full white (300ms) | 20 large burst | #ffffff | `sfx_boss_roar` |
| **Boss kill blow** | 10 | 8 | 167 | Full white (200ms) → slow fade | 15 burst + slow-mo particles | #ffffff → #a8d8ff | `sfx_boss_death` |

### Implementation Note

The **flash** column refers to `cameras.main.flash(duration, r, g, b)`:

```javascript
// Subtle white flash: quick, low opacity
cameras.main.flash(50, 255, 255, 255); // 50ms, white

// Finisher flash: longer, dramatic
cameras.main.flash(100, 255, 255, 255); // 100ms, bright white
```

For the **blue vignette** on Attack3 (the sword finisher), create a full-screen rectangle with a soft blue gradient that fades in and out:

```javascript
// Conceptual: overlay rectangle that fades in during hitStop, fades out after
const vignette = this.add.rectangle(640, 360, 1280, 720, 0x2d3561, 0)
    .setScrollFactor(0).setDepth(150);
this.tweens.add({
    targets: vignette,
    alpha: 0.3,
    duration: 80,
    yoyo: true,
    hold: 60,
    onComplete: () => vignette.destroy(),
});
```

## 1.5 Hit Particles: Directional Burst

Current: 5 circles in random directions (uniform).  
Target: **Directional burst that matches the swing arc**.

### Particle Direction by Attack

| Attack | Burst Shape | Particle Count | Size Range | Lifetime | Color Gradient |
|--------|-----------|---------------|-----------|----------|---------------|
| Attack1 (no sword) | Small cone forward (+/- 30° from facing dir) | 3 | 2-3px | 200ms | #ffffff → fade |
| Attack1 (sword) | Wide arc forward (+/- 60°) | 5 | 2-4px | 250ms | #a8d8ff → #ffffff → fade |
| Attack2 | Very wide arc (+/- 80°) + upward | 7 | 3-5px | 300ms | #ffffff → #a8d8ff → fade |
| Attack3 (finisher) | Full arc + star burst (360°) | 9 + 2 large (5px) | 3-5px + 5px | 350ms | #ffffff → #2d3561 → fade |
| Air hit (no sword) | Downward cone | 3 | 2-3px | 200ms | #ffffff → fade |
| Air hit (sword) | Downward spray + diagonal kick-up | 5 | 2-4px | 250ms | #a8d8ff → fade |
| Air slam (landed) | 360° ground-level radial | 8 (ground ring) | 3-4px | 300ms | #ffffff → fade |
| Boss hit | Dense burst toward facing direction + 360° sparkle | 8 | 3-5px | 350ms | #2d3561 → #ffffff → fade |

### Particle Implementation (upgraded from current)

```javascript
_spawnDirectionalHitParticles(x, y, config) {
    // config: { count, spread, sizeMin, sizeMax, lifetime, color, facingRight }
    const dir = config.facingRight ? 1 : -1;
    for (let i = 0; i < config.count; i++) {
        const size = Phaser.Math.Between(config.sizeMin, config.sizeMax);
        const angle = Phaser.Math.FloatBetween(-config.spread, config.spread);
        const rad = angle * Math.PI / 180;
        const speed = Phaser.Math.Between(30, 80);
        const vx = Math.cos(rad) * speed * dir;
        const vy = Math.sin(rad) * speed - Phaser.Math.Between(10, 30); // slight upward bias
        
        const p = this.add.circle(x, y, size, config.color, 1)
            .setDepth(50).setAlpha(1);
        
        this.tweens.add({
            targets: p,
            x: p.x + vx,
            y: p.y + vy,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: config.lifetime,
            ease: 'Power2',
            onComplete: () => p.destroy(),
        });
    }
}
```

Call from `_onPlayerHitEnemy`:
```javascript
const particlesConfig = {
    count: 5,
    spread: 60,  // degrees
    sizeMin: 2,
    sizeMax: 4,
    lifetime: 250,
    color: sword ? 0xa8d8ff : 0xffffff,
    facingRight: this.player.facingRight,
};
this._spawnDirectionalHitParticles(enemy.x, enemy.y - 10, particlesConfig);
```

### Death Particles Enhancement

Current: 5 white-blue circles.  
Target: More dramatic burst with enemy type variation:

| Enemy Type | Particle Count | Color | Behavior |
|-----------|---------------|-------|----------|
| ShadowFragment | 8 dark wisps | #2d3561 → #0a0a1a | Fade + shrink, upward drift |
| FloatingShard | 10 white shards | #a8d8ff | Spin outward, sharp edges |
| Bat | 6 dark puffs | #1a1a2e → fade | Slow expand + dissipate |
| Skeleton | 12 bone chips | #c8c8d0 → #666680 | Bounce off ground + settle |
| Boss Mafuyu | 20 large shards | #ffffff → #2d3561 → fade | Slow-motion burst, screen flash |

## 1.6 Screen Effects Matrix

### Camera Shake

| Trigger | Intensity (px) | Duration (ms) | Notes |
|---------|---------------|---------------|-------|
| Attack1 hit (normal enemy) | 2 | 50 | Subtle |
| Attack1 hit (boss) | 4 | 80 | Heavier |
| Attack2 hit (normal enemy) | 4 | 80 | Noticeable |
| Attack2 hit (boss) | 6 | 120 | Significant |
| Attack3 finisher (normal enemy) | 5 | 100 | Big |
| Attack3 finisher (boss) | 7 | 150 | Major shake |
| Air attack hit (any) | 3 | 67 | Medium |
| Air slam landing (ground impact) | 5 | 100 | Ground pound feel |
| Player takes damage | 3 | 80 | Directional bias |
| Boss phase transition | 6 | 300 | Slow, deep rumble |

### Screen Flash

```javascript
// Attack3 / finisher — brief white flash
cameras.main.flash(80, 255, 255, 255);

// Boss hit — blue-tinted flash
cameras.main.flash(80, 180, 200, 255);

// Special: combo finisher on boss — flash + brief slow-motion vignette
cameras.main.flash(120, 255, 255, 255);
this.cameras.main.setZoom(1.02); // micro-pull-in
this.time.delayedCall(100, () => this.cameras.main.setZoom(1));
```

### Screen Tint (Vignette)

Brief, very subtle **blue vignette** on Sword finisher (Attack3) and **red vignette** when player HP < 25:

```javascript
// Sword finisher blue vignette
const vignette = this.add.graphics().setScrollFactor(0).setDepth(150);
vignette.fillStyle(0x2d3561, 0.25);
vignette.fillRect(0, 0, 1280, 720);
this.tweens.add({
    targets: vignette,
    alpha: 0,
    duration: 150,
    ease: 'Power2',
    onComplete: () => vignette.destroy(),
});
```

## 1.7 Enemy Hit Reactions

### Current State
- `body.velocity.x += knockbackX` and `body.velocity.y += knockbackY` applied immediately
- White tint for 100ms
- Invulnerability for 30 frames (0.5s)

### Upgraded: Knockback Arc + Hitstun

Replace the direct velocity modification with a **tweened knockback arc** that visually communicates hitstun:

```javascript
// In Enemy.takeDamage():
takeDamage(amount, knockbackX, knockbackY, hitstunFrames) {
    if (this.invulnTimer > 0 || this.dead) return;
    this.hp -= amount;
    this.invulnTimer = 30;
    
    // Audio
    this.scene.sound.play('sfx_enemy_hurt', { 
        volume: 0.65, 
        detune: Phaser.Math.Between(-100, 100) 
    });
    
    // Hit flash — brighter, faster (3 rapid flashes for 150ms)
    this._hitFlash(150);
    
    // Knockback arc — tweened for smooth trajectory
    this._knockbackArc(knockbackX, knockbackY);
    
    // Hitstun — pause AI during knockback
    this.state = 'hitstun';
    this._hitstunTimer = hitstunFrames;
    
    if (this.hp <= 0) this.die();
}

_hitFlash(duration) {
    // 3 rapid white flashes
    let flashCount = 0;
    const flashInterval = this.scene.time.addEvent({
        delay: duration / 6,
        repeat: 5,
        callback: () => {
            flashCount++;
            if (this.sprite && this.sprite.active) {
                this.sprite.setTint(flashCount % 2 === 0 ? 0xffffff : 0x88ccff);
            }
        }
    });
    this.scene.time.delayedCall(duration, () => {
        if (this.sprite && this.sprite.active && !this.dead) {
            this.sprite.clearTint();
        }
    });
}

_knockbackArc(kbx, kby) {
    // Use a tween for smooth knockback arc
    const startX = this.sprite.x;
    const startY = this.sprite.y;
    const endX = startX + kbx;
    const endY = startY + kby;
    
    this.scene.tweens.add({
        targets: this.sprite,
        x: endX,
        y: endY,
        duration: 200,  // 200ms knockback
        ease: 'Power2',  // Eases out — natural "pushed" feel
        onComplete: () => {
            // Brief recovery pause at end of knockback
            // (enemy resumes AI after hitstun ends)
        }
    });
}
```

### Hitstun Durations

| Attack | Hitstun (frames) | Hitstun (ms) | Visual |
|--------|-----------------|---------------|--------|
| Attack1 | 12f | 200ms | Slight recoil, enemy pushed back |
| Attack2 | 18f | 300ms | Stagger, larger pushback |
| Attack3 (finisher) | 24f | 400ms | Heavy stagger, almost knockdown |
| Air attack | 15f | 250ms | Enemy slammed down + bounce |
| Boss hitstun | 8f | 133ms | Brief pause, boss not fully stunned |

**Important**: Hitstun and knockback are **independent of hitStop**. During hitStop, the enemy's hitstun timer still counts down (hitStop freezes game logic, but the visual tween continues). For simplicity, we can let the knockback tween run during hitStop (it looks good — the enemy is visibly pushed back while the world briefly freezes).

### Per-Enemy Knockback Values

| Enemy | Knockback X (Attack1) | Knockback X (Attack2) | Knockback Y | Notes |
|-------|---------------------|---------------------|-------------|-------|
| ShadowFragment | 100 | 180 | -60 | Light, bouncy |
| FloatingShard | 120 | 200 | -40 | Drifts on knockback |
| Bat | 150 | 250 | -80 | Gets knocked far |
| Skeleton | 80 | 140 | -50 | Heavy, less knockback |

## 1.8 Boss Hit Reactions

The boss should feel **heavier** than normal enemies. Her hit reactions should communicate that she's a significant opponent.

### Current State
- `invulnTimer = 8` (short i-frames)
- White tint for 80ms
- Velocity-based knockback (not tweened)
- Metal clang sound

### Upgraded: Weighted Reactions

```javascript
// In BossMafuyu.takeDamage():
takeDamage(amount, knockbackX, knockbackY) {
    if (!this.vulnerable || this.invulnTimer > 0 || this.defeated) return;
    this.hp -= amount;
    this.invulnTimer = 8;  // Keep short — boss should be quickly re-engageable
    
    // Visual: brief flash with boss-specific color (blue-white, not full white)
    this.sprite.setTint(0xaaccff);
    this.scene.time.delayedCall(60, () => {
        if (this.sprite && this.sprite.active && !this.defeated) this.sprite.clearTint();
    });
    
    // Knockback: scaled down — boss barely flinches
    // Use a micro-tween for a "weighted stagger" feel
    const staggerX = this.facingRight ? -8 : 8;  // Micro stagger, not full knockback
    this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x + staggerX,
        duration: 100,
        ease: 'Quad.easeOut',
        yoyo: true,
    });
    
    // No velocity knockback — boss stands her ground
    // (Except for specific attacks: Attack3 finisher → slight knockback)
    
    // Phase 2: add a brief "impact ripple" shader effect (sprite scale pulse)
    this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.sprite.scaleX * 1.03,
        scaleY: this.sprite.scaleY * 0.97,  // Brief squash
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeOut',
    });
    
    // Audio
    this.scene.sound.play('sfx_boss_hit', { 
        volume: 0.7, 
        detune: Phaser.Math.Between(-50, 50)  // Less detune variance = more consistent sound
    });
    
    if (this.hp <= this.maxHp / 2 && this.phase === 1) this._startPhaseTransition();
    if (this.hp <= 50 && this.phase === 2) this.desperate = true;
    if (this.hp <= 0) this._die();
}
```

### Boss Phase Transition Visual Enhancement

Current: Camera flash (300ms white) + fly up.  
Upgrade:

1. **HitStop**: 12f (200ms) freeze on the hit that triggers phase transition
2. **Screen flash**: Camera flash (300ms, white) with an additional **slow-motion** period (20f / 333ms of 0.5x time scale)
3. **Particle burst**: 20 large white-blue shards erupt from boss, expand slowly
4. **Boss stagger**: Boss sprite scales up briefly (1.05x for 200ms) as if releasing energy
5. **Tint shift**: Screen gets a blue overlay (0x2d3561, alpha 0.15) that fades in over 500ms, then fades out over 2s

### Boss Death Sequence

Current: `_die()` — stops movement, plays sound, fades.  
Upgrade:

1. **HitStop**: 10f (167ms) freeze on the killing blow
2. **Camera**: Slow zoom in (1.0 → 1.05 over 1s) + white flash
3. **Boss**: Hovers, looks at hands, 0.5s pause
4. **Particles**: Slow-motion burst — 20 large shards emerge from boss, drift upward slowly over 2s
5. **Dissolve**: Boss sprite fades to near-transparent over 1.5s, with blue-white particles trailing upward
6. **Memory fragment**: A collectible crystal remains where boss stood

```javascript
_die() {
    this.defeated = true;
    this.vulnerable = false;
    this.state = 'dead';
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    
    // Freeze in place, show cower sprite
    this.sprite.setTexture('boss_cower');
    
    // Camera effects
    this.scene.cameras.main.flash(200, 255, 255, 255);
    
    // Slow-motion death particles
    for (let i = 0; i < 20; i++) {
        const p = this.scene.add.circle(
            this.x + Phaser.Math.Between(-30, 30),
            this.y + Phaser.Math.Between(-40, 40),
            Phaser.Math.Between(3, 6),
            0xffffff, 0.8
        ).setDepth(50);
        this.scene.tweens.add({
            targets: p,
            x: p.x + Phaser.Math.Between(-80, 80),
            y: p.y - Phaser.Math.Between(30, 100),
            alpha: 0,
            scale: 0.1,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => p.destroy(),
        });
    }
    
    // Camera slowly zooms in
    this.scene.tweens.add({
        targets: this.scene.cameras.main,
        zoom: 1.04,
        duration: 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
    });
    
    // Fade out boss sprite
    this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        duration: 1500,
        delay: 500,
        ease: 'Power2',
    });
    
    this.scene.sound.play('sfx_boss_death', { volume: 0.7 });
}
```

## 1.9 Audio Integration Notes

| Hit Event | SFX Key | Volume | Pitch Variation | Priority |
|-----------|---------|--------|-----------------|----------|
| Attack1 hit (no sword) | `sfx_punch` | 0.5 | ±100 | Low |
| Attack1 hit (sword) | `sfx_sword_att1` | 0.55 | ±50 | Low |
| Attack2 hit | `sfx_sword_att2` | 0.6 | ±30 | Medium |
| Attack3 finisher | `sfx_combo_hit` | 0.5 | 0 | High |
| Air attack hit | `sfx_sword_air` | 0.5 | ±70 | Low |
| Enemy hurt | `sfx_enemy_hurt` | 0.65 | ±100 | Medium |
| Enemy death | `sfx_enemy_death` | 0.7 | ±100 | Medium |
| Boss hit | `sfx_boss_hit` | 0.7 | ±50 | High |
| Boss roar | `sfx_boss_roar` | 0.7 | 0 | Very High |
| Boss death | `sfx_boss_death` | 0.7 | 0 | Critical |
| Combo chime (≥2) | `sfx_combo_hit` | 0.5 | 0 | Medium |

The existing audio assets in `BootScene.js` already have all required SFX keys loaded. No new assets are needed — only the logic to trigger them at the right moments.

## 1.10 Edge Cases

| Edge Case | Resolution |
|-----------|-----------|
| **Multiple enemies hit simultaneously** | HitStop and camera shake fire ONCE (on first hit). All enemies receive individual knockback + hitflash. Use a `_hitStopActive` flag to prevent stacking. |
| **Enemy killed during hitStop** | Death animation starts when hitStop ends. The enemy is already at HP ≤ 0 — `die()` is called but the fade tween begins after hitStop. |
| **Boss hit during invulnerability** | No feedback at all (current behavior is correct). Optional: spawn a tiny grey "blocked" particle to indicate the hit connected but was negated. |
| **Player mid-air during hitStop** | Player's air position is frozen during hitStop. When it resumes, gravity re-engages naturally. No special handling needed — the player just stays in place for the freeze duration. |
| **HitStop during room transition** | HitStop is skipped if `_transitioning` is true. Check this flag before initiating hitStop. |
| **HitStop during pause** | If pause menu is open, don't apply hitStop (already frozen by pause). |
| **Extremely fast combos (attack > hitStop > attack)** | The hitStop frames should NOT count as time toward combo timer. Use `this.comboTimer -= delta` logic in `Player.update()` — this already runs outside hitStop (because we're skipping update entirely). When hitStop ends, the combo timer resumes from where it was. |

---

# Part 2: Camera Polish

## 2.1 Camera Profiles

Define three camera profiles, each a set of config values:

```javascript
const CameraProfiles = {
    default: {
        zoom: 1.0,
        deadzone: { x: 0, y: 0 },       // No follow for 1280×720 rooms
        lerpX: 0.1,
        lerpY: 0.1,
        offsetY: 0,
        bounds: null,                     // Set per room
    },
    verticalShaft: {
        zoom: 1.0,
        deadzone: { x: 100, y: 60 },    // HK-style deadzone
        lerpX: 0.08,
        lerpY: 0.06,                     // Slightly slower vertical follow (smooth)
        offsetY: -20,                    // Slight upward bias
        bounds: null,
    },
    bossArena: {
        zoom: 0.95,                      // Slightly zoomed out to see more
        deadzone: { x: 0, y: 0 },        // Follow player tightly in boss room
        lerpX: 0.15,
        lerpY: 0.15,
        offsetY: 0,
        bounds: null,
    },
};
```

## 2.2 Default Room Camera (1280×720)

**Current state**: `camera.stopFollow()`, `scrollX = 0`, `scrollY = 0`. The camera is static, showing the entire room.

**Issue**: The room is exactly 1280×720 — the same as the viewport. So no scrolling is needed. But we can still add subtle camera feel:

### Upgrade: Subtle Camera Breathing

Add a **micro-offset** based on player position within the room, creating a subtle "breathing" effect even in static rooms:

```javascript
// In update(), for rooms that match viewport:
const roomDef = this._roomDef(this.currentRoomId);
if (roomDef.width === this.scale.width && roomDef.height === this.scale.height) {
    // Micro offset: map player X position (0 to roomWidth) to camera scrollX (-8 to +8)
    const pxRatio = this.player.x / roomDef.width; // 0 to 1
    const targetScrollX = Phaser.Math.Linear(-12, 12, pxRatio);
    this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * 0.02;
    
    // Y offset: slight upward bias when player is airborne
    const airBias = this.player.isAirborneStable ? -8 : 0;
    const targetScrollY = airBias;
    this.cameras.main.scrollY += (targetScrollY - this.cameras.main.scrollY) * 0.02;
}
```

This gives a subtle "room breathes" effect without actual scrolling. The camera shifts ~12px toward where the player is looking, reinforcing spatial awareness.

**Default values for micro-offset:**
- Max horizontal offset: ±12px
- Upward air bias: -8px
- Lerp speed: 0.02 (very slow, almost imperceptible)

## 2.3 Vertical Shaft Camera (720×960)

**Current state**: `startFollow` with `lerp 0.1`, `deadzone 100×50`.

### HK-Analyzed Camera Behavior

Hollow Knight's camera in vertical areas:
- **Deadzone**: Player moves freely within a rectangle before camera follows
  - Vertical deadzone: ~60px (player can move up/down ~30px before camera moves)
  - Horizontal deadzone: ~100px (same)
- **Lerp**: ~0.06-0.08 per frame — smooth, never jerky
- **Y-offset**: Camera looks slightly upward (-20px) because player often looks up in vertical areas
- **Edge cushion**: When player approaches room top/bottom, camera stops following early (prevents seeing black void)

### Upgraded Vertical Shaft Camera

```javascript
_setupVerticalShaftCamera() {
    const cam = this.cameras.main;
    
    // Start follow with custom deadzone
    cam.startFollow(this.player.sprite, true, true, 0.08, 0.06);
    cam.setDeadzone(120, 80);  // Wider deadzone for vertical
    
    // Y-offset: look up slightly
    cam.setFollowOffset(0, -20);
    
    // Store reference for dynamic adjustment
    this._cameraProfile = 'verticalShaft';
}

// In update():
if (this._cameraProfile === 'verticalShaft') {
    const cam = this.cameras.main;
    const room = this._roomDef(this.currentRoomId);
    
    // Edge cushion: stop following when player is near room top/bottom
    const cushionY = 80;
    if (this.player.y < cushionY) {
        cam.scrollY = 0;
    } else if (this.player.y > room.height - cushionY) {
        cam.scrollY = room.height - this.scale.height;
    }
    
    // Dynamic y-offset: when player is in upper portion, look up more
    const heightRatio = this.player.y / room.height;
    const offsetY = Phaser.Math.Linear(-30, -10, heightRatio);
    cam.setFollowOffset(0, offsetY);
}
```

**Deadzone tuning values for vertical shaft:**

| Property | Value | Rationale |
|----------|-------|-----------|
| Deadzone width | 120px | Player can move ~60px horizontally before camera follows |
| Deadzone height | 80px | Player can move ~40px vertically before camera follows |
| Follow lerp X | 0.08 | Smooth horizontal tracking |
| Follow lerp Y | 0.06 | Slower vertical = less motion sickness in shaft |
| Default Y offset | -20px | Look up slightly |
| Dynamic Y offset range | -30 to -10px | More upward bias at top, less at bottom |
| Edge cushion Y | 80px | Stop tracking near room edges |

## 2.4 Boss Room Camera

The boss room (960×720 → scaled to 1280×720) currently has no camera follow.

### Upgrade: Tight Follow with Slight Zoom-Out

Since the boss room has platforms at various heights, a slight camera follow helps the player track the boss in the air:

```javascript
_setupBossCamera() {
    const cam = this.cameras.main;
    cam.setZoom(0.92);  // Zoom out slightly — see more of the arena
    cam.startFollow(this.player.sprite, true, true, 0.12, 0.12);
    cam.setDeadzone(160, 80);  // Wide deadzone — player moves freely within
    cam.setFollowOffset(0, 0);
    this._cameraProfile = 'boss';
}
```

**Boss camera values:**

| Property | Value | Rationale |
|----------|-------|-----------|
| Zoom | 0.92 | ~8% zoomed out, fits more arena in view |
| Deadzone X | 160px | ~12.5% of screen — player can dash without camera moving |
| Deadzone Y | 80px | ~11% of screen height |
| Lerp X | 0.12 | Responsive follow (boss moves fast) |
| Lerp Y | 0.12 | Same, for aerial phases |
| Follow Offset | (0, 0) | Centered |

**Camera behavior during boss fight:**
1. **Normal**: Camera follows player with wide deadzone — player can move freely
2. **Boss goes high (Phase 2)**: Camera adjusts to include boss — if boss Y < viewport top, camera scrolls up
3. **Boss dive (Pattern C)**: Camera follows fast movement — lerp temporarily increases to 0.2 during the dive
4. **Phase transition**: Camera slowly zooms back to 1.0 during the white flash, then returns to 0.92 after transition

### Boss Camera in BossScene

The BossScene already uses:
```javascript
this.cameras.main.startFollow(this.player.sprite, true, true, 0.1, 0.1);
this.cameras.main.setDeadzone(100, 50);
```

Upgrade to:
```javascript
// Initial camera
this.cameras.main.setZoom(0.92);
this.cameras.main.startFollow(this.player.sprite, true, true, 0.12, 0.12);
this.cameras.main.setDeadzone(160, 80);

// On phase transition: brief zoom to 1.0 then back
cameras.main.flash(300, 255, 255, 255);
this.tweens.add({
    targets: this.cameras.main,
    zoom: 1.0,
    duration: 200,
    yoyo: true,
    ease: 'Quad.easeOut',
});
```

## 2.5 Room Transitions

**Current state**: `fadeOut(120)` → build room → `fadeIn(120)` — total 240ms of black.

### HK-Analyzed Room Transitions

In Hollow Knight, room transitions:
1. **Very fast** (~100-150ms black screen)
2. **Camera slides** rather than cuts — the new room slides into view
3. **Player position** is preserved on the new room's equivalent spot

### Upgraded Transition

```javascript
_transitionToRoom(targetRoomId, spawnX, spawnY, fromDir) {
    this._transitioning = true;
    
    // Ultra-fast fade-out: 80ms
    this.cameras.main.fadeOut(80, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
        this._clearRoom();
        
        // Update room
        this.currentRoomId = targetRoomId;
        if (!this.visitedRooms.includes(targetRoomId)) {
            this.visitedRooms.push(targetRoomId);
        }
        
        const roomDef = this._roomDef(targetRoomId);
        this._buildRoom(roomDef);
        
        const entranceY = this._getRoomEntranceY(roomDef, spawnY, fromDir);
        this.player.teleport(spawnX, entranceY);
        this._spawnLockFrames = 4;  // Shorter lock
        
        // Quick fade-in: 80ms
        this.cameras.main.fadeIn(80, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', () => {
            this._transitioning = false;
        });
    });
}
```

**Key changes:**
- Fade out/in: 120ms each → **80ms each** (total black: 80+80 = 160ms, down from 240ms)
- Spawn lock frames: 8 → **4 frames** (player can move sooner)
- Transition gate unlock: moved from 8 frames to 4 frames after fade-in

### Optional: Camera Slide Transition

If the room adjacency is side-by-side (left/right), add a camera slide:

```javascript
// Instead of fade, slide camera from old room to new room
if (fromDir === 'left' || fromDir === 'right') {
    const slideDir = fromDir === 'left' ? 1 : -1;
    const slideDist = 1280; // Viewport width
    
    // Slide camera out
    this.tweens.add({
        targets: this.cameras.main,
        scrollX: this.cameras.main.scrollX + slideDir * slideDist,
        duration: 100,
        ease: 'Quad.easeIn',
        onComplete: () => {
            // Build new room, snap camera back
            this._buildRoom(roomDef);
            this.cameras.main.scrollX = 0;
            this.player.teleport(...);
            
            // Camera already at correct position, no fade-in needed
            this._transitioning = false;
        }
    });
}
```

However, this requires careful handling because room widths match viewport (1280px). The slide would show the next room's content briefly — which works if both rooms are loaded simultaneously. Given the room-based architecture destroys/recreates content, a **fast fade** is more reliable and matches the current architecture. Recommend keeping fade but shortening it.

## 2.6 Landing Catch-Up Bounce

When the player lands from a high fall, the camera should **catch up** with a brief bounce — like a gentle "oof" that settles.

### Implementation

```javascript
// In GameScene, check for landing each frame
_checkLandingBounce() {
    if (!this._lastAirborne && this.player.isAirborneStable) {
        // Player just left ground — store height
        this._fallStartY = this.player.y;
    }
    
    if (this._lastAirborne && !this.player.isAirborneStable && !this.player.dead) {
        // Player just landed
        const fallDistance = this.player.y - (this._fallStartY || this.player.y);
        
        if (fallDistance > 100) {  // Only bounce on significant falls
            const bounceIntensity = Math.min(fallDistance / 500, 0.8);  // 0 to 0.8
            const bounceY = -4 * bounceIntensity;  // -4px max downward offset
            
            // Camera catches up with bounce
            this.tweens.add({
                targets: this.cameras.main,
                scrollY: this.cameras.main.scrollY + bounceY, // Brief overshoot
                duration: 150,
                ease: 'Quad.easeOut',
                yoyo: true,  // Bounce back
                onComplete: () => {
                    // Settle at correct position
                    this.tweens.add({
                        targets: this.cameras.main,
                        scrollY: this.cameras.main.scrollY,
                        duration: 50,
                    });
                }
            });
        }
    }
    
    this._lastAirborne = this.player.isAirborneStable;
}
```

**Landing bounce values:**

| Fall Distance | Bounce Y | Duration | Notes |
|--------------|---------|----------|-------|
| 100-200px | -2px | 100ms | Small bump |
| 200-350px | -3px | 130ms | Medium impact |
| 350px+ | -4px | 150ms | Big landing |
| 500px+ | -5px | 180ms | Maximum (from top of shaft) |

The bounce simulates the camera "catching up" to the player who fell faster than the camera's lerp could follow.

## 2.7 Hit-Triggered Camera Effects

### Camera Zoom Pulse

On big hits (Attack3 finisher, any boss kill), the camera briefly zooms in 2% and snaps back:

```javascript
_cameraZoomPulse(amount, duration) {
    // amount: 0.02 for subtle, 0.04 for dramatic
    this.tweens.add({
        targets: this.cameras.main,
        zoom: this.cameras.main.zoom + amount,
        duration: duration * 0.3,  // Quick zoom in
        yoyo: true,
        ease: 'Quad.easeOut',
        hold: duration * 0.4,      // Hold at zoomed for a moment
    });
}
```

| Trigger | Zoom Amount | Total Duration |
|---------|------------|---------------|
| Attack3 finisher on normal enemy | +0.01 | 150ms |
| Attack3 finisher on boss | +0.02 | 200ms |
| Boss kill blow | +0.04 | 400ms |
| Boss phase transition | +0.03 | 300ms |

### Camera Directional Snap

When a hit connects, the camera briefly shifts **toward the direction of the hit** (the direction the enemy is knocked back):

```javascript
_cameraHitSnap(directionX, intensity) {
    // directionX: -1 (left) or 1 (right)
    // intensity: px to shift (2-5)
    const snap = directionX * intensity;
    this.tweens.add({
        targets: this.cameras.main,
        scrollX: this.cameras.main.scrollX + snap,
        duration: 40,
        yoyo: true,
        ease: 'Quad.easeOut',
    });
}
```

This is subtle but effective — it gives the camera a "recoil" feel that mirrors the impact direction.

## 2.8 Tuning Knobs

All camera parameters exposed as tuneable constants at the top of `GameScene.js`:

```javascript
static CAMERA_CONFIG = {
    // Default room (static)
    defaultMicroOffsetX: 12,
    defaultMicroOffsetY: 8,
    defaultMicroLerp: 0.02,
    
    // Vertical shaft
    shaftDeadzoneX: 120,
    shaftDeadzoneY: 80,
    shaftLerpX: 0.08,
    shaftLerpY: 0.06,
    shaftOffsetYBase: -20,
    shaftOffsetYTop: -30,
    shaftOffsetYBottom: -10,
    shaftEdgeCushion: 80,
    
    // Boss arena
    bossZoom: 0.92,
    bossDeadzoneX: 160,
    bossDeadzoneY: 80,
    bossLerpX: 0.12,
    bossLerpY: 0.12,
    
    // Transitions
    transitionFadeMs: 80,
    transitionSpawnLockFrames: 4,
    transitionSlideMs: 100,
    
    // Landing bounce
    landingBounceMinFall: 100,
    landingBounceMaxY: -5,
    landingBounceDuration: 150,
    
    // Hit effects
    hitZoomPulseAmount: 0.02,
    hitZoomPulseDuration: 200,
    hitSnapIntensity: 3,
};
```

---

This document covers both areas with concrete, implementable values. The programmer should be able to implement each section independently. Priority order for implementation:

**Phase 1 — Quick Wins (1-2 hrs each):**
1. Proper hitStop (freeze-frame) — biggest feel improvement per line of code
2. Room transition speed-up (120ms → 80ms)
3. Boss camera zoom-out + deadzone upgrade

**Phase 2 — Moderate Effort (2-4 hrs each):**
4. Directional hit particles (upgraded from random burst)
5. Landing catch-up bounce
6. Enemy knockback arc (tweened instead of velocity)

**Phase 3 — Polish (3-6 hrs each):**
7. Per-attack effect matrix (differentiated feedback)
8. Camera zoom pulse + directional snap on hit
9. Boss death sequence upgrade
10. Default room micro-offset breathing

*End of Hit Feedback & Camera Upgrade Design Document.*
