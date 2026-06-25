/**
 * MapView — A top-down mini-map overlay for SEKAI: 25-ji Metroidvania.
 *
 * Shows the game world as a simplified horizontal strip with section
 * dividers, platform indicators, points of interest, and the player's
 * current position.
 *
 * Visual identity (Nightcord / 25-ji theme):
 *   - Deep navy/purple tones (#0a0a1a, #1a1a3e)
 *   - Accent: teal-cyan (#2EC4B6, #7FE0DE), pale blue (#a8d8ff)
 *   - Pink highlight (#FF87A0) for secret POI markers
 *   - Monospace fonts throughout to preserve pixel-art consistency
 *
 * Features:
 *   - M key to toggle open/close (checks PauseMenu state)
 *   - Pauses physics while open
 *   - 7 world sections with explored/unexplored coloring
 *   - Section name labels above the map area
 *   - Simplified platform rectangles
 *   - Points of interest: benches (cyan), boss (red), secret (pink)
 *   - Player marker: white diamond with glow, updated in real-time
 *   - Proper cleanup on scene shutdown
 *
 * Depth: 200 (same layer as HUD elements, above pause menu at 199)
 */

/* ------------------------------------------------------------------ */
/*  Map data — world boundaries, sections, POIs                       */
/* ------------------------------------------------------------------ */

const SECTIONS = [
    { name: 'INTRO',        xStart: 0,    xEnd: 600,  explored: false },
    { name: 'ASCENT',       xStart: 600,  xEnd: 1100, explored: false },
    { name: 'SECRET',       xStart: 1024, xEnd: 1600, explored: false },
    { name: 'LOWER PATH',   xStart: 1100, xEnd: 1800, explored: false },
    { name: 'MID CORRIDOR', xStart: 1800, xEnd: 2800, explored: false },
    { name: 'PRE-BOSS',     xStart: 2800, xEnd: 3800, explored: false },
    { name: 'BOSS AREA',    xStart: 3800, xEnd: 4400, explored: false },
];

const POIS = [
    { x: 600,  y: 568, type: 'bench',  label: 'BENCH' },
    { x: 1800, y: 568, type: 'bench',  label: 'BENCH' },
    { x: 3000, y: 568, type: 'bench',  label: 'BENCH' },
    { x: 3850, y: 568, type: 'bench',  label: 'BENCH' },
    { x: 4000, y: 500, type: 'boss',   label: '??? BOSS' },
    { x: 1472, y: 159, type: 'secret', label: '??? SECRET' },
];

// Simplified platform positions (mirrored from GameScene for display only).
// { x, y } = top-left of the platform group; w = tile count.
const PLATFORM_DATA = [
    // Section 1: Intro
    { x: 320, y: 459, w: 3 },
    // Section 2: Ascent (staircase)
    { x: 576, y: 429, w: 2 },
    { x: 704, y: 359, w: 2 },
    { x: 832, y: 299, w: 2 },
    // Section 3: Secret alcove — upper branch
    { x: 1024, y: 239, w: 3 },
    { x: 1216, y: 189, w: 4 },
    { x: 1472, y: 159, w: 4 },
    // Section 3: Lower path
    { x: 1152, y: 459, w: 3 },
    { x: 1408, y: 369, w: 3 },
    { x: 1664, y: 429, w: 3 },
    // Section 4: Mid Corridor
    { x: 1920, y: 459, w: 3 },
    { x: 2112, y: 349, w: 3 },
    { x: 2368, y: 399, w: 4 },
    { x: 2624, y: 319, w: 3 },
    // Section 5: Pre-Boss Gauntlet
    { x: 2880, y: 429, w: 3 },
    { x: 3072, y: 359, w: 3 },
    { x: 3328, y: 409, w: 3 },
    { x: 3584, y: 319, w: 3 },
    // Section 6: Boss rest area
    { x: 3840, y: 429, w: 3 },
];

/* ================================================================== */
/*  MapView class                                                      */
/* ================================================================== */

class MapView {

    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.destroyed = false;

        // Deep-copy mutable section data
        this.sections = SECTIONS.map(s => ({ ...s }));
        this.pois = POIS;

        // World dimensions (must match GameScene)
        this.worldW = 4400;
        this.worldH = 600;

        // Screen-space map area
        this.mapX = 50;
        this.mapY = 200;
        this.mapW = 700;
        this.mapH = 200;

        // Root container — fixed to camera, rendered above game world
        this.container = scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(200)
            .setVisible(false);

        // Build all visual elements
        this._build();

        // Register keyboard input
        this._buildKeyboard();

        // Clean up on scene shutdown
        scene.events.once('shutdown', () => this.destroy());
    }

    /* ================================================================== */
    /*  VISUAL BUILDING                                                     */
    /* ================================================================== */

    _build() {
        // Background overlay (full-screen dark rectangle)
        this.bgOverlay = this.scene.add.graphics();
        this.bgOverlay.fillStyle(0x0a0a1a, 0.85);
        this.bgOverlay.fillRect(0, 0, 800, 600);
        this.container.add(this.bgOverlay);

        // Map content graphics (redrawn each time map opens)
        this.mapGfx = this.scene.add.graphics();
        this.container.add(this.mapGfx);

        // Player marker graphics (updated each frame when open)
        this.playerGfx = this.scene.add.graphics();
        this.container.add(this.playerGfx);

        // Dynamic labels (cleared and rebuilt on each open)
        this.labels = [];

        // Title
        const title = this.scene.add.text(400, 156, '\u25C6 MAP \u25C6', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#7FE0DE',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
        this.container.add(title);
        this.labels.push(title);
    }

    /* ================================================================== */
    /*  KEYBOARD INPUT                                                     */
    /* ================================================================== */

    _buildKeyboard() {
        this._toggleHandler = (event) => {
            if (this.destroyed) return;
            this.toggle();
            if (event) event.preventDefault();
        };

        this.scene.input.keyboard.on('keydown-M', this._toggleHandler);
    }

    /* ================================================================== */
    /*  OPEN / CLOSE                                                       */
    /* ================================================================== */

    toggle() {
        if (this.isOpen) {
            this._close();
        } else {
            this._open();
        }
    }

    _open() {
        if (this.destroyed) return;

        // Don't open if the pause menu is active
        if (this.scene.pauseMenu && this.scene.pauseMenu.isPaused) return;

        this.isOpen = true;

        // Pause game world
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.pause();
        }

        // Draw static map content
        this._drawMap();

        // Show container
        this.container.setVisible(true);
    }

    _close() {
        if (this.destroyed) return;

        this.isOpen = false;

        // Hide container immediately
        this.container.setVisible(false);

        // Clear dynamic labels
        this._clearLabels();

        // Resume game world
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.resume();
        }
    }

    /* ================================================================== */
    /*  UPDATE LOOP                                                        */
    /* ================================================================== */

    /**
     * Called by GameScene each frame.
     * Updates explored status and player marker position.
     *
     * @param {number} playerX - Player world X coordinate.
     * @param {number} playerY - Player world Y coordinate.
     */
    update(playerX, playerY) {
        // Always mark explored sections, even when map is closed
        this._markExplored(playerX);

        if (!this.isOpen || this.destroyed) return;

        // Update the player marker in real-time
        this._drawPlayer(playerX, playerY);
    }

    /**
     * Mark any section the player is currently inside as explored.
     * If a section transitions to explored, the map is redrawn.
     */
    _markExplored(playerX) {
        let changed = false;
        this.sections.forEach(s => {
            if (!s.explored && playerX >= s.xStart && playerX <= s.xEnd) {
                s.explored = true;
                changed = true;
            }
        });
        if (changed) {
            // Redraw section colours and labels
            this._redrawSections();
        }
    }

    /* ================================================================== */
    /*  MAP DRAWING                                                        */
    /* ================================================================== */

    /** Full redraw of all static map content (frame, sections, POIs, platforms). */
    _drawMap() {
        const g = this.mapGfx;
        g.clear();
        this._clearLabels();

        this._drawFrame(g);
        this._drawSectionsAndLabels(g);
        this._drawPlatforms(g);
        this._drawPOIs(g);
    }

    /** Redraw only the section colours (called when explored status changes). */
    _redrawSections() {
        // Remove existing section labels and redraw just the section layer
        const g = this.mapGfx;
        // Clear only the section content — we need to redraw sections and
        // their labels, but keep frame, platforms, and POIs intact.
        // The simplest approach is a full redraw.
        this._drawMap();
    }

    /* ------------------------------------------------------------------ */
    /*  Frame                                                              */
    /* ------------------------------------------------------------------ */

    _drawFrame(g) {
        // Outer glow panel
        g.fillStyle(0x0e0e24, 0.95);
        g.fillRoundedRect(
            this.mapX - 10, this.mapY - 14,
            this.mapW + 20, this.mapH + 34,
            8,
        );
        g.lineStyle(1.5, 0x2d3561, 0.6);
        g.strokeRoundedRect(
            this.mapX - 10, this.mapY - 14,
            this.mapW + 20, this.mapH + 34,
            8,
        );

        // Inner map area
        g.fillStyle(0x060612, 0.95);
        g.fillRect(this.mapX, this.mapY, this.mapW, this.mapH);
        g.lineStyle(1, 0x1a1a3e, 0.4);
        g.strokeRect(this.mapX, this.mapY, this.mapW, this.mapH);
    }

    /* ------------------------------------------------------------------ */
    /*  Sections                                                           */
    /* ------------------------------------------------------------------ */

    _drawSectionsAndLabels(g) {
        // Draw each section's fill and border
        this.sections.forEach(s => {
            const sx = this.mapX + (s.xStart / this.worldW) * this.mapW;
            const sw = ((s.xEnd - s.xStart) / this.worldW) * this.mapW;

            // Fill — explored sections are brighter
            if (s.explored) {
                g.fillStyle(0x2d3561, 0.55);
            } else {
                g.fillStyle(0x0e0e24, 0.90);
            }
            g.fillRect(sx, this.mapY, sw, this.mapH);

            // Subtle border between adjacent sections
            g.lineStyle(1, 0x1a1a3e, 0.30);
            g.strokeRect(sx, this.mapY, sw, this.mapH);
        });

        // Section dividers (vertical lines at every boundary)
        const boundaryXPositions = [];
        this.sections.forEach(s => boundaryXPositions.push(s.xStart));
        boundaryXPositions.push(4400); // rightmost world edge

        boundaryXPositions.forEach(xWorld => {
            const sx = this.mapX + (xWorld / this.worldW) * this.mapW;
            g.lineStyle(1, 0x2d3561, 0.40);
            g.lineBetween(sx, this.mapY, sx, this.mapY + this.mapH);
        });

        // Section name labels above the map
        this.sections.forEach(s => {
            const cx = this.mapX + ((s.xStart + s.xEnd) / 2 / this.worldW) * this.mapW;
            const label = this.scene.add.text(cx, this.mapY - 6, s.name, {
                fontSize: '8px',
                fontFamily: 'monospace',
                color: s.explored ? '#a8d8ff' : '#3a4a6a',
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(201);
            this.container.add(label);
            this.labels.push(label);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Platforms (simplified)                                             */
    /* ------------------------------------------------------------------ */

    _drawPlatforms(g) {
        g.fillStyle(0x2d3561, 0.35);

        PLATFORM_DATA.forEach(p => {
            const platW = p.w * 64;
            const platH = 36;
            const px = this.mapX + (p.x / this.worldW) * this.mapW;
            const py = this.mapY + (p.y / this.worldH) * this.mapH;
            const pw = Math.max((platW / this.worldW) * this.mapW, 1.5);
            const ph = Math.max((platH / this.worldH) * this.mapH, 1.5);
            g.fillRect(px, py, pw, ph);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Points of Interest                                                 */
    /* ------------------------------------------------------------------ */

    _drawPOIs(g) {
        this.pois.forEach(poi => {
            const px = this.mapX + (poi.x / this.worldW) * this.mapW;
            const py = this.mapY + (poi.y / this.worldH) * this.mapH;

            let color;
            switch (poi.type) {
                case 'bench':  color = 0x00ffcc; break;
                case 'boss':   color = 0xff4444; break;
                case 'secret': color = 0xFF87A0; break;
                default:       color = 0xffffff; break;
            }

            // Outer glow ring
            g.fillStyle(color, 0.15);
            g.fillCircle(px, py, 6);

            // Inner dot
            g.fillStyle(color, 1);
            g.fillCircle(px, py, 3);

            // Label below the dot
            const colorHex = '#' + color.toString(16).padStart(6, '0');
            const label = this.scene.add.text(px, py - 7, poi.label, {
                fontSize: '7px',
                fontFamily: 'monospace',
                color: colorHex,
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(201);
            this.container.add(label);
            this.labels.push(label);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Player marker (redrawn every frame)                                */
    /* ------------------------------------------------------------------ */

    _drawPlayer(playerX, playerY) {
        const g = this.playerGfx;
        g.clear();

        const px = this.mapX + (playerX / this.worldW) * this.mapW;
        const py = this.mapY + (playerY / this.worldH) * this.mapH;

        // Clamp to map bounds
        const clampedX = Phaser.Math.Clamp(px, this.mapX, this.mapX + this.mapW);
        const clampedY = Phaser.Math.Clamp(py, this.mapY, this.mapY + this.mapH);

        // Outer glow
        g.fillStyle(0xffffff, 0.15);
        g.fillCircle(clampedX, clampedY, 8);

        // Diamond shape (two overlaid triangles)
        const d = 5; // half-size
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(clampedX, clampedY - d, clampedX - d, clampedY, clampedX + d, clampedY);
        g.fillTriangle(clampedX, clampedY + d, clampedX - d, clampedY, clampedX + d, clampedY);

        // Bright centre dot
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(clampedX, clampedY, 1.5);
    }

    /* ================================================================== */
    /*  HELPERS                                                            */
    /* ================================================================== */

    _clearLabels() {
        this.labels.forEach(l => l.destroy());
        this.labels = [];
    }

    /* ================================================================== */
    /*  CLEANUP                                                            */
    /* ================================================================== */

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.isOpen = false;

        // Remove keyboard listeners
        const kb = this.scene.input.keyboard;
        if (kb) {
            kb.off('keydown-M', this._toggleHandler);
        }

        // Clear dynamic labels
        this._clearLabels();

        // Destroy the entire container tree
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        // Null out references
        this.bgOverlay = null;
        this.mapGfx = null;
        this.playerGfx = null;
        this.sections = null;
        this.pois = null;
    }
}
