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
        this._drawnConnections = new Set();

        const w = scene.scale.width;
        const h = scene.scale.height;
        this.panel = {
            x: Math.round(w * 0.06),
            y: Math.round(h * 0.10),
            w: Math.round(w * 0.88),
            h: Math.round(h * 0.68),
        };
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

        this.titleText = scene.add.text(w / 2, 46, 'MAP', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this.helpText = scene.add.text(w / 2, h - 28, 'M TOGGLE', {
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
                    pois: this._collectPOIs(def),
                };
            })
            .filter(Boolean);
    }

    _collectPOIs(roomDef) {
        const pois = [];
        if (roomDef.bossTrigger) pois.push({ type: 'boss' });
        return pois;
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
        this._savedZoom = this.scene.cameras.main.zoom;
        this.scene.cameras.main.setZoom(1);
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
        if (this._savedZoom !== undefined) {
            this.scene.cameras.main.setZoom(this._savedZoom);
            this._savedZoom = undefined;
        }
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
        this._adjacencyCache = null;

        this.backdrop.clear();
        this.frameGfx.clear();
        this.connectionGfx.clear();
        this.nodeGfx.clear();
        this.playerGfx.clear();
        this._drawnConnections.clear();

        this._drawBackdrop();
        this._drawFrame();
        this._drawConnections();
        this._drawNodes();
        this._drawUnknownRooms();
        this._drawPlayerMarker();
    }

    _adjacentRoomIds() {
        if (this._adjacencyCache) return this._adjacencyCache;
        const adj = new Set();
        if (typeof RoomDef === 'undefined' || !RoomDef.getConnections) return adj;
        this.rooms.forEach(room => {
            RoomDef.getConnections(room.id).forEach(otherId => {
                if (this.roomIndex.has(otherId)) adj.add(otherId);
            });
        });
        this._adjacencyCache = adj;
        return adj;
    }

    _drawBackdrop() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        this.backdrop.fillStyle(0x04050c, 0.9);
        this.backdrop.fillRect(0, 0, w, h);
        this.backdrop.fillStyle(0x0b1020, 0.18);
        this.backdrop.fillRect(this.panel.x, this.panel.y, this.panel.w, this.panel.h);
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
        if (typeof RoomDef === 'undefined' || !RoomDef.CONNECTIONS) return;

        for (const [idA, idB] of RoomDef.CONNECTIONS) {
            const source = this.roomPositions.get(idA);
            const dest = this.roomPositions.get(idB);
            if (!source || !dest) continue;

            const key = [idA, idB].sort().join('::');
            if (this._drawnConnections.has(key)) continue;
            this._drawnConnections.add(key);

            const active = this.roomState.get(idA)?.visited || this.roomState.get(idB)?.visited ||
                           this.roomState.get(idA)?.current || this.roomState.get(idB)?.current;
            const isShortcut = (idA === 'secret' && idB === 'shaft') || (idA === 'shaft' && idB === 'ascent');
            const color = isShortcut ? 0x55557a : (active ? 0x7fe0de : 0x2b3552);
            const alpha = isShortcut ? 0.5 : (active ? 0.85 : 0.42);
            const lineW = isShortcut ? 1.5 : (active ? 3 : 2);
            const sx = source.cx, sy = source.cy;
            const dx = dest.cx, dy = dest.cy;
            const midX = sx + (dx - sx) * 0.5;
            this.connectionGfx.lineStyle(lineW, color, alpha);
            this.connectionGfx.beginPath();
            this.connectionGfx.moveTo(sx, sy);
            this.connectionGfx.lineTo(midX, sy);
            this.connectionGfx.lineTo(midX, dy);
            this.connectionGfx.lineTo(dx, dy);
            this.connectionGfx.strokePath();
        }
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

            if (state.current || state.visited) {
                const label = this.scene.add.text(pos.cx, pos.cy - 1, room.name, {
                    fontSize: state.current ? '10px' : '9px',
                    fontFamily: 'monospace',
                    color: state.current ? '#ffffff' : '#c4d7f2',
                    align: 'center',
                }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
                this.container.add(label);
                this.roomLabels.push(label);
            }

            // POI icons inside visited/current room nodes
            if ((state.current || state.visited) && room.pois.length > 0) {
                const icons = this._poiIconsForRoom(room, pos);
                icons.forEach(ico => {
                    this.nodeGfx.fillStyle(ico.color, 0.9);
                    if (ico.shape === 'circle') this.nodeGfx.fillCircle(ico.x, ico.y, 3);
                    else if (ico.shape === 'square') this.nodeGfx.fillRect(ico.x - 2.5, ico.y - 2.5, 5, 5);
                    else if (ico.shape === 'diamond') {
                        this.nodeGfx.fillTriangle(ico.x, ico.y - 3.5, ico.x - 3, ico.y, ico.x + 3, ico.y);
                        this.nodeGfx.fillTriangle(ico.x, ico.y + 3.5, ico.x - 3, ico.y, ico.x + 3, ico.y);
                    } else if (ico.shape === 'triangle') {
                        this.nodeGfx.fillTriangle(ico.x, ico.y - 3, ico.x - 3, ico.y + 2, ico.x + 3, ico.y + 2);
                    }
                });
            }
        });
    }

    _poiIconsForRoom(room, pos) {
        const icons = [];
        const cx = pos.cx, cy = pos.cy;
        const startX = cx - ((room.pois.length - 1) * 7) / 2;
        room.pois.forEach((poi, i) => {
            const x = startX + i * 7;
            const y = cy + 12;
            let color = 0x7FE0DE, shape = 'square';
            switch (poi.type) {
                case 'bench':    color = 0x7FE0DE; shape = 'square'; break;
                case 'npc':      color = 0xA78BFA; shape = 'circle'; break;
                case 'ability':  color = 0xFBBF24; shape = 'diamond'; break;
                case 'gate':     color = 0xF87171; shape = 'triangle'; break;
                case 'boss':     color = 0xEF4444; shape = 'diamond'; break;
                case 'upgrade':  color = 0x34D399; shape = 'circle'; break;
            }
            icons.push({ x, y, color, shape, type: poi.type });
        });
        return icons;
    }

    _drawUnknownRooms() {
        const adj = this._adjacentRoomIds();
        this.rooms.forEach(room => {
            const state = this.roomState.get(room.id);
            if (state && state.visited) return;
            if (!adj.has(room.id)) return;

            const pos = this.roomPositions.get(room.id);
            if (!pos) return;

            const fill = 0x0a1120;
            const line = 0x1e2942;

            this.nodeGfx.fillStyle(fill, 0.7);
            this.nodeGfx.fillRoundedRect(pos.x, pos.y, pos.w, pos.h, 4);
            this.nodeGfx.lineStyle(1, line, 0.5);
            this.nodeGfx.strokeRoundedRect(pos.x, pos.y, pos.w, pos.h, 4);

            const qLabel = this.scene.add.text(pos.cx, pos.cy, '???', {
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#3a4a6a',
                align: 'center',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
            this.container.add(qLabel);
            this.roomLabels.push(qLabel);
        });
    }

    _drawPlayerMarker() {
        this.playerGfx.clear();
        const pos = this.roomPositions.get(this.currentRoomId);
        const room = this.roomIndex.get(this.currentRoomId);
        if (!pos || !room) return;

        const roomW = 1280;
        const roomH = 720;
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
