class DemoCompleteScene extends Phaser.Scene {
    constructor() {
        super('DemoCompleteScene');
    }

    init(data) {
        this.playerData = data.playerData || {};
    }

    create() {
        this._canContinue = false;
        this._createBackground();
        this._createCard();
        this._createText();
        this._createStatsPanel();
        this._createHint();
        this._createInput();

        this.bgm = AudioSettings.createBgm(this, 'bgm_menu', 0.26);
        this.bgm.play();
        this.tweens.add({
            targets: this.bgm,
            volume: AudioSettings.scale('bgm', 0.26),
            duration: 1000,
        });

        this.cameras.main.fadeIn(500);
        this.cameras.main.flash(160, 255, 255, 255);

        this.time.delayedCall(600, () => {
            this._canContinue = true;
        });
    }

    _createBackground() {
        const w = this.scale.width;
        const h = this.scale.height;
        const g = this.add.graphics().setDepth(0);

        g.fillStyle(0x070912, 1);
        g.fillRect(0, 0, w, h);
        g.fillStyle(0x0d1120, 1);
        g.fillRect(0, 0, w, 110);
        g.fillStyle(0x05070d, 1);
        g.fillRect(0, h - 130, w, 130);

        g.lineStyle(1, 0x1f3558, 0.22);
        for (let x = 0; x <= w; x += 54) g.lineBetween(x, 0, x, h);
        for (let y = 0; y <= h; y += 54) g.lineBetween(0, y, w, y);

        this._particles = [];
        for (let i = 0; i < 26; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
            const p = this.add.circle(x, y, Phaser.Math.FloatBetween(1.5, 3.2), Phaser.Utils.Array.GetRandom([0x7FE0DE, 0xa8d8ff, 0x9966ff]), 0.22)
                .setDepth(1);
            this._particles.push({
                obj: p,
                speed: Phaser.Math.Between(18, 48),
                drift: Phaser.Math.FloatBetween(-0.45, 0.45),
            });
        }
    }

    _createCard() {
        const w = this.scale.width;
        const h = this.scale.height;
        const cardW = Math.min(880, w - 80);
        const cardH = 396;
        const x = (w - cardW) / 2;
        const y = (h - cardH) / 2 - 10;
        this.cardX = x;
        this.cardY = y;
        this.cardW = cardW;
        this.cardH = cardH;

        const g = this.add.graphics().setDepth(20);
        g.fillStyle(0x05070d, 0.94);
        g.fillRoundedRect(x, y, cardW, cardH, 12);
        g.lineStyle(1.5, 0x7FE0DE, 0.35);
        g.strokeRoundedRect(x, y, cardW, cardH, 12);
        g.lineStyle(1, 0x000000, 1);
        g.strokeRoundedRect(x + 4, y + 4, cardW - 8, cardH - 8, 10);
        g.lineStyle(1, 0x2EC4B6, 0.1);
        g.lineBetween(x + 24, y + 76, x + cardW - 24, y + 76);
        g.lineBetween(x + 24, y + 254, x + cardW - 24, y + 254);

        const accent = this.add.graphics().setDepth(21);
        accent.fillStyle(0x7FE0DE, 0.08);
        accent.fillRoundedRect(x + 18, y + 18, 124, 36, 8);
        accent.fillStyle(0x9966ff, 0.08);
        accent.fillRoundedRect(x + cardW - 142, y + cardH - 54, 124, 30, 8);
    }

    _createText() {
        const cx = this.scale.width / 2;
        const top = this.cardY + 36;

        this.title = this.add.text(cx, top, 'DEMO COMPLETE', {
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(25);

        this.subtitle = this.add.text(cx, top + 38, 'THIS BUILD ENDS HERE', {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setDepth(25);

        const left = this.cardX + 34;
        const startY = this.cardY + 112;
        const bodyStyle = {
            fontSize: '15px',
            fontFamily: 'monospace',
            color: '#c8d8ff',
            wordWrap: { width: this.cardW - 292 },
            lineSpacing: 6,
        };

        this.body1 = this.add.text(left, startY,
            'You reached the current endpoint of the playable demo. The core loop, the room flow, and the boss encounter are in place, but the project is still under active development.',
            bodyStyle).setDepth(25);
        this.body2 = this.add.text(left, startY + 82,
            'Missing or incomplete areas include more character assets, more enemy variety, more map content, and broader world expansion.',
            bodyStyle).setDepth(25);
        this.body3 = this.add.text(left, startY + 164,
            'Thanks for playing this build. The full version will continue to grow as more assets, stages, and systems are added.',
            bodyStyle).setDepth(25);

        this.signature = this.add.text(left, this.cardY + this.cardH - 52, 'SEKAI / 25-ji Metroidvania', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setDepth(25);
    }

    _createStatsPanel() {
        const panelW = 220;
        const panelH = 234;
        const x = this.cardX + this.cardW - panelW - 24;
        const y = this.cardY + 112;

        const g = this.add.graphics().setDepth(24);
        g.fillStyle(0x07101a, 0.96);
        g.fillRoundedRect(x, y, panelW, panelH, 10);
        g.lineStyle(1, 0x7FE0DE, 0.26);
        g.strokeRoundedRect(x, y, panelW, panelH, 10);
        g.lineStyle(1, 0x000000, 1);
        g.strokeRoundedRect(x + 3, y + 3, panelW - 6, panelH - 6, 8);

        this.add.text(x + 16, y + 14, 'RUN SUMMARY', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setDepth(25);

        const hp = Phaser.Math.Clamp(this.playerData.hp ?? 0, 0, this.playerData.maxHp ?? 0);
        const maxHp = this.playerData.maxHp ?? 0;
        const feelings = this.playerData.feelings ?? 0;
        const feelingsMax = this.playerData.feelingsMax ?? 100;
        const abilities = this.playerData.abilities || {};
        const abilityLine = [
            abilities.dash ? 'DASH' : null,
            abilities.doubleJump ? 'DOUBLE JUMP' : null,
            abilities.sword ? 'SWORD' : null,
        ].filter(Boolean).join(' / ') || 'NONE';

        const lines = [
            `BOSS CLEARED`,
            `HP ${hp}/${maxHp}`,
            `FEELINGS ${feelings}/${feelingsMax}`,
            `ABILITIES ${abilityLine}`,
            `STATUS DEMO END`,
        ];

        lines.forEach((line, i) => {
            this.add.text(x + 16, y + 50 + i * 30, line, {
                fontSize: i === 0 ? '15px' : '13px',
                fontFamily: 'monospace',
                color: i === 0 ? '#ffffff' : '#c8d8ff',
            }).setDepth(25);
        });

        const footer = this.add.text(x + 16, y + panelH - 20, 'RETURN TO MENU AFTER REVIEW', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#4a6a9f',
        }).setDepth(25);
    }

    _createHint() {
        this.hint = this.add.text(this.scale.width / 2, this.cardY + this.cardH - 20, 'J / ENTER: RETURN TO MENU', {
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#a8d8ff',
        }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);

        this.tweens.add({
            targets: this.hint,
            alpha: { from: 0.25, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 700,
        });
    }

    _createInput() {
        this.keyJ = this.input.keyboard.addKey('J');
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this.keyJ.on('down', () => this._returnToMenu());
        this.keyEnter.on('down', () => this._returnToMenu());
    }

    update(time, delta) {
        if (this._particles) {
            const dt = delta / 1000;
            for (const p of this._particles) {
                p.obj.y -= p.speed * dt;
                p.obj.x += Math.sin((time / 1000) + p.obj.y * 0.01) * p.drift;
                if (p.obj.y < -12) {
                    p.obj.y = this.scale.height + 12;
                    p.obj.x = Phaser.Math.Between(0, this.scale.width);
                }
            }
        }
    }

    _returnToMenu() {
        if (!this._canContinue) return;
        this._canContinue = false;
        this.sound.play('sfx_ui_confirm', { volume: 0.5 });
        if (this.bgm) {
            this.tweens.add({
                targets: this.bgm,
                volume: 0,
                duration: 500,
                onComplete: () => {
                    if (this.bgm) this.bgm.stop();
                },
            });
        }
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(650, () => {
            SceneManager.finishOverlay(this, { goToMenu: true });
        });
    }
}
