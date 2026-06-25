/**
 * Bench — Rest and save point for SEKAI: 25-ji Metroidvania.
 *
 * Visual:
 *   - Phaser Graphics teal/cyan seat + backrest (~40×16 world pixels)
 *   - Sits on the ground surface
 *
 * Interaction:
 *   - Proximity check within 80px of seat center
 *   - Shows "◆ REST (J)" prompt at bottom-center of screen when player is near
 *   - Player presses J → full restore + save + enemy reset
 *
 * Depth: visuals at 5, prompt text at 200
 */
class Bench {
    /**
     * @param {Phaser.Scene} scene     - Owning GameScene
     * @param {number}       x         - World X coordinate (bench center)
     * @param {number}       surfaceY  - Ground surface Y (bench sits on top of it)
     */
    constructor(scene, x, surfaceY) {
        this.scene = scene;
        this.x = x;
        // Seat bottom aligns with ground surface.
        // Seat is drawn at y offset [-5, 3] from origin, so bottom = origin+3.
        // We want: origin + 3 = surfaceY  =>  origin = surfaceY - 3.
        this.y = surfaceY - 3;

        this._createVisuals();
        this._createPrompt();
        this.usedCount = 0;
    }

    /* ------------------------------------------------------------------ */
    /*  Visuals                                                             */
    /* ------------------------------------------------------------------ */

    _createVisuals() {
        this.gfx = this.scene.add.graphics().setDepth(5).setPosition(this.x, this.y);
        this._drawGfx();
    }

    _drawGfx() {
        const g = this.gfx;
        g.clear();

        // Seat
        g.fillStyle(0x2d3561, 1);
        g.fillRect(-15, -5, 30, 8);

        // Backrest
        g.fillRect(-12, -13, 24, 8);

        // Outline
        g.lineStyle(1, 0x7FE0DE, 0.6);
        g.strokeRect(-15, -5, 30, 8);
        g.strokeRect(-12, -13, 24, 8);
    }

    /* ------------------------------------------------------------------ */
    /*  Prompt                                                             */
    /* ------------------------------------------------------------------ */

    _createPrompt() {
        this.prompt = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 80,
            '\u25C6 REST (J)',
            {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#7FE0DE',
            },
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    }

    /**
     * Show or hide the rest prompt.  Adds a pulse tween while visible.
     * @param {boolean} visible
     */
    showPrompt(visible) {
        if (visible && this.prompt.alpha < 0.01) {
            // Start pulsing
            this.prompt.setAlpha(1);
            this.scene.tweens.add({
                targets: this.prompt,
                alpha: { from: 1, to: 0.5 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        } else if (!visible && this.prompt.alpha > 0.01) {
            this.scene.tweens.killTweensOf(this.prompt);
            this.prompt.setAlpha(0);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Proximity                                                          */
    /* ------------------------------------------------------------------ */

    /**
     * Check whether a point is within interaction range of the bench.
     * Uses a circular check centred on the seat (bench y offset -8).
     * @param {number} px - Player X
     * @param {number} py - Player Y
     * @returns {boolean}
     */
    isPlayerNearby(px, py) {
        const dx = px - this.x;
        const dy = py - (this.y - 8);
        return (dx * dx + dy * dy) <= 80 * 80;
    }

    /* ------------------------------------------------------------------ */
    /*  Rest effect                                                        */
    /* ------------------------------------------------------------------ */

    /** Play a brief visual pulse on the bench graphic. */
    playRestEffect() {
        // Kill any in-flight tween so alpha resets cleanly
        this.scene.tweens.killTweensOf(this.gfx);
        this.gfx.setAlpha(1);

        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 0.4,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Cleanup                                                            */
    /* ------------------------------------------------------------------ */

    destroy() {
        this.scene.tweens.killTweensOf(this.gfx);
        this.scene.tweens.killTweensOf(this.prompt);
        if (this.gfx) this.gfx.destroy();
        if (this.prompt) this.prompt.destroy();
    }
}
