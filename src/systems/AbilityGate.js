/**
 * AbilityGate — Purple barrier that blocks passage until the player
 * acquires a specific traversal ability.
 *
 * Design doc: combat-design.md / ability-gating
 *
 * Visual:
 *   - Semi-transparent purple rounded rect (fill alpha 0.5, pulsing 0.3–0.5)
 *   - Glowing border: lineStyle(2, 0x9966ff, 0.8)
 *   - Pulse animation: alpha 0.3 → 0.5 over 2 s (via graphics.alpha)
 *   - Particle effect: small purple dots floating upward along the barrier
 *
 * Behaviour:
 *   - Static physics body blocks the player until they have the required ability
 *   - When player acquires the ability → barrier fades out over 0.5 s + particle burst
 *   - On scene start with already-owned ability → gate never appears
 *   - Auto-checks player.abilities every frame via checkUnlock()
 *
 * Orientation:
 *   - 'horizontal' — a vertical wall that blocks side-to-side passage
 *   - 'vertical'   — a horizontal floor that blocks drop-down passages
 *
 * Depth: visuals at 15, particles at 16
 */
class AbilityGate {
    /**
     * @param {Phaser.Scene} scene            - Owning GameScene
     * @param {number}       x                - World X center
     * @param {number}       y                - World Y center
     * @param {number}       width            - Gate visual / physics width (px)
     * @param {number}       height           - Gate visual / physics height (px)
     * @param {string}       requiredAbility  - 'dash' | 'doubleJump'
     * @param {string}       [orientation='horizontal'] - 'horizontal' | 'vertical'
     */
    constructor(scene, x, y, width, height, requiredAbility, orientation) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.requiredAbility = requiredAbility;
        this.orientation = orientation || 'horizontal';
        this.unlocked = false;

        // — Visual: purple barrier
        this.gfx = scene.add.graphics().setDepth(15).setPosition(x, y);
        this._drawBarrier();
        // Initial alpha is 0.8 so fill 0.5 * 0.8 = 0.4 (mid-pulse)
        this.gfx.setAlpha(0.8);

        // — Pulse tween (alpha 0.6 ↔ 1.0 → fill 0.3 ↔ 0.5)
        this.pulseTween = scene.tweens.add({
            targets: this.gfx,
            alpha: { from: 0.6, to: 1.0 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // — Physics body (static zone) that blocks the player
        this.gateBody = scene.add.zone(x, y, width, height);
        scene.physics.add.existing(this.gateBody, true);

        this.gateCollider = scene.physics.add.collider(
            scene.player.sprite,
            this.gateBody,
        );

        // — Floating purple particles along the barrier
        this.particles = [];
        this._createParticles();

        // — If player already has the ability, unlock instantly
        if (scene.player.abilities[this.requiredAbility]) {
            this.unlockImmediate();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Drawing                                                             */
    /* ------------------------------------------------------------------ */

    /** Draw the barrier once (relative to (0,0) — graphics is at world pos). */
    _drawBarrier() {
        const g = this.gfx;
        g.clear();

        const w = this.width;
        const h = this.height;

        // Semi-transparent purple fill
        g.fillStyle(0x7b52c0, 0.5);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

        // Glowing border
        g.lineStyle(2, 0x9966ff, 0.8);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
    }

    /* ------------------------------------------------------------------ */
    /*  Particles                                                           */
    /* ------------------------------------------------------------------ */

    /** Spawn small glowing dots that float upward along the barrier. */
    _createParticles() {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const px = this.x + Phaser.Math.Between(-this.width / 2 + 4, this.width / 2 - 4);
            const py = this.y + Phaser.Math.Between(-this.height / 2 + 4, this.height / 2 - 4);
            const dot = this.scene.add.circle(px, py, 2, 0x9966ff, 0.6).setDepth(16);
            this.particles.push({
                sprite: dot,
                baseX: px,
                baseY: py,
                speed: Phaser.Math.FloatBetween(8, 18),
                phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Unlock                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Check whether the player now has the required ability.
     * Called every frame from update(). Once unlocked, does nothing.
     */
    checkUnlock() {
        if (this.unlocked) return;
        if (this.scene.player.abilities[this.requiredAbility]) {
            this._unlock();
        }
    }

    /** Play unlock animation and remove barrier. */
    _unlock() {
        this.unlocked = true;

        // ── Remove physics collider ────────────────────────────────────
        this.scene.physics.world.removeCollider(this.gateCollider);
        if (this.gateBody && this.gateBody.active) {
            this.gateBody.destroy();
        }

        // ── Particle burst outward ─────────────────────────────────────
        this._spawnBurstParticles();

        // ── Kill existing particles ────────────────────────────────────
        this.particles.forEach(p => {
            if (p.sprite && p.sprite.active) p.sprite.destroy();
        });
        this.particles = [];

        // ── Fade out barrier ───────────────────────────────────────────
        this.scene.tweens.killTweensOf(this.gfx);
        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (this.gfx && this.gfx.active) this.gfx.destroy();
            },
        });
    }

    /**
     * Instantly destroy the gate without animation.
     * Used when loading a save where the player already has the ability.
     */
    unlockImmediate() {
        if (this.unlocked) return;
        this.unlocked = true;

        this.scene.physics.world.removeCollider(this.gateCollider);
        if (this.gateBody && this.gateBody.active) this.gateBody.destroy();
        if (this.pulseTween) this.pulseTween.stop();

        this.particles.forEach(p => {
            if (p.sprite && p.sprite.active) p.sprite.destroy();
        });
        this.particles = [];

        if (this.gfx && this.gfx.active) this.gfx.destroy();
    }

    /** Burst of particles outward from the gate position on unlock. */
    _spawnBurstParticles() {
        for (let i = 0; i < 10; i++) {
            const p = this.scene.add.circle(
                this.x,
                this.y,
                Phaser.Math.Between(2, 4),
                0x9966ff,
                1,
            ).setDepth(20);

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.FloatBetween(30, 70);

            this.scene.tweens.add({
                targets: p,
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.1,
                duration: 500,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Per-frame update: check ability unlock + animate particles.
     * @param {number} time - Phaser clock time (ms)
     */
    update(time) {
        if (this.unlocked) return;

        // Check if player just acquired the required ability
        this.checkUnlock();

        // Animate floating particles
        this.particles.forEach((p) => {
            p.phase += 0.025;
            const driftX = Math.sin(p.phase) * 3;
            const driftY = -Math.sin(p.phase * 0.6) * 4;
            if (p.sprite && p.sprite.active) {
                p.sprite.setPosition(p.baseX + driftX, p.baseY + driftY);
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Cleanup                                                             */
    /* ------------------------------------------------------------------ */

    destroy() {
        this.scene.tweens.killTweensOf(this.gfx);
        if (this.pulseTween) this.pulseTween.stop();

        this.scene.physics.world.removeCollider(this.gateCollider);
        if (this.gateBody && this.gateBody.active) this.gateBody.destroy();
        if (this.gfx && this.gfx.active) this.gfx.destroy();

        this.particles.forEach(p => {
            if (p.sprite && p.sprite.active) p.sprite.destroy();
        });
        this.particles = [];
    }
}
