/**
 * AbilityItem — Glowing collectible that grants the player a new traversal ability.
 *
 * Design doc: combat-design.md / ability-gating
 *
 * Visual:
 *   - Diamond/crystal shape drawn with Phaser Graphics
 *   - Teal-cyan (#2EC4B6) for dash, light cyan (#7FE0DE) for double jump
 *   - Float animation: sine wave y-bob (amplitude 4px, period ~1.5s)
 *   - Glow pulse: alpha 0.6 → 1.0 tween (oscillating)
 *
 * Behaviour:
 *   - One-time pickup: overlaps with player → grant ability → destroy self
 *   - On pickup: screen flash, audio, floating text "◆ DASH ACQUIRED ◆"
 *   - Tracks collection in GameScene.abilityItemsCollected for save/load
 *   - Does NOT respawn on bench rest (persistent acquisition)
 *
 * Depth: visuals at 15, pickup text at 200
 */
class AbilityItem {
    /**
     * @param {Phaser.Scene} scene       - Owning GameScene
     * @param {number}       x           - World X position
     * @param {number}       y           - World Y position
     * @param {string}       abilityKey  - 'dash' | 'doubleJump'
     * @param {string}       displayName - Human-readable name for the pickup text
     */
    constructor(scene, x, y, abilityKey, displayName) {
        this.scene = scene;
        this.worldX = x;
        this.worldY = y;
        this.baseY = y;
        this.abilityKey = abilityKey;
        this.displayName = displayName;
        this.collected = false;

        // — Color palette
        this.color = abilityKey === 'dash' ? 0x2EC4B6 : 0x7FE0DE;

        // — Visual: diamond / crystal
        this.gfx = scene.add.graphics().setDepth(15);
        this._drawDiamond(1);
        this.gfx.setPosition(x, y);

        // — Float animation state
        this.floatPhase = Math.random() * Math.PI * 2;

        // — Glow pulse tween (alpha 0.6 ↔ 1.0)
        this.glowTween = scene.tweens.add({
            targets: this.gfx,
            alpha: { from: 1, to: 0.6 },
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // — Physics zone for overlap detection (static, immovable)
        this.zone = scene.add.zone(x, y, 28, 28);
        scene.physics.add.existing(this.zone, true);

        // — Overlap with player → grant ability
        this.overlapCollider = scene.physics.add.overlap(
            scene.player.sprite,
            this.zone,
            () => this._onPickup(),
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Drawing                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Draw the diamond shape on the graphics object.
     * The graphics is positioned at (worldX, worldY), so draw relative to (0,0).
     * @param {number} alpha - Opacity for the crystal fill (0–1)
     */
    _drawDiamond(alpha) {
        const g = this.gfx;
        g.clear();

        const c = this.color;

        // Outer glow circle
        g.fillStyle(c, 0.12 * alpha);
        g.fillCircle(0, 0, 18);

        // Diamond — top triangle
        g.fillStyle(c, alpha);
        g.beginPath();
        g.moveTo(0, -13);
        g.lineTo(-9, 0);
        g.lineTo(9, 0);
        g.closePath();
        g.fillPath();

        // Diamond — bottom triangle
        g.beginPath();
        g.moveTo(0, 13);
        g.lineTo(-9, 0);
        g.lineTo(9, 0);
        g.closePath();
        g.fillPath();

        // Inner highlight (small bright triangle)
        g.fillStyle(0xffffff, 0.35 * alpha);
        g.beginPath();
        g.moveTo(-2, -8);
        g.lineTo(-5, -1);
        g.lineTo(0, -1);
        g.closePath();
        g.fillPath();
    }

    /* ------------------------------------------------------------------ */
    /*  Pickup                                                              */
    /* ------------------------------------------------------------------ */

    /** Handle player overlap — grant ability, destroy self, show text. */
    _onPickup() {
        if (this.collected) return;
        this.collected = true;

        // ── Grant ability ──────────────────────────────────────────────
        this.scene.player.abilities[this.abilityKey] = true;

        // ── Track for save/load ────────────────────────────────────────
        if (!this.scene.abilityItemsCollected.includes(this.abilityKey)) {
            this.scene.abilityItemsCollected.push(this.abilityKey);
        }

        // ── Audio ──────────────────────────────────────────────────────
        if (this.scene.sound && this.scene.sound.get('sfx_combo_feelings')) {
            this.scene.sound.play('sfx_combo_feelings', { volume: 0.7 });
        }

        // ── Screen flash (light blue) ──────────────────────────────────
        this.scene.cameras.main.flash(350, 127, 196, 255);

        // ── Destroy visuals and physics ────────────────────────────────
        this.scene.tweens.killTweensOf(this.gfx);
        this.gfx.destroy();
        this.scene.physics.world.removeCollider(this.overlapCollider);
        this.zone.destroy();

        // ── Show acquisition text ──────────────────────────────────────
        this._showAcquisitionText();
    }

    /**
     * Show a centered floating text (e.g. "◆ DASH ACQUIRED ◆")
     * that drifts upward and fades out over 2 seconds.
     */
    _showAcquisitionText() {
        const displayName = this.displayName.toUpperCase();
        const txt = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2 - 40,
            `\u25C6 ${displayName} ACQUIRED \u25C6`,
            {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
                stroke: '#000000',
                strokeThickness: 3,
            },
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.scene.tweens.add({
            targets: txt,
            y: txt.y - 30,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            delay: 1200,  // hold visible for 1.2 s before fading
            onComplete: () => txt.destroy(),
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Per-frame update: float animation.
     * @param {number} time - Phaser clock time (ms)
     */
    update(time) {
        if (this.collected) return;

        const floatOffset = Math.sin(time / 1000 * 1.5 + this.floatPhase) * 4;
        this.gfx.setPosition(this.worldX, this.baseY + floatOffset);
        this.zone.setPosition(this.worldX, this.baseY + floatOffset);
    }

    /* ------------------------------------------------------------------ */
    /*  Cleanup                                                             */
    /* ------------------------------------------------------------------ */

    destroy() {
        this.scene.tweens.killTweensOf(this.gfx);
        if (this.gfx && this.gfx.active) this.gfx.destroy();
        if (this.zone && this.zone.active) {
            this.scene.physics.world.removeCollider(this.overlapCollider);
            this.zone.destroy();
        }
    }
}
