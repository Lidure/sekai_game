class SaveSlotPicker {
    constructor(scene, config) {
        this.scene = scene;
        this.mode = config.mode || 'save';
        this.onSelect = config.onSelect || (() => {});
        this.onCancel = config.onCancel || (() => {});
        this.selectedIndex = 0;
        this.inputEnabled = false;
        this.destroyed = false;

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(config.depth || 999);

        this._build();
        this._readSlots();

        if (this.mode === 'load') {
            const first = this.slots.findIndex(s => !s.empty);
            if (first >= 0) this.selectedIndex = first;
        }

        this._updateDisplay();

        scene.time.delayedCall(100, () => {
            if (this.destroyed) return;
            this.inputEnabled = true;
        });

        this._bindKeys();
        scene.events.once('shutdown', () => this.destroy());
    }

    _build() {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const pW = 480;
        const pH = 370;
        const px = (W - pW) / 2;
        const py = (H - pH) / 2;
        const cx = W / 2;

        this._panelRect = { px, py, pW, pH };

        const dim = this.scene.add.graphics();
        dim.fillStyle(0x000000, 0.65);
        dim.fillRect(0, 0, W, H);
        this.container.add(dim);

        const panel = this.scene.add.graphics();
        for (let i = 3; i >= 1; i--) {
            const a = 0.04 * (4 - i);
            panel.lineStyle(i * 2, 0x2EC4B6, a);
            panel.strokeRoundedRect(px - i * 2, py - i * 2, pW + i * 4, pH + i * 4, 12 + i);
        }
        panel.fillStyle(0x0a0a1a, 0.95);
        panel.fillRoundedRect(px, py, pW, pH, 12);
        panel.lineStyle(1.5, 0x2EC4B6, 0.45);
        panel.strokeRoundedRect(px, py, pW, pH, 12);
        this.container.add(panel);

        const titleStr = this.mode === 'save' ? '\u25C6 SAVE GAME \u25C6' : '\u25C6 LOAD GAME \u25C6';
        this._titleText = this.scene.add.text(cx, py + 28, titleStr, {
            fontSize: '22px', fontFamily: 'monospace', color: '#7FE0DE',
        }).setOrigin(0.5);
        this.container.add(this._titleText);

        const deco = this.scene.add.graphics();
        deco.lineStyle(1, 0x2EC4B6, 0.20);
        deco.lineBetween(cx - 100, py + 50, cx + 100, py + 50);
        this.container.add(deco);

        this._slotItems = [];
        const cardStartY = py + 66;
        const cardGap = 52;

        for (let i = 0; i < 5; i++) {
            const y = cardStartY + i * cardGap;

            const glow = this.scene.add.graphics();
            this.container.add(glow);

            const numBg = this.scene.add.graphics();
            numBg.fillStyle(0x1a2a4a, 0.6);
            numBg.fillRoundedRect(px + 18, y - 14, 32, 28, 4);
            this.container.add(numBg);

            const numText = this.scene.add.text(px + 34, y, `${i + 1}`, {
                fontSize: '17px', fontFamily: 'monospace', color: '#2EC4B6',
            }).setOrigin(0.5);
            this.container.add(numText);

            const infoText = this.scene.add.text(px + 62, y - 6, '', {
                fontSize: '15px', fontFamily: 'monospace', color: '#c8d8ff',
            }).setOrigin(0, 0.5);
            this.container.add(infoText);

            const subText = this.scene.add.text(px + 62, y + 12, '', {
                fontSize: '11px', fontFamily: 'monospace', color: '#5a7a9f',
            }).setOrigin(0, 0.5);
            this.container.add(subText);

            this._slotItems.push({ glow, numText, infoText, subText, y });
        }

        this._helpText = this.scene.add.text(cx, py + pH - 16, '', {
            fontSize: '12px', fontFamily: 'monospace', color: '#3a4a6a',
        }).setOrigin(0.5);
        this.container.add(this._helpText);
    }

    _readSlots() {
        this.slots = [];
        for (let i = 0; i < 5; i++) {
            try {
                const raw = localStorage.getItem(`sekai_save_${i}`);
                if (raw) {
                    const data = JSON.parse(raw);
                    const roomDef = RoomDef.get(data.roomId);
                    this.slots.push({
                        index: i,
                        empty: false,
                        roomName: roomDef ? roomDef.name : '???',
                        hp: data.hp || 0,
                        maxHp: data.maxHp || 10,
                        timestamp: data.timestamp || 0,
                    });
                } else {
                    this.slots.push({ index: i, empty: true, roomName: null, hp: 0, maxHp: 0, timestamp: 0 });
                }
            } catch (_) {
                this.slots.push({ index: i, empty: true, roomName: null, hp: 0, maxHp: 0, timestamp: 0 });
            }
        }
    }

    _updateDisplay() {
        const { px, pW } = this._panelRect;

        this._slotItems.forEach((item, i) => {
            const slot = this.slots[i];
            const isSelected = (i === this.selectedIndex);
            const isDisabled = (this.mode === 'load' && slot.empty);

            const g = item.glow;
            g.clear();
            if (isSelected) {
                g.fillStyle(0x2EC4B6, 0.08);
                g.fillRoundedRect(px + 10, item.y - 18, pW - 20, 36, 4);
                g.lineStyle(1, 0x2EC4B6, 0.40);
                g.strokeRoundedRect(px + 10, item.y - 18, pW - 20, 36, 4);
            }

            if (slot.empty) {
                item.infoText.setText('EMPTY SLOT');
                item.infoText.setColor(isDisabled ? '#3a4a6a' : '#5a7a9f');
                item.subText.setText('');
                item.numText.setColor(isDisabled ? '#1a2a3a' : '#2EC4B6');
            } else {
                item.infoText.setText(slot.roomName);
                item.infoText.setColor(isSelected ? '#ffffff' : '#c8d8ff');
                const hpStr = SaveSlotPicker._hpBar(slot.hp, slot.maxHp);
                const timeStr = SaveSlotPicker._formatTime(slot.timestamp);
                item.subText.setText(`HP: ${hpStr}    ${timeStr}`);
                item.subText.setColor('#5a7a9f');
                item.numText.setColor('#FF87A0');
            }
        });

        this._helpText.setText('\u2191\u2193 Select   J/SPACE Confirm   ESC Cancel');
    }

    static _hpBar(hp, max) {
        const f = '\u2588'.repeat(Math.min(hp, max));
        const e = '\u2591'.repeat(Math.max(0, max - hp));
        return f + e;
    }

    static _formatTime(ts) {
        if (!ts) return '\u2014';
        const d = new Date(ts);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const mo = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${mo}/${dd} ${hh}:${mm}`;
    }

    _bindKeys() {
        this._handlers = [];
        const on = (event, fn) => {
            this.scene.input.keyboard.on(event, fn);
            this._handlers.push({ event, fn });
        };

        const nav = (dir) => {
            if (!this.inputEnabled) return;
            let next = this.selectedIndex + dir;
            next = Phaser.Math.Wrap(next, 0, 5);
            if (this.mode === 'load') {
                let attempts = 0;
                while (this.slots[next].empty && attempts < 5) {
                    next = Phaser.Math.Wrap(next + dir, 0, 5);
                    attempts++;
                }
                if (this.slots[next].empty) return;
            }
            this.selectedIndex = next;
            this._updateDisplay();
            this._tryPlay('sfx_ui_navigate', 0.25);
        };

        on('keydown-UP', () => nav(-1));
        on('keydown-W', () => nav(-1));
        on('keydown-DOWN', () => nav(1));
        on('keydown-S', () => nav(1));

        on('keydown-J', () => this._confirm());
        on('keydown-SPACE', () => this._confirm());
        on('keydown-ENTER', () => this._confirm());
        on('keydown-ESC', () => { if (this.inputEnabled) this._cancel(); });
        on('keydown-P', () => { if (this.inputEnabled) this._cancel(); });
    }

    _confirm() {
        if (!this.inputEnabled) return;
        const slot = this.slots[this.selectedIndex];
        if (this.mode === 'load' && slot.empty) return;
        this.inputEnabled = false;
        this._tryPlay('sfx_ui_confirm', 0.35);
        this.destroy();
        this.onSelect(this.selectedIndex);
    }

    _cancel() {
        if (!this.inputEnabled) return;
        this.inputEnabled = false;
        this._tryPlay('sfx_ui_navigate', 0.25);
        this.destroy();
        this.onCancel();
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        if (this._handlers) {
            this._handlers.forEach(({ event, fn }) => {
                this.scene.input.keyboard.off(event, fn);
            });
            this._handlers = [];
        }
        if (this.container) {
            this.container.destroy();
        }
    }

    _tryPlay(key, vol) {
        if (this.scene.sound && this.scene.sound.get(key)) {
            this.scene.sound.play(key, { volume: vol });
        }
    }
}
