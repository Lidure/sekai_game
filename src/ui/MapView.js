/**
 * MapView - room graph overlay.
 *
 * Shows rooms as a connected graph laid out by RoomDef.mapGrid.
 * Mirrors the HK-style "rooms + connections" feel while staying light.
 */
class MapView {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.destroyed = false;
        this._physicsPausedByMap = false;
        this._stateHash = '';

        this.rooms = this._collectRooms();
        this.roomIndex = new Map(this.rooms.map(room => [room.id, room]));
        this.roomPositions = new Map();
        this.roomState = new Map();
        this.roomLabels = [];
        this._exitMarkers = [];
        this._nodeCenters = new Map();

        this.panel = { x: 44, y: 76, w: 712, h: 448 };
        this.graph = {
            x: this.panel.x + 36,
            y: this.panel.y + 74,
            w: this.panel.w - 72,
            h: this.panel.h - 118,
        };

        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(200)
            .setVisible(false);

        this.backdrop = scene.add.graphics();
        this.frameGfx = scene.add.graphics();
        this.connectionGfx = scene.add.graphics();
        this.nodeGfx = scene.add.graphics();
        this.playerGfx = scene.add.graphics();

        this.titleText = scene.add.text(400, 46, 'MAP', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this.helpText = scene.add.text(400, 520, 'M TOGGLE', {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#5a6585',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

        this.container.add([
            this.backdrop,
            this.frameGfx,
            this.connectionGfx,
            this.nodeGfx,
            this.playerGfx,
            this.titleText,
            this.helpText,
        ]);

        this._buildKeyboard();
        scene.events.once('shutdown', () => this.destroy());
    }

    _collectRooms() {
        if (typeof RoomDef === 'undefined' || !RoomDef.ROOM_ORDER) return [];
        return RoomDef.ROOM_ORDER
            .map(id => {
                const def = RoomDef.get(id);
                if (!def || !def.mapGrid) return null;
                return {
                    id,
                    def,
                    gridX: def.mapGrid.x,
                    gridY: def.mapGrid.y,
                    name: def.name || id.toUpperCase(),
                };
            })
            .filter(Boolean);
    }

    _buildKeyboard() {
        this._toggleHandler = (event) => {
            if (this.destroyed) return;
            this.toggle();
            if (event) event.preventDefault();
        };
        this.scene.input.keyboard.on('keydown-M', this._toggleHandler);
    }

    toggle() {
        if (this.isOpen) this._close();
        else this._open();
    }

    _open() {
        if (this.destroyed) return;
        if (this.scene.pauseMenu && this.scene.pauseMenu.isPaused) return;
        if (this.scene.scene && this.scene.scene.isPaused()) return;

        this.isOpen = true;
        this.container.setVisible(true);
        this._syncState(
            this.scene.currentRoomId,
            this.scene.player ? this.scene.player.x : 0,
            this.scene.player ? this.scene.player.y : 0,
            this.scene.visitedRooms,
        );

        if (this.scene.physics && this.scene.physics.world && !this.scene.physics.world.isPaused) {
            this.scene.physics.pause();
            this._physicsPausedByMap = true;
        } else {
            this._physicsPausedByMap = false;
        }

        this._redrawStatic();
    }

    _close() {
        if (this.destroyed) return;
        this.isOpen = false;
        this.container.setVisible(false);
        this.playerGfx.clear();
        if (this._physicsPausedByMap && this.scene.physics && this.scene.physics.world && this.scene.physics.world.isPaused) {
            this.scene.physics.resume();
        }
        this._physicsPausedByMap = false;
    }

    update(roomId, playerX, playerY, visitedRooms) {
        if (this.destroyed) return;
        this._syncState(roomId, playerX, playerY, visitedRooms);
        if (!this.isOpen) return;
        this._drawPlayerMarker();
    }

    _syncState(roomId, playerX, playerY, visitedRooms) {
        const visitedSet = new Set(Array.isArray(visitedRooms) ? visitedRooms : []);
        const nextHash = `${roomId}|${Array.from(visitedSet).sort().join(',')}`;
        if (this._stateHash !== nextHash) {
            this._stateHash = nextHash;
            this.roomState.clear();
            this.rooms.forEach(room => {
                this.roomState.set(room.id, {
                    visited: visitedSet.has(room.id),
                    current: room.id === roomId,
                });
            });
            if (this.isOpen) this._redrawStatic();
        }

        this.currentRoomId = roomId;
        this.playerX = playerX;
        this.playerY = playerY;
    }

    _redrawStatic() {
        this.roomPositions.clear();
        this._clearRoomLabels();
        this._clearExitMarkers();

        this.backdrop.clear();
        this.frameGfx.clear();
        this.connectionGfx.clear();
        this.nodeGfx.clear();
        this.playerGfx.clear();

        this._drawBackdrop();
        this._drawFrame();
        this._drawConnections();
        this._drawNodes();
        this._drawPlayerMarker();
    }

    _drawBackdrop() {
        this.backdrop.fillStyle(0x04050c, 0.9);
        this.backdrop.fillRect(0, 0, 800, 600);
        this.backdrop.fillStyle(0x0b1020, 0.18);
        this.backdrop.fillRect(44, 76, 712, 448);
    }

    _drawFrame() {
        const p = this.panel;
        this.frameGfx.fillStyle(0x090d17, 0.96);
        this.frameGfx.fillRect(p.x, p.y, p.w, p.h);
        this.frameGfx.lineStyle(1, 0x2a3150, 1);
        this.frameGfx.strokeRect(p.x, p.y, p.w, p.h);
        this.frameGfx.lineStyle(1, 0x121826, 1);
        this.frameGfx.strokeRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
        this.frameGfx.lineStyle(1, 0x7fe0de, 0.22);
        this.frameGfx.strokeRect(this.graph.x - 10, this.graph.y - 10, this.graph.w + 20, this.graph.h + 20);
    }

    _layoutRooms() {
        if (!this.rooms || this.rooms.length === 0) return;
        const cols = Math.max(...this.rooms.map(room => room.gridX), 0) + 1;
        const rows = Math.max(...this.rooms.map(room => room.gridY), 0) + 1;
        const roomW = 88;
        const roomH = 42;
        const usableW = this.graph.w - roomW;
        const usableH = this.graph.h - roomH;
        const stepX = cols > 1 ? usableW / (cols - 1) : 0;
        const stepY = rows > 1 ? usableH / (rows - 1) : 0;

        this.rooms.forEach(room => {
            const x = this.graph.x + (stepX * room.gridX);
            const y = this.graph.y + (stepY * room.gridY);
            this.roomPositions.set(room.id, {
                x,
                y,
                w: roomW,
                h: roomH,
                cx: x + roomW / 2,
                cy: y + roomH / 2,
            });
        });
    }

    _drawConnections() {
        this._layoutRooms();
        const drawn = new Set();

        this.rooms.forEach(room => {
            const source = this.roomPositions.get(room.id);
            if (!source) return;
            const exits = Array.isArray(room.def.exits) ? room.def.exits : [];

            exits.forEach(exit => {
                const target = this.roomIndex.get(exit.targetRoom);
                if (!target) return;
                const key = [room.id, target.id].sort().join('::');
                if (drawn.has(key)) return;
                drawn.add(key);

                const dest = this.roomPositions.get(target.id);
                if (!dest) return;
                const active = this.roomState.get(room.id)?.visited || this.roomState.get(target.id)?.visited || this.roomState.get(room.id)?.current || this.roomState.get(target.id)?.current;
                const color = active ? 0x7fe0de : 0x2b3552;
                const sx = source.cx;
                const sy = source.cy;
                const dx = dest.cx;
                const dy = dest.cy;
                const midX = sx + (dx - sx) * 0.5;
                this.connectionGfx.lineStyle(active ? 3 : 2, color, active ? 0.85 : 0.42);
                this.connectionGfx.beginPath();
                this.connectionGfx.moveTo(sx, sy);
                this.connectionGfx.lineTo(midX, sy);
                this.connectionGfx.lineTo(midX, dy);
                this.connectionGfx.lineTo(dx, dy);
                this.connectionGfx.strokePath();
            });
        });
    }

    _drawNodes() {
        this.rooms.forEach(room => {
            const pos = this.roomPositions.get(room.id);
            if (!pos) return;
            const state = this.roomState.get(room.id) || { visited: false, current: false };
            const fill = state.current
                ? 0x17384a
                : state.visited
                    ? 0x101b2f
                    : 0x0a1120;
            const line = state.current
                ? 0x7fe0de
                : state.visited
                    ? 0x4f6ea3
                    : 0x1e2942;

            this.nodeGfx.fillStyle(fill, state.current ? 1 : 0.9);
            this.nodeGfx.fillRoundedRect(pos.x, pos.y, pos.w, pos.h, 4);
            this.nodeGfx.lineStyle(state.current ? 2 : 1, line, state.current ? 1 : 0.75);
            this.nodeGfx.strokeRoundedRect(pos.x, pos.y, pos.w, pos.h, 4);

            this.nodeGfx.lineStyle(1, state.current ? 0x7fe0de : 0x2a3554, 0.55);
            this.nodeGfx.lineBetween(pos.cx, pos.y + pos.h, pos.cx, pos.y + pos.h + 6);
            this.nodeGfx.fillStyle(state.current ? 0xffffff : 0x6b7c99, state.current ? 1 : 0.8);
            this.nodeGfx.fillTriangle(pos.cx, pos.y + pos.h + 2, pos.cx - 4, pos.y + pos.h + 8, pos.cx + 4, pos.y + pos.h + 8);

            const label = this.scene.add.text(pos.cx, pos.cy - 1, room.name, {
                fontSize: '9px',
                fontFamily: 'monospace',
                color: state.current ? '#ffffff' : state.visited ? '#c4d7f2' : '#556179',
                align: 'center',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.container.add(label);
            this.roomLabels.push(label);
        });
    }

    _drawPlayerMarker() {
        this.playerGfx.clear();
        const pos = this.roomPositions.get(this.currentRoomId);
        const room = this.roomIndex.get(this.currentRoomId);
        if (!pos || !room) return;

        const roomW = room.def.width || 800;
        const roomH = room.def.height || 600;
        const localX = Phaser.Math.Clamp(this.playerX || 0, 0, roomW);
        const localY = Phaser.Math.Clamp(this.playerY || 0, 0, roomH);
        const markerX = pos.x + 10 + ((pos.w - 20) * (localX / roomW));
        const markerY = pos.y + 8 + ((pos.h - 16) * (localY / roomH));
        const px = Phaser.Math.Clamp(markerX, pos.x + 6, pos.x + pos.w - 6);
        const py = Phaser.Math.Clamp(markerY, pos.y + 6, pos.y + pos.h - 6);

        this.playerGfx.fillStyle(0xffffff, 0.12);
        this.playerGfx.fillCircle(px, py, 7);
        this.playerGfx.fillStyle(0xffffff, 1);
        this.playerGfx.fillTriangle(px, py - 4, px - 4, py, px + 4, py);
        this.playerGfx.fillTriangle(px, py + 4, px - 4, py, px + 4, py);
        this.playerGfx.fillCircle(px, py, 1.5);
    }

    _clearRoomLabels() {
        this.roomLabels.forEach(label => label.destroy());
        this.roomLabels = [];
    }

    _clearExitMarkers() {
        this._exitMarkers.forEach(marker => marker.destroy());
        this._exitMarkers = [];
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isOpen = false;

        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-M', this._toggleHandler);
        }

        this._clearRoomLabels();
        this._clearExitMarkers();

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.backdrop = null;
        this.frameGfx = null;
        this.connectionGfx = null;
        this.nodeGfx = null;
        this.playerGfx = null;
        this.rooms = null;
        this.roomIndex = null;
        this.roomPositions = null;
        this.roomState = null;
    }
}
