/**
 * Collectible — A floating, glow-pulsing pickup item for SEKAI Metroidvania.
 *
 * Types:
 *   - 'hp_up':       Permanent max HP increase (+5, max 150). Persistent.
 *   - 'feelings_up': Permanent Feelings max increase (+50, max 150). Persistent.
 *   - 'health':      Heal 30 HP. NOT persistent (respawns on bench rest).
 *
 * Visual:
 *   - Sine y-bob (3px, 1.2s)
 *   - Glow pulse (alpha 0.7 ↔ 1.0)
 *   - Scale-up + fade-out on pickup (300ms)
 *   - Colored particle burst + floating text popup
 *
 * Save/Load:
 *   - Persistent items tracked by saveId in GameScene.collectedPersistentItems
 *   - Non-persistent items always respawn on bench rest
 */
class Collectible {
    /**
     * @param {Phaser.Scene} scene - Owning GameScene
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {object} config
     * @param {string} config.type - 'hp_up' | 'feelings_up' | 'health'
     * @param {number} config.value - Effect magnitude
     * @param {string} [config.saveId] - Unique ID for persistent tracking
     * @param {boolean} [config.persistent=true] - Whether to persist across bench rests
     */
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.saveId = config.saveId || null;
        this.type = config.type;
        this.value = config.value;
        this.persistent = config.persistent !== false;

        this.collected = false;
        this.sprite = null;

        this._createSprite(x, y);
        this._startAnimations();
    }

    get x() { return this.sprite ? this.sprite.x : 0; }
    get y() { return this.sprite ? this.sprite.y : 0; }

    /* ------------------------------------------------------------------ */
    /*  Sprite creation                                                     */
    /* ------------------------------------------------------------------ */

    _createSprite(x, y) {
        const texKey = this._getTextureKey();
        this.sprite = this.scene.add.image(x, y, texKey).setDepth(15);
        // Physics body for overlap detection
        this.scene.physics.add.existing(this.sprite, false);
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        this.sprite.body.setCircle(8, 0, 0);
        // Link back
        this.sprite.collectibleRef = this;
    }

    _getTextureKey() {
        switch (this.type) {
            case 'hp_up':       return 'item_hp_fragment';
            case 'feelings_up':  return 'item_feelings_shard';
            case 'health':      return 'item_health_orb';
            default:            return 'item_health_orb';
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Animations                                                         */
    /* ------------------------------------------------------------------ */

    _startAnimations() {
        // Float bob
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 3,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        // Glow pulse
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: { from: 0.7, to: 1.0 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Pickup                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Called when the player overlaps this collectible.
     * Plays effects, applies the bonus, then destroys.
     * @param {Player} player
     */
    pickup(player) {
        if (this.collected) return;
        this.collected = true;

        // Sound
        this.scene.sound.play('sfx_combo_feelings', { volume: 0.6 });

        // Visual burst
        this._spawnPickupParticles();

        // Apply the bonus
        this._applyEffect(player);

        // Scale-up + fade-out
        this.scene.tweens.killTweensOf(this.sprite);
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => this._destroy(),
        });
    }

    _applyEffect(player) {
        switch (this.type) {
            case 'hp_up':
                player.maxHp = Math.min(150, player.maxHp + 5);
                player.hp = player.maxHp; // full restore
                this._showText('HP UP', '#FF87A0');
                break;

            case 'feelings_up':
                player.feelingsMax = Math.min(150, (player.feelingsMax || 100) + this.value);
                // Refill feelings to new max
                player.feelings = player.feelingsMax;
                this._showText('FEELINGS UP', '#2EC4B6');
                break;

            case 'health':
                player.heal(this.value);
                this._showText('+' + this.value + ' HP', '#a8d8ff');
                break;
        }
    }

    _showText(message, color) {
        const txt = this.scene.add.text(
            this.sprite.x,
            this.sprite.y - 16,
            message,
            {
                fontSize: '12px',
                fontFamily: 'monospace',
                color: color,
                fontStyle: 'bold',
            }
        ).setOrigin(0.5).setDepth(200);

        this.scene.tweens.add({
            targets: txt,
            y: txt.y - 30,
            alpha: 0,
            duration: 900,
            ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Particles                                                          */
    /* ------------------------------------------------------------------ */

    _spawnPickupParticles() {
        const color = this._getParticleColor();
        for (let i = 0; i < 8; i++) {
            const p = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                Phaser.Math.Between(2, 4),
                color,
                1,
            ).setDepth(50);

            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-28, 28),
                y: p.y + Phaser.Math.Between(-28, 28),
                alpha: 0,
                scale: 0.2,
                duration: 300,
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    _getParticleColor() {
        switch (this.type) {
            case 'hp_up':       return 0xFF87A0;
            case 'feelings_up':  return 0x2EC4B6;
            case 'health':      return 0xa8d8ff;
            default:            return 0xffffff;
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Cleanup                                                            */
    /* ------------------------------------------------------------------ */

    _destroy() {
        this.scene.tweens.killTweensOf(this.sprite);
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }

    /** Public destroy — removes visual + cancels all tweens. */
    destroy() {
        this._destroy();
    }
}
