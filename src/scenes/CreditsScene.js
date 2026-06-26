/**
 * CreditsScene — Scrolling credits for SEKAI: A 25-ji Metroidvania.
 *
 * Features:
 *   - Dark background with floating teal/purple particles (consistent with MenuScene)
 *   - "CREDITS" title fixed at top
 *   - Auto-scrolling credit text (bottom→top over 30s)
 *   - Gradient fade at top/bottom edges so text doesn't overlap title
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
        this.canReturn = false;
        this.scrollComplete = false;
        this.particles = [];

        this._buildBackground();
        this._buildTitle();
        this._buildEndTexts();
        this._buildCredits();
        this._buildFadeEdges();
        this._createControls();

        // BGM
        this.bgm = this.sound.add('bgm_credits', { loop: true, volume: 0 });
        this.bgm.play();
        this.tweens.add({ targets: this.bgm, volume: 0.30, duration: 1000 });

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
        const w = this.scale.width;
        const h = this.scale.height;

        bg.fillStyle(0x0a0a1a);
        bg.fillRect(0, 0, w, h);

        bg.lineStyle(1, 0x1a1a3e, 0.25);
        for (let x = 0; x <= w; x += 50) {
            bg.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y <= h; y += 50) {
            bg.lineBetween(0, y, w, y);
        }

        bg.lineStyle(1, 0x1a1a3e, 0.15);
        for (let x = 0; x <= w; x += 50) {
            for (let y = 0; y <= h; y += 50) {
                bg.fillStyle(0x1a1a3e, 0.2);
                bg.fillRect(x - 1, y - 1, 3, 3);
            }
        }

        this._createParticles();
    }

    _createParticles() {
        const colors = [0x44ccff, 0x9966ff, 0x66eeff];
        const w = this.scale.width;
        const h = this.scale.height;
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
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

            if (p.obj.y < -10) {
                p.obj.y = this.scale.height + 10;
                p.obj.x = Phaser.Math.Between(0, this.scale.width);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Title                                                              */
    /* ------------------------------------------------------------------ */

    _buildTitle() {
        this.add.text(this.scale.width / 2, 48, 'CREDITS', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5).setDepth(20);

        const deco = this.add.graphics().setDepth(19);
        deco.lineStyle(1, 0x2a6a9f, 0.3);
        deco.lineBetween(this.scale.width / 2 - 120, 78, this.scale.width / 2 + 120, 78);
    }

    /* ------------------------------------------------------------------ */
    /*  End texts (initially hidden, revealed after scroll completes)      */
    /* ------------------------------------------------------------------ */

    _buildEndTexts() {
        this.endThankYou = this.add.text(this.scale.width / 2, 312, 'THANK YOU FOR PLAYING', {
            fontSize: '26px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);

        this.endReturn = this.add.text(this.scale.width / 2, 372, 'PRESS J TO RETURN', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setOrigin(0.5).setDepth(10).setAlpha(0);
    }

    /* ------------------------------------------------------------------ */
    /*  Scrolling credits text                                             */
    /* ------------------------------------------------------------------ */

    _buildCredits() {
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

        const styles = {
            title:   { fontSize: '28px', fontFamily: 'monospace', color: '#a8d8ff' },
            section: { fontSize: '20px', fontFamily: 'monospace', color: '#7FE0DE' },
            body:    { fontSize: '20px', fontFamily: 'monospace', color: '#c8d8ff' },
            small:   { fontSize: '16px', fontFamily: 'monospace', color: '#7a7a9a' },
            quote:   { fontSize: '18px', fontFamily: 'monospace', color: '#7FE0DE' },
        };

        const leadings = {
            title: 42, section: 32, body: 28, small: 26, quote: 28, spacer: 28,
        };

        this.creditContainer = this.add.container(0, 0).setDepth(5);
        let y = 0;
        const centerX = this.scale.width / 2;

        creditData.forEach((entry) => {
            if (entry === null) {
                y += leadings.spacer;
                return;
            }
            const style = styles[entry.style] || styles.body;
            const leading = leadings[entry.style] || 24;
            const text = this.add.text(centerX, y, entry.text, style)
                .setOrigin(0.5, 0);
            this.creditContainer.add(text);
            y += leading;
        });

        this.creditHeight = y;
        const startY = this.scale.height + 20;
        const endY = -(this.creditHeight + 80);
        this.finalScrollY = endY;

        this.creditContainer.y = startY;

        // Auto-scroll over 30 seconds (slower)
        this.scrollTween = this.tweens.add({
            targets: this.creditContainer,
            y: endY,
            duration: 30000,
            ease: 'Linear',
            onComplete: () => {
                this._onScrollComplete();
            },
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Gradient fade edges (top + bottom)                                 */
    /* ------------------------------------------------------------------ */

    _buildFadeEdges() {
        const w = this.scale.width;
        const h = this.scale.height;
        const fade = this.add.graphics().setDepth(15);

        // Top fade: opaque at top → transparent at y=130
        const topFadeH = 130;
        const steps = 26;
        const stepH = topFadeH / steps;
        for (let i = 0; i < steps; i++) {
            const a = 1 - (i / steps);
            fade.fillStyle(0x0a0a1a, a);
            fade.fillRect(0, i * stepH, w, stepH + 1);
        }

        // Bottom fade: transparent at y=h-80 → opaque at bottom
        const botFadeH = 80;
        const botSteps = 16;
        const botStepH = botFadeH / botSteps;
        for (let i = 0; i < botSteps; i++) {
            const a = i / botSteps;
            fade.fillStyle(0x0a0a1a, a);
            fade.fillRect(0, h - botFadeH + i * botStepH, w, botStepH + 1);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Scroll completion / skip handling                                  */
    /* ------------------------------------------------------------------ */

    _onScrollComplete() {
        if (this.scrollComplete) return;
        this.scrollComplete = true;

        this.tweens.add({
            targets: this.endThankYou,
            alpha: 1,
            duration: 800,
            ease: 'Power2',
        });

        this.tweens.add({
            targets: this.endReturn,
            alpha: { from: 0.3, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 600,
        });

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
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => { this.bgm.stop(); },
            });
        }
        SceneManager.goTo(this, 'MenuScene');
    }
}
