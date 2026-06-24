class PauseMenu {
    constructor(scene) {
        this.scene = scene;
        this.isPaused = false;
        this.inputEnabled = false;
        this.selectedIndex = 0;
        this.items = [];
        this.volumeText = null;
        this.fadeInTween = null;
        this.fadeOutTween = null;
        this.volumeBar = null;
        this.volumeKnob = null;

        this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.upKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.wKey = scene.input.keyboard.addKey('W');
        this.sKey = scene.input.keyboard.addKey('S');
        this.confirmKey = scene.input.keyboard.addKey('J');
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this._buildOverlay();
        scene.events.once('shutdown', () => this.destroy());
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (this.isPaused) this._resume();
            else this._pause();
            return;
        }

        if (!this.isPaused || !this.inputEnabled) return;

        if (Phaser.Input.Keyboard.JustDown(this.upKey) || Phaser.Input.Keyboard.JustDown(this.wKey)) this._navigate(-1);
        if (Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.sKey)) this._navigate(1);

        if (Phaser.Input.Keyboard.JustDown(this.confirmKey) ||
            Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
            Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this._confirm();
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.items = [];
        this.volumeText = null;
        this.fadeInTween = null;
        this.fadeOutTween = null;
        this.volumeBar = null;
        this.volumeKnob = null;
        this.isPaused = false;
    }

    _pause() {
        this.isPaused = true;
        this.inputEnabled = false;
        this.selectedIndex = 0;

        this.scene.physics.pause();
        this.scene.tweens.pauseAll();

        this.container.setVisible(true);
        this.container.setAlpha(0);
        if (this.fadeInTween) this.fadeInTween.stop();
        this.fadeInTween = this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 180,
            ease: 'Sine.easeOut',
        });
        this._updateVolumeReadout();
        this._updateHighlight();
        this.inputEnabled = true;
    }

    _resume() {
        this.inputEnabled = false;
        this.isPaused = false;
        this._resetItems();
        if (this.fadeInTween) { this.fadeInTween.stop(); this.fadeInTween = null; }
        if (this.fadeOutTween) this.fadeOutTween.stop();
        this.fadeOutTween = this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 140,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.container.setVisible(false);
                this.container.setAlpha(1);
            },
        });
        this.scene.tweens.resumeAll();
        this.scene.physics.resume();
    }

    _buildOverlay() {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const panelX = width / 2 - 190;
        const panelY = height / 2 - 165;
        const panelW = 380;
        const panelH = 330;

        this.container = this.scene.add.container(0, 0)
            .setDepth(200)
            .setScrollFactor(0)
            .setVisible(false);

        const bg = this.scene.add.graphics().setScrollFactor(0);
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(0, 0, width, height);
        this.container.add(bg);

        const panel = this.scene.add.graphics().setScrollFactor(0);
        panel.fillStyle(0x060912, 0.92);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        panel.lineStyle(2, 0x2f5f93, 0.85);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
        this.container.add(panel);

        const title = this.scene.add.text(width / 2, panelY + 34, 'PAUSED', {
            fontSize: '34px',
            fontFamily: 'monospace',
            color: '#e3f2ff',
            stroke: '#10263d',
            strokeThickness: 4,
        }).setOrigin(0.5).setScrollFactor(0);
        this.container.add(title);

        const subtitle = this.scene.add.text(width / 2, panelY + 70, 'GAME IS PAUSED', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#6c9bcf',
        }).setOrigin(0.5).setScrollFactor(0);
        this.container.add(subtitle);

        const divider = this.scene.add.graphics().setScrollFactor(0);
        divider.lineStyle(1, 0x2a6a9f, 0.4);
        divider.lineBetween(width / 2 - 120, panelY + 92, width / 2 + 120, panelY + 92);
        this.container.add(divider);

        const sectionLabel = this.scene.add.text(width / 2, panelY + 110, 'OPTIONS', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#79b7ff',
            letterSpacing: 2,
        }).setOrigin(0.5).setScrollFactor(0);
        this.container.add(sectionLabel);

        const menuDefs = [
            { label: 'RESUME', action: 'resume' },
            { label: 'MAIN MENU', action: 'mainMenu' },
            { label: 'FULLSCREEN', action: 'fullscreen' },
            { label: 'VOLUME +', action: 'volumeUp' },
            { label: 'VOLUME -', action: 'volumeDown' },
        ];

        const startY = panelY + 146;
        const gap = 28;
        this.items = [];

        menuDefs.forEach((def, index) => {
            const y = startY + index * gap;
            const text = this.scene.add.text(width / 2, y, def.label, {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
            }).setOrigin(0.5).setScrollFactor(0);
            this.container.add(text);
            this.items.push({ text, action: def.action, baseY: y });
        });

        this.highlight = this.scene.add.graphics().setScrollFactor(0);
        this.container.add(this.highlight);

        this.volumeBar = this.scene.add.graphics().setScrollFactor(0);
        this.container.add(this.volumeBar);

        this.volumeKnob = this.scene.add.graphics().setScrollFactor(0);
        this.container.add(this.volumeKnob);

        this.volumeText = this.scene.add.text(width / 2, panelY + panelH - 54, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5).setScrollFactor(0);
        this.container.add(this.volumeText);

        this._updateVolumeSlider(width / 2, panelY + panelH - 34);

        const help = this.scene.add.text(width / 2, panelY + panelH - 18, 'W/S or Up/Down | J / Space confirm | ESC back', {
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#5e7fa6',
        }).setOrigin(0.5).setScrollFactor(0);
        this.container.add(help);

        this._updateVolumeReadout();
        this._updateHighlight();
    }

    _updateVolumeReadout() {
        if (!this.volumeText) return;
        const volume = typeof this.scene.sound.volume === 'number' ? this.scene.sound.volume : 1;
        const percent = Math.round(volume * 100);
        const filled = Math.round(percent / 10);
        const bar = '[' + '#'.repeat(filled) + '-'.repeat(10 - filled) + ']';
        this.volumeText.setText(`MASTER VOLUME ${bar} ${percent}%`);
    }

    _resetItems() {
        this.items.forEach((item) => {
            item.text.setAlpha(1);
            item.text.y = item.baseY;
        });
        this.highlight.clear();
    }

    _navigate(dir) {
        let next = this.selectedIndex + dir;
        if (next < 0) next = this.items.length - 1;
        if (next >= this.items.length) next = 0;
        this.selectedIndex = next;
        this._updateHighlight();
        this.scene.sound.play('sfx_ui_navigate', { volume: 0.4 });
    }

    _updateHighlight() {
        this.highlight.clear();
        const item = this.items[this.selectedIndex];
        if (!item) return;

        const bounds = item.text.getBounds();
        const px = bounds.x - 22;
        const py = bounds.y - 5;
        const pw = bounds.width + 44;
        const ph = bounds.height + 10;

        this.highlight.fillStyle(0x00ffcc, 0.12);
        this.highlight.fillRoundedRect(px, py, pw, ph, 4);
        this.highlight.lineStyle(1, 0x00ffcc, 0.6);
        this.highlight.strokeRoundedRect(px, py, pw, ph, 4);

        const flashAlpha = 0.16 + (Math.sin(this.scene.time.now / 180) * 0.04);
        this.highlight.fillStyle(0x00ffcc, flashAlpha);
        this.highlight.fillRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 3);

        this._updateVolumeSlider(this.volumeText.x, this.volumeText.y + 16);
    }

    _confirm() {
        const item = this.items[this.selectedIndex];
        if (!item) return;

        this.scene.sound.play('sfx_ui_confirm', { volume: 0.5 });

        switch (item.action) {
            case 'resume':
                this._resume();
                break;
            case 'mainMenu':
                this._goToMainMenu();
                break;
            case 'fullscreen':
                this._toggleFullscreen();
                break;
            case 'volumeUp':
                this._adjustVolume(0.1);
                break;
            case 'volumeDown':
                this._adjustVolume(-0.1);
                break;
        }
    }

    _goToMainMenu() {
        this.scene.physics.resume();
        this.scene.tweens.resumeAll();
        this.isPaused = false;

        if (this.scene.bgm) { this.scene.bgm.stop(); this.scene.bgm.destroy(); this.scene.bgm = null; }
        if (this.scene.bgmPhase1) { this.scene.bgmPhase1.stop(); this.scene.bgmPhase1.destroy(); this.scene.bgmPhase1 = null; }
        if (this.scene.bgmPhase2) { this.scene.bgmPhase2.stop(); this.scene.bgmPhase2.destroy(); this.scene.bgmPhase2 = null; }

        if (this.scene.scene.key === 'BossScene') {
            SceneManager.finishOverlay(this.scene, { playerDied: false, goToMenu: true });
            return;
        }

        SceneManager.goTo(this.scene, 'MenuScene');
    }

    _adjustVolume(delta) {
        const currentVolume = typeof this.scene.sound.volume === 'number' ? this.scene.sound.volume : 1;
        this.scene.sound.volume = Phaser.Math.Clamp(currentVolume + delta, 0, 1);
        this._updateVolumeReadout();
        this._updateVolumeSlider();
    }

    _toggleFullscreen() {
        const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fullscreen) {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    }
}


