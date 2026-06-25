/**
 * MenuScene — Main menu for SEKAI: A 25-ji Metroidvania.
 *
 * Features:
 *   - Dark background with subtle grid and floating teal/purple particles
 *   - "SEKAI" title with sine-float animation and shadow glow
 *   - Menu items with stagger-in fade-up animation
 *   - Keyboard navigation (↑↓/WS skip over disabled items)
 *   - Confirm with J / Space
 *   - Fade transition to GameScene via SceneManager
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    /* ------------------------------------------------------------------ */
    /*  Phaser lifecycle                                                   */
    /* ------------------------------------------------------------------ */

    create() {
        this.selectedIndex = 0;          // Index into this.items
        this.inputEnabled = false;        // Disabled until stagger-in completes
        this.items = [];                 // { text, action, disabled }
        this.particles = [];             // { obj, speed, phase }

        this._buildBackground();
        this._buildTitle();
        this._buildMenuItems();
        this._buildHint();
        this._createControls();

        // Audio — start menu BGM immediately
        this.bgm = this.sound.add('bgm_menu', { loop: true, volume: 0 });
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: 0.35,
            duration: 1000,
        });
        
        // Fade in on entry
        this.cameras.main.fadeIn(500);

        // Enable input after stagger animation finishes
        // Items animate: 0ms, 200ms, 400ms delays, each takes 400ms
        // => last finishes at 400 + 400 = 800ms, add buffer
        this.time.delayedCall(1000, () => {
            this.inputEnabled = true;
            this._updateSelection();
        });
    }

    update(time, delta) {
        this._updateParticles(delta);
        this._handleInput();
    }

    /* ------------------------------------------------------------------ */
    /*  Background: dark fill + grid lines + floating particles            */
    /* ------------------------------------------------------------------ */

    _buildBackground() {
        const bg = this.add.graphics().setDepth(0);

        // Solid dark fill
        bg.fillStyle(0x0a0a1a);
        bg.fillRect(0, 0, 800, 600);

        // Subtle grid
        bg.lineStyle(1, 0x1a1a3e, 0.25);
        for (let x = 0; x <= 800; x += 50) {
            bg.lineBetween(x, 0, x, 600);
        }
        for (let y = 0; y <= 600; y += 50) {
            bg.lineBetween(0, y, 800, y);
        }

        // Small decorative crosses at grid intersections
        bg.lineStyle(1, 0x1a1a3e, 0.15);
        for (let x = 0; x <= 800; x += 50) {
            for (let y = 0; y <= 600; y += 50) {
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
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 600);
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
                p.obj.y = 610;
                p.obj.x = Phaser.Math.Between(0, 800);
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Title                                                              */
    /* ------------------------------------------------------------------ */

    _buildTitle() {
        // "SEKAI" with a glow-like shadow
        const title = this.add.text(400, 150, 'SEKAI', {
            fontSize: '48px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#2a6a9f',
                blur: 16,
                fill: true,
                stroke: false,
            },
        }).setOrigin(0.5).setDepth(10);

        // Subtle floating animation
        this.tweens.add({
            targets: title,
            y: 158,
            duration: 2800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle
        this.add.text(400, 210, 'A 25-ji Metroidvania', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setDepth(10);

        // Decorative line under the title area
        const deco = this.add.graphics().setDepth(9);
        deco.lineStyle(1, 0x2a6a9f, 0.3);
        deco.lineBetween(250, 250, 550, 250);
    }

    /* ------------------------------------------------------------------ */
    /*  Menu items                                                         */
    /* ------------------------------------------------------------------ */

    _buildMenuItems() {
        const hasSave = (() => {
            try {
                const raw = localStorage.getItem('sekai_save');
                return !!(raw && JSON.parse(raw));
            } catch (_) { return false; }
        })();

        const itemDefs = [
            { label: 'NEW GAME',  action: 'newGame',  disabled: false },
            { label: 'CONTINUE',  action: 'continue', disabled: !hasSave },
            { label: 'CREDITS',   action: 'credits',  disabled: true  },
        ];

        const startY = 360;
        const gap = 50;

        itemDefs.forEach((def, i) => {
            const y = startY + i * gap;
            const style = def.disabled
                ? Object.assign({}, GAME_FONTS.menuDisabled)
                : Object.assign({}, GAME_FONTS.menuItem);

            const text = this.add.text(400, y, def.label, style)
                .setOrigin(0.5)
                .setDepth(10)
                .setAlpha(0);

            // Stagger-in: fade up and slide in from slightly below
            this.tweens.add({
                targets: text,
                alpha: 1,
                y: y,
                duration: 500,
                ease: 'Power2',
                delay: i * 200,
            });

            this.items.push({
                text: text,
                action: def.action,
                disabled: def.disabled,
                baseY: y,
            });
        });

        // Selection highlight rectangle (initially hidden)
        this.selHighlight = this.add.graphics().setDepth(9).setAlpha(0);

        // Pulse the highlight alpha
        this.tweens.add({
            targets: this.selHighlight,
            alpha: { from: 0.25, to: 0.7 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    _updateSelection() {
        const item = this.items[this.selectedIndex];
        if (!item) return;

        this.selHighlight.clear();

        const bounds = item.text.getBounds();
        const px = bounds.x - 24;
        const py = bounds.y - 6;
        const pw = bounds.width + 48;
        const ph = bounds.height + 12;

        // Teal glow rectangle
        this.selHighlight.fillStyle(0x00ffcc, 0.12);
        this.selHighlight.fillRoundedRect(px, py, pw, ph, 4);

        this.selHighlight.lineStyle(1, 0x00ffcc, 0.6);
        this.selHighlight.strokeRoundedRect(px, py, pw, ph, 4);
    }

    /* ------------------------------------------------------------------ */
    /*  Hint text                                                          */
    /* ------------------------------------------------------------------ */

    _buildHint() {
        const hint = this.add.text(400, 550, 'PRESS J TO START', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setOrigin(0.5).setDepth(10);

        // Blink
        this.tweens.add({
            targets: hint,
            alpha: { from: 0.3, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Controls                                                           */
    /* ------------------------------------------------------------------ */

    _createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyW = this.input.keyboard.addKey('W');
        this.keyS = this.input.keyboard.addKey('S');
        this.keyJ = this.input.keyboard.addKey('J');
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    _handleInput() {
        if (!this.inputEnabled) return;

        // Navigation — skip disabled items
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW)) {
            this._navigate(-1);
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
            Phaser.Input.Keyboard.JustDown(this.keyS)) {
            this._navigate(1);
        }

        // Confirm
        if (Phaser.Input.Keyboard.JustDown(this.keyJ) ||
            Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this._confirmItem();
        }
    }

    _navigate(dir) {
        let next = this.selectedIndex + dir;

        // Clamp and skip disabled items
        while (next >= 0 && next < this.items.length && this.items[next].disabled) {
            next += dir;
        }
        if (next < 0 || next >= this.items.length) return;

        this.selectedIndex = next;
        this._updateSelection();
        this.sound.play('sfx_ui_navigate', { volume: 0.4 });
    }

    _confirmItem() {
        if (!this.inputEnabled) return;

        const item = this.items[this.selectedIndex];
        if (!item || item.disabled) return;

        this.inputEnabled = false; // Prevent double-confirm

        this.sound.play('sfx_ui_confirm', { volume: 0.5 });

        switch (item.action) {
            case 'newGame':
                this._startNewGame();
                break;
            case 'continue':
                this._continueGame();
                break;
            default:
                this.inputEnabled = true;
                break;
        }
    }

    _continueGame() {
        let saveData;
        try {
            const raw = localStorage.getItem('sekai_save');
            if (!raw) { this.inputEnabled = true; return; }
            saveData = JSON.parse(raw);
        } catch (_) {
            this.inputEnabled = true;
            return;
        }

        // Audio — start game SFX, fade BGM out
        this.sound.play('sfx_ui_start', { volume: 0.55 });
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
            });
        }

        // Brief flash then transition with save data
        this.cameras.main.flash(200, 255, 255, 255);

        this.time.delayedCall(300, () => {
            SceneManager.goTo(this, 'GameScene', { loadSave: saveData });
        });
    }

    _startNewGame() {
        // Audio — start game SFX, fade BGM out
        this.sound.play('sfx_ui_start', { volume: 0.55 });
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => { this.bgm.stop(); this.bgm.destroy(); this.bgm = null; },
            });
        }

        // Brief flash then transition
        this.cameras.main.flash(200, 255, 255, 255);

        this.time.delayedCall(300, () => {
            SceneManager.goTo(this, 'GameScene');
        });
    }
}
