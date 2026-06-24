class PauseMenu {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.selectedIndex = 0;
        this.destroyed = false;

        this.menuItems = [
            { label: 'RESUME', action: 'resume' },
            { label: 'QUIT TO MENU', action: 'quit' },
        ];

        this.container = scene.add.container(400, 300)
            .setScrollFactor(0).setDepth(200).setVisible(false);

        const bg = scene.add.graphics();
        bg.fillStyle(0x0a0a1a, 0.85);
        bg.fillRect(-150, -80, 300, 160);
        bg.lineStyle(1, 0x2d3561, 0.8);
        bg.strokeRect(-150, -80, 300, 160);
        this.container.add(bg);

        this.container.add(
            scene.add.text(0, -55, 'PAUSED', {
                fontSize: '16px', fontFamily: 'monospace', color: '#a8d8ff',
            }).setOrigin(0.5)
        );

        this.labelTexts = [];
        this.menuItems.forEach((item, i) => {
            const text = scene.add.text(0, -15 + i * 35, item.label, {
                fontSize: '14px', fontFamily: 'monospace', color: '#c8d8ff',
            }).setOrigin(0.5);
            this.container.add(text);
            this.labelTexts.push(text);
        });

        this.selHighlight = scene.add.graphics().setVisible(false);
        this.container.add(this.selHighlight);

        this.keys = {
            up: scene.input.keyboard.addKey('UP'),
            down: scene.input.keyboard.addKey('DOWN'),
            w: scene.input.keyboard.addKey('W'),
            s: scene.input.keyboard.addKey('S'),
            j: scene.input.keyboard.addKey('J'),
            space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        };

        this._toggleHandler = () => this.toggle();
        scene.input.keyboard.on('keydown-ESC', this._toggleHandler);
        scene.input.keyboard.on('keydown-P', this._toggleHandler);
        scene.events.once('shutdown', () => this.destroy());
    }

    get paused() { return this.isOpen; }
    get isPaused() { return this.isOpen; }

    toggle(forceOpen = null) {
        if (this.destroyed) return;

        const nextOpen = forceOpen === null ? !this.isOpen : !!forceOpen;
        if (nextOpen === this.isOpen) return;

        this.isOpen = nextOpen;
        this.container.setVisible(this.isOpen);

        if (this.isOpen) {
            this.selectedIndex = 0;
            this._pauseGameplay();
            this._updateSelection();
        } else {
            this._resumeGameplay();
            this.selHighlight.setVisible(false);
        }
    }

    update() {
        if (!this.isOpen || this.destroyed) return;

        const k = this.keys;
        if (Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w)) {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this._updateSelection();
        }
        if (Phaser.Input.Keyboard.JustDown(k.down) || Phaser.Input.Keyboard.JustDown(k.s)) {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            this._updateSelection();
        }
        if (Phaser.Input.Keyboard.JustDown(k.j) || Phaser.Input.Keyboard.JustDown(k.space)) {
            const item = this.menuItems[this.selectedIndex];
            if (item.action === 'resume') this.toggle(false);
            else if (item.action === 'quit') this._quit();
        }
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this._resumeGameplay();

        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-ESC', this._toggleHandler);
            this.scene.input.keyboard.off('keydown-P', this._toggleHandler);
        }
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    _pauseGameplay() {
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.pause();
        }
        this._pauseSound(this.scene.bgm);
        this._pauseSound(this.scene.bgmPhase1);
        this._pauseSound(this.scene.bgmPhase2);
        this.scene.input.keyboard.resetKeys();
    }

    _resumeGameplay() {
        if (!this.scene || !this.scene.physics || !this.scene.physics.world) return;
        this.scene.physics.resume();
        this._resumeSound(this.scene.bgm);
        this._resumeSound(this.scene.bgmPhase1);
        this._resumeSound(this.scene.bgmPhase2);
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.resetKeys();
        }
    }

    _pauseSound(sound) {
        if (sound && sound.isPlaying && sound.pause) {
            sound.pause();
        }
    }

    _resumeSound(sound) {
        if (sound && sound.isPaused && sound.resume) {
            sound.resume();
        }
    }

    _updateSelection() {
        this.selHighlight.clear();
        const text = this.labelTexts[this.selectedIndex];
        if (!text) return;
        const bounds = text.getBounds();
        this.selHighlight.fillStyle(0x00ffcc, 0.12);
        this.selHighlight.fillRoundedRect(bounds.x - 30, bounds.y - 4, bounds.width + 60, bounds.height + 8, 4);
        this.selHighlight.lineStyle(1, 0x00ffcc, 0.6);
        this.selHighlight.strokeRoundedRect(bounds.x - 30, bounds.y - 4, bounds.width + 60, bounds.height + 8, 4);
        this.selHighlight.setVisible(true);
    }

    _quit() {
        this.isOpen = false;
        this.container.setVisible(false);
        this._resumeGameplay();
        this._stopSound(this.scene.bgm);
        this._stopSound(this.scene.bgmPhase1);
        this._stopSound(this.scene.bgmPhase2);

        if (this.scene.scene.key === 'BossScene') {
            SceneManager.finishOverlay(this.scene, { playerDied: false, goToMenu: true });
            return;
        }

        SceneManager.goTo(this.scene, 'MenuScene');
    }

    _stopSound(sound) {
        if (!sound) return;
        sound.stop();
        sound.destroy();
    }
}
