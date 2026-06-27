/**
 * DestructibleWall — A breakable barrier that blocks passage until
 * the player attacks it enough times to shatter it.
 *
 * Design: level-design / breakable-wall
 * Reference: AbilityGate.js (blocking wall pattern)
 *            Enemy.js (takeDamage + hit particles pattern)
 *
 * Behaviour:
 *   - Static physics zone blocks player (same pattern as AbilityGate)
 *   - Player's slashHitbox overlap triggers takeDamage()
 *   - On HP=0: particle burst + shake + flash → remove barrier
 *   - Persistent via save data
 */
class DestructibleWall {
    constructor(scene, x, y, width, height, wallId, maxHp) {
        this.scene = scene;
        this.worldX = x;
        this.worldY = y;
        this.halfW = width / 2;
        this.halfH = height / 2;
        this.wallId = wallId;
        this.maxHp = maxHp || 6;
        this.hp = this.maxHp;
        this.destroyed = false;
        this._hitTimer = 0;

        this.gfx = scene.add.graphics().setDepth(15);
        this._drawWall();

        this._glowTween = scene.tweens.add({
            targets: this.gfx,
            alpha: 0.7,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.body = scene.add.zone(x, y, width, height);
        scene.physics.add.existing(this.body, true);

        this._blockCollider = scene.physics.add.collider(
            scene.player.sprite, this.body,
        );

        this._hitOverlap = scene.physics.add.overlap(
            scene.player.slashHitbox, this.body,
            (_, wallZone) => scene._onPlayerHitWall(wallZone),
            null, scene,
        );

        scene._roomColliders.push(this._blockCollider, this._hitOverlap);
    }

    /* ── Drawing ── */

    _drawWall() {
        const g = this.gfx;
        g.clear();
        const x = this.worldX;
        const y = this.worldY;

        g.fillStyle(0x1a1a2e, 0.9);
        g.fillRoundedRect(x - this.halfW, y - this.halfH, this.halfW * 2, this.halfH * 2, 3);

        g.lineStyle(1.5, 0x7FE0DE, 0.5);
        g.strokeRoundedRect(x - this.halfW, y - this.halfH, this.halfW * 2, this.halfH * 2, 3);

        g.lineStyle(1, 0x7FE0DE, 0.25);
        g.lineBetween(x - this.halfW + 4, y - this.halfH, x + this.halfW - 4, y - this.halfH);

        this._drawCracks();
    }

    _drawCracks() {
        const g = this.gfx;
        const stage = this._getCrackStage();
        if (stage === 0) return;
        const x = this.worldX;
        const y = this.worldY;

        g.lineStyle(1, 0x7FE0DE, 0.6);

        if (stage >= 1) {
            g.lineBetween(x - 6, y - 4, x + 2, y + 8);
            g.lineBetween(x + 4, y - 8, x + 10, y + 2);
        }
        if (stage >= 2) {
            g.lineStyle(1.5, 0x7FE0DE, 0.5);
            g.lineBetween(x - 10, y + 2, x - 4, y + 14);
            g.lineBetween(x + 6, y - 12, x + 14, y - 4);
            g.lineBetween(x + 2, y + 8, x - 4, y + 18);
        }
        if (stage >= 3) {
            g.lineStyle(2, 0x7FE0DE, 0.4);
            g.lineBetween(x - 14, y - 6, x - 2, y + 22);
            g.lineBetween(x + 8, y - 18, x + 18, y - 2);
            g.lineBetween(x - 6, y + 12, x - 12, y + 24);
            g.lineBetween(x + 12, y - 10, x + 20, y + 4);
            g.lineStyle(1, 0xa0d8ff, 0.3);
            g.lineBetween(x - 8, y + 16, x + 4, y + 20);
        }
    }

    _getCrackStage() {
        if (this.destroyed) return 3;
        const ratio = this.hp / this.maxHp;
        if (ratio <= 0.33) return 3;
        if (ratio <= 0.66) return 2;
        if (ratio < 1.0) return 1;
        return 0;
    }

    /* ── Update ── */

    update() {
        if (this._hitTimer > 0) {
            this._hitTimer--;
        }
    }

    /* ── Damage ── */

    takeDamage(amount, dirX) {
        if (this.destroyed || this._hitTimer > 0) return;

        this.hp = Math.max(0, this.hp - amount);
        this._hitTimer = 6;
        this._drawWall();

        this._spawnHitParticles(dirX);
        this.scene.cameras.main.shake(80, 0.005);

        if (this.hp <= 0) {
            this._destroy();
        }
    }

    _spawnHitParticles(dirX) {
        for (let i = 0; i < 5; i++) {
            const p = this.scene.add.circle(
                this.worldX + Phaser.Math.Between(-8, 8),
                this.worldY + Phaser.Math.Between(-6, 6),
                Phaser.Math.Between(1, 3),
                0x7FE0DE,
                1,
            ).setDepth(20);
            this.scene.tweens.add({
                targets: p,
                x: p.x + dirX * Phaser.Math.Between(15, 35),
                y: p.y + Phaser.Math.Between(-20, 0),
                alpha: 0,
                scale: 0.2,
                duration: 250,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    /* ── Destruction ── */

    _destroy() {
        this.destroyed = true;

        this.scene.physics.world.removeCollider(this._blockCollider);
        this.scene.physics.world.removeCollider(this._hitOverlap);
        if (this.body && this.body.active) this.body.destroy();

        this.scene.cameras.main.shake(200, 0.015);
        this.scene.cameras.main.flash(150, 200, 255, 255);

        if (this.scene.cache.audio.exists('sfx_wall_break')) {
            this.scene.sound.play('sfx_wall_break', { volume: 0.6 });
        }

        this._spawnDestructionParticles();

        if (this.scene.player) {
            this.scene.player.feelings = Math.min(
                this.scene.player.feelingsMax,
                this.scene.player.feelings + 8
            );
        }

        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 0,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                if (this.gfx && this.gfx.active) this.gfx.destroy();
            },
        });

        if (this.scene._spawnedWallIds && !this.scene._spawnedWallIds.includes(this.wallId)) {
            this.scene._spawnedWallIds.push(this.wallId);
        }
    }

    _spawnDestructionParticles() {
        const colors = [0x7FE0DE, 0xa0d8ff, 0x4a5a7a, 0xffffff];
        for (let i = 0; i < 15; i++) {
            const p = this.scene.add.circle(
                this.worldX + Phaser.Math.Between(-12, 12),
                this.worldY + Phaser.Math.Between(-16, 16),
                Phaser.Math.Between(2, 5),
                Phaser.Math.RND.pick(colors),
                1,
            ).setDepth(20);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-50, 50),
                y: p.y + Phaser.Math.Between(-50, 10),
                alpha: 0,
                scale: 0.1,
                duration: 400,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    /* ── Cleanup ── */

    destroy() {
        if (this._glowTween) {
            this._glowTween.remove();
            this._glowTween = null;
        }
        this.scene.tweens.killTweensOf(this.gfx);
        this.scene.physics.world.removeCollider(this._blockCollider);
        this.scene.physics.world.removeCollider(this._hitOverlap);
        if (this.body && this.body.active) this.body.destroy();
        if (this.gfx && this.gfx.active) this.gfx.destroy();
    }
}
