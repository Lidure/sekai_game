/**
 * CharacterPanel — Player status overlay.
 *
 * Displays player stats, abilities, map progress, and combat data
 * in a clean dark panel matching the MapView / PauseMenu visual style.
 *
 * Sections:
 *   VESSEL     — HP current/max
 *   FEELINGS   — Feelings current/max
 *   ABILITIES  — List of unlocked abilities
 *   MAP        — Rooms discovered / total
 *   COMBAT     — Enemies slain count
 *   ENEMIES    — (reserved for bestiary / detailed enemy data)
 *
 * Depth: 250 (above HUD at 200+, above MapView at 200)
 */

class CharacterPanel {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.destroyed = false;

        const w = scene.scale.width;
        const h = scene.scale.height;
        const pW = 450;
        const pH = 550;
        const px = Math.round((w - pW) / 2);
        const py = Math.round((h - pH) / 2);
        const cx = w / 2;

        this._panelRect = { px, py, pW, pH };

        // Root container — fixed to camera, above everything
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(250)
            .setVisible(false);

        /* ---- Backdrop ---- */
        this.backdrop = scene.add.graphics();
        this.backdrop.fillStyle(0x04050c, 0.85);
        this.backdrop.fillRect(0, 0, w, h);
        this.container.add(this.backdrop);

        /* ---- Panel background ---- */
        this.panelGfx = scene.add.graphics();
        this.container.add(this.panelGfx);
        this._drawPanel();

        /* ---- Close button (X) ---- */
        const closeZone = scene.add.zone(px + pW - 20, py + 14, 24, 24)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });
        closeZone.on('pointerup', () => this._close());
        this.container.add(closeZone);

        this.closeText = scene.add.text(px + pW - 20, py + 12, 'X', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#FF87A0',
        }).setOrigin(1, 0.5);
        this.container.add(this.closeText);

        /* ---- Title ---- */
        this.titleText = scene.add.text(cx, py + 28, '\u25C6 STATUS \u25C6', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5);
        this.container.add(this.titleText);

        /* ---- Decorative line ---- */
        const deco = scene.add.graphics();
        const lineY = py + 48;
        deco.lineStyle(1, 0x2EC4B6, 0.20);
        deco.lineBetween(cx - 80, lineY, cx - 16, lineY);
        deco.lineBetween(cx + 16, lineY, cx + 80, lineY);
        deco.fillStyle(0xFF87A0, 0.65);
        deco.fillRect(cx - 2, lineY - 2, 4, 4);
        this.container.add(deco);

        /* ---- Sections ---- */
        const sections = [
            { label: 'VESSEL',     y: py + 70 },
            { label: 'FEELINGS',   y: py + 145 },
            { label: 'ABILITIES',  y: py + 220 },
            { label: 'MAP',        y: py + 310 },
            { label: 'COMBAT',     y: py + 385 },
            { label: 'ENEMIES',    y: py + 450 },
        ];

        this._sectionData = [];
        this.contentTexts = [];

        sections.forEach(sec => {
            // Section header
            const header = scene.add.text(px + 24, sec.y, sec.label, {
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#5a6a8a',
            });
            this.container.add(header);

            // Separator line
            const sep = scene.add.graphics();
            sep.lineStyle(1, 0x2a3150, 0.6);
            sep.lineBetween(px + 24, sec.y + 18, px + pW - 24, sec.y + 18);
            this.container.add(sep);

            // Value text for this section
            const value = scene.add.text(px + 24, sec.y + 26, '', {
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#c8d8ff',
                wordWrap: { width: pW - 48 },
            });
            this.container.add(value);

            this._sectionData.push({ header, value, sec });
            this.contentTexts.push(value);
        });

        /* ---- Cleanup on scene shutdown ---- */
        scene.events.once('shutdown', () => this.destroy());
    }

    /* ================================================================== */
    /*  Panel visual                                                         */
    /* ================================================================== */

    _drawPanel() {
        const g = this.panelGfx;
        const { px, py, pW, pH } = this._panelRect;

        // Glow rings
        for (let i = 4; i >= 1; i--) {
            g.lineStyle(i * 2, 0x2EC4B6, 0.04 * (5 - i));
            g.strokeRoundedRect(px - i * 2, py - i * 2, pW + i * 4, pH + i * 4, 12 + i);
        }

        // Main fill
        g.fillStyle(0x0a0a1a, 0.97);
        g.fillRoundedRect(px, py, pW, pH, 12);

        // Outer teal border
        g.lineStyle(1.5, 0x2EC4B6, 0.45);
        g.strokeRoundedRect(px, py, pW, pH, 12);

        // Inner subtle border
        g.lineStyle(1, 0x7FE0DE, 0.10);
        g.strokeRoundedRect(px + 4, py + 4, pW - 8, pH - 8, 10);
    }

    /* ================================================================== */
    /*  Open / Close                                                         */
    /* ================================================================== */

    toggle() {
        if (this.isOpen) this._close();
        else this._open();
    }

    _open() {
        if (this.destroyed) return;
        this.isOpen = true;
        this.container.setVisible(true);
        this.container.setAlpha(0);
        this.container.setScale(0.92);

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            scale: 1,
            duration: 180,
            ease: 'Sine.easeOut',
        });
    }

    _close() {
        if (this.destroyed) return;
        this.isOpen = false;

        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            scale: 0.92,
            duration: 120,
            ease: 'Sine.easeIn',
            onComplete: () => {
                if (this.container) this.container.setVisible(false);
            },
        });
    }

    /* ================================================================== */
    /*  Refresh                                                              */
    /* ================================================================== */

    /**
     * Update all section content from current player/game state.
     * Safe to call every frame — only updates text when panel is open.
     */
    refresh(player, visitedRooms, enemiesKilled) {
        if (!this.isOpen || this.destroyed) return;
        if (!player) return;

        // VESSEL
        this.contentTexts[0].setText(`${player.hp} / ${player.maxHp}`);

        // FEELINGS
        this.contentTexts[1].setText(`${player.feelings} / ${player.feelingsMax}`);

        // ABILITIES
        const abils = player.abilities || {};
        const abilList = [];
        if (abils.dash) abilList.push('Dash');
        if (abils.doubleJump) abilList.push('Double Jump');
        if (abils.shadowCloak) abilList.push('Shadow Cloak');
        if (abils.sword) abilList.push('Sword of Truth');
        this.contentTexts[2].setText(abilList.length > 0 ? abilList.join('  \u25C6  ') : 'None');

        // MAP
        const visited = Array.isArray(visitedRooms) ? visitedRooms.length : 0;
        const total = typeof RoomDef !== 'undefined' && RoomDef.ROOM_ORDER
            ? RoomDef.ROOM_ORDER.length : 8;
        this.contentTexts[3].setText(`${visited} / ${total} areas discovered`);

        // COMBAT
        const killed = Array.isArray(enemiesKilled) ? enemiesKilled.length : 0;
        this.contentTexts[4].setText(`Enemies slain: ${killed}`);

        // ENEMIES (reserved for future bestiary data)
        // Show a brief stats summary if any enemies are killed
        if (killed > 0) {
            this.contentTexts[5].setText(`(bestiary coming soon)`);
        } else {
            this.contentTexts[5].setText('');
        }
    }

    /* ================================================================== */
    /*  Cleanup                                                              */
    /* ================================================================== */

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isOpen = false;

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.contentTexts = [];
        this._sectionData = [];
        this.backdrop = null;
        this.panelGfx = null;
    }
}
