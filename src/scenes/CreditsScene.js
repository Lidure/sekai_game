/**
 * CreditsScene — Scrolling credits for SEKAI: A 25-ji Metroidvania.
 *
 * Features:
 *   - Dark background with floating teal/purple particles (consistent with MenuScene)
 *   - "CREDITS" title fixed at top
 *   - Auto-scrolling credit text (bottom→top over 15s)
 *   - J to skip scroll / J to return to menu after scroll completes
 *   - "THANK YOU FOR PLAYING" + blinking "PRESS J TO RETURN" at end
 *   - Fade transition back to MenuScene via SceneManager
 */
class CreditsScene extends Phaser.Scene {
    constructor() {
        super('CreditsScene');
    }

    /* ------------------------------------------------------------------ */
    /*  Phaser lifecycle                                                   */
    /* ------------------------------------------------------------------ */

    create() {
        this.canReturn = false;       // True after scroll completes + delay
        this.scrollComplete = false;  // True when scroll reaches end
        this.particles = [];

        this._buildBackground();
        this._buildTitle();
        this._buildEndTexts();
        this._buildCredits();
        this._createControls();

        // Fade in on entry
        this.cameras.main.fadeIn(500);
    }

    update(time, delta) {
        this._updateParticles(delta);
    }

    /* ------------------------------------------------------------------ */
    /*  Background: dark fill + grid lines + floating particles            */
    /* ------------------------------------------------------------------ */

    _buildBackground() {
        const bg = this.add.graphics().setDepth(0);

        // Solid dark fill
        bg.fillStyle(0x0a0a1a);
        bg.fillRect(0, 0, 960, 720);

        // Subtle grid
        bg.lineStyle(1, 0x1a1a3e, 0.25);
        for (let x = 0; x <= 960; x += 50) {
            bg.lineBetween(x, 0, x, 720);
        }
        for (let y = 0; y <= 720; y += 50) {
            bg.lineBetween(0, y, 960, y);
        }

        // Small decorative crosses at grid intersections
        bg.lineStyle(1, 0x1a1a3e, 0.15);
        for (let x = 0; x <= 960; x += 50) {
            for (let y = 0; y <= 720; y += 50) {
                bg.fillStyle(0x1a1a3e, 0.2);
                bg.fillRect(x - 1, y - 1, 3, 3);
            }
        }

        // Floating particles (teal / purple dots)
        this._createParticles();
    }

    _createParticles() {
        const colors = [0x44ccff, 0x9966ff, 0x66eeff];
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, 960);
            const y = Phaser.Math.Between(0, 720);
            const size = Phaser.Math.FloatBetween(1, 3);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const speed = Phaser.Math.Between(20, 60);
            const alpha = 0.3 + size * 0.15;

            const circle = this.add.circle(x, y, size, color, alpha)
                .setDepth(1);

            this.particles.push({
                obj: circle,
                speed: speed,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    _updateParticles(delta) {
        const dt = delta / 1000;
        const time = this.time.now / 1000;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.obj.y -= p.speed * dt;
            p.obj.x += Math.sin(time + p.phase) * 0.5;

            // Reset when off-screen top
            if (p.obj.y < -10) {
                p.obj.y = 730;
                p.obj.x = Phaser.Math.Between(0, 960);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Title                                                              */
    /* ------------------------------------------------------------------ */

    _buildTitle() {
        this.add.text(480, 72, 'CREDITS', {
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5).setDepth(10);

        // Decorative line under title
        const deco = this.add.graphics().setDepth(9);
        deco.lineStyle(1, 0x2a6a9f, 0.3);
        deco.lineBetween(360, 108, 600, 108);
    }

    /* ------------------------------------------------------------------ */
    /*  End texts (initially hidden, revealed after scroll completes)      */
    /* ------------------------------------------------------------------ */

    _buildEndTexts() {
        this.endThankYou = this.add.text(480, 312, 'THANK YOU FOR PLAYING', {
            fontSize: '26px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        this.endReturn = this.add.text(480, 372, 'PRESS J TO RETURN', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);
    }

    /* ------------------------------------------------------------------ */
    /*  Scrolling credits text                                             */
    /* ------------------------------------------------------------------ */

    _buildCredits() {
        // Credit data: each entry is either a {text, style} object or null (spacer)
        const creditData = [
            { text: 'SEKAI: A 25-ji Metroidvania', style: 'title' },
            null,
            { text: 'Created by',   style: 'section' },
            { text: 'lidure',       style: 'body' },
            null,
            { text: 'Player Character', style: 'section' },
            { text: 'Mafuyu (Asahina Mafuyu)', style: 'body' },
            null,
            { text: 'Boss Character', style: 'section' },
            { text: 'Mafuyu (Shadow)', style: 'body' },
            null,
            { text: 'Game Engine', style: 'section' },
            { text: 'Phaser 3.87', style: 'body' },
            null,
            { text: 'Sound Effects', style: 'section' },
            { text: 'OpenGameArt.org',          style: 'body' },
            { text: '(multiple CC0 contributors)', style: 'small' },
            null,
            { text: 'Special Thanks', style: 'section' },
            { text: 'Project SEKAI',       style: 'body' },
            { text: '25-ji, Nightcord de.', style: 'body' },
            null,
            { text: '"The feelings scatter...', style: 'quote' },
            { text: 'but they remain."',        style: 'quote' },
        ];

        // Style presets used by credit entries
        const styles = {
            title:   { fontSize: '28px', fontFamily: 'monospace', color: '#a8d8ff' },
            section: { fontSize: '20px', fontFamily: 'monospace', color: '#7FE0DE' },
            body:    { fontSize: '20px', fontFamily: 'monospace', color: '#c8d8ff' },
            small:   { fontSize: '16px', fontFamily: 'monospace', color: '#7a7a9a' },
            quote:   { fontSize: '18px', fontFamily: 'monospace', color: '#7FE0DE' },
        };

        // Vertical leading (px) per style type
        const leadings = {
            title: 42, section: 32, body: 28, small: 26, quote: 28, spacer: 28,
        };

        this.creditContainer = this.add.container(0, 0).setDepth(5);
        let y = 0;

        creditData.forEach((entry) => {
            if (entry === null) {
                y += leadings.spacer;
                return;
            }
            const style = styles[entry.style] || styles.body;
            const leading = leadings[entry.style] || 24;
            const text = this.add.text(480, y, entry.text, style)
                .setOrigin(0.5, 0);
            this.creditContainer.add(text);
            y += leading;
        });

        this.creditHeight = y;
        const startY = 620;                    // Below bottom edge of screen
        const endY = -(this.creditHeight + 80); // Above top edge of screen
        this.finalScrollY = endY;

        this.creditContainer.y = startY;

        // Auto-scroll over 15 seconds
        this.scrollTween = this.tweens.add({
            targets: this.creditContainer,
            y: endY,
            duration: 15000,
            ease: 'Linear',
            onComplete: () => {
                this._onScrollComplete();
            },
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Scroll completion / skip handling                                  */
    /* ------------------------------------------------------------------ */

    _onScrollComplete() {
        if (this.scrollComplete) return; // Guard against double-fire
        this.scrollComplete = true;

        // Reveal "THANK YOU FOR PLAYING" with a fade-up
        this.tweens.add({
            targets: this.endThankYou,
            alpha: 1,
            duration: 800,
            ease: 'Power2',
        });

        // Blinking "PRESS J TO RETURN" (with delay so it appears after the thank-you)
        this.tweens.add({
            targets: this.endReturn,
            alpha: { from: 0.3, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 600,
        });

        // Brief delay before accepting return input
        this.time.delayedCall(500, () => {
            this.canReturn = true;
        });
    }

    _skipScroll() {
        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }
        this.creditContainer.y = this.finalScrollY;
        this._onScrollComplete();
    }

    /* ------------------------------------------------------------------ */
    /*  Controls                                                           */
    /* ------------------------------------------------------------------ */

    _createControls() {
        this.keyJ = this.input.keyboard.addKey('J');

        this.keyJ.on('down', () => {
            if (this.canReturn) {
                this._returnToMenu();
            } else if (!this.scrollComplete) {
                this._skipScroll();
            }
        });
    }

    _returnToMenu() {
        this.sound.play('sfx_ui_confirm', { volume: 0.5 });
        SceneManager.goTo(this, 'MenuScene');
    }
}
