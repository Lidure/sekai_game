class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 鈹€鈹€ Images 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
        // Player textures from player_mfy (dedicated player character)
        this.load.image('player_idle',   'assets/images/player_mfy/mfy1.png');
        // Raw attack spritesheet (256x256 frames, 4x2 grid, resized to 64x64 in create())
        this.load.image('player_att_raw', 'assets/images/player_mfy/mfy_att.png');
        // Dash spritesheet (16脳4 = 64 frames at 64脳64)
        this.load.image('player_dash_raw', 'assets/images/player_mfy/mfy_dash.png');
        // Sword attack textures (unlocked via ability pickup)
        this.load.image('player_sword_1', 'assets/images/player_mfy/mfy_sword_1.png');
        this.load.image('player_sword_2', 'assets/images/player_mfy/mfy_sword_2.png');
        this.load.image('player_sword_3', 'assets/images/player_mfy/mfy_sword_3.png');
        this.load.image('player_sword_4', 'assets/images/player_mfy/mfy_sword_4.png');
        this.load.image('player_sword_5', 'assets/images/player_mfy/mfy_sword_5.png');
        this.load.image('item_sword',   'assets/images/weapon_sword.png');
        this.load.image('player_down',   'assets/images/player_mfy/mfy_down.png');
        this.load.image('player_jump',   'assets/images/player_mfy/mfy_jump.png');

        // Player run spritesheet (6 columns 脳 5 rows, 720脳720 each 鈥?frames 0-10 for 11-frame cycle)
        this.load.spritesheet('player_run_sheet', 'assets/images/player_mfy/mfy_run.png', {
            frameWidth: 720,
            frameHeight: 720,
        });

        // Boss2 (Mafuyu) textures from boss2_mfy (dedicated boss 鈥?NOT shared with player)
        this.load.image('boss_idle',        'assets/images/boss2_mfy/boss_idle.png');
        this.load.image('boss_attack',      'assets/images/boss2_mfy/boss_attack.png');
        this.load.image('boss_dash',        'assets/images/boss2_mfy/boss_dash.png');
        this.load.image('boss_liberation',  'assets/images/boss2_mfy/boss_liberate.png');
        this.load.image('boss_cower',       'assets/images/boss2_mfy/boss_cower.png');

        // Boss1 (Miku) 鈥?reserved, not yet implemented

        this.load.image('broken_seikai_bg', 'assets/游戏素材/broken_seikai.png');

        // 鈹€鈹€ Zone ground tiles (replaces programmatic generation with Kenney composites) 鈹€鈹€
        this.load.image('ground_intro',    'assets/images/tiles/ground_intro.png');
        this.load.image('ground_ascent',   'assets/images/tiles/ground_ascent.png');
        this.load.image('ground_secret',   'assets/images/tiles/ground_secret.png');
        this.load.image('ground_lower',    'assets/images/tiles/ground_lower.png');
        this.load.image('ground_mid',      'assets/images/tiles/ground_mid.png');
        this.load.image('ground_preboss',  'assets/images/tiles/ground_preboss.png');
        this.load.image('ground_boss',     'assets/images/tiles/ground_boss.png');

        // ═══ Tilemap JSON files (one per room) ═══
        this.load.tilemapTiledJSON('room_intro',    'assets/maps/intro.tmj');
        this.load.tilemapTiledJSON('room_ascent',   'assets/maps/ascent.tmj');
        this.load.tilemapTiledJSON('room_secret',   'assets/maps/secret.tmj');
        this.load.tilemapTiledJSON('room_lower',    'assets/maps/lower.tmj');
        this.load.tilemapTiledJSON('room_mid',      'assets/maps/mid.tmj');
        this.load.tilemapTiledJSON('room_shaft',    'assets/maps/shaft.tmj');
        this.load.tilemapTiledJSON('room_preboss',  'assets/maps/preboss.tmj');
        this.load.tilemapTiledJSON('room_boss',     'assets/maps/boss.tmj');

        // 鈹€鈹€ Cave parallax backgrounds (replaces programmatic bg_far/bg_mid/bg_near) 鈹€鈹€
        this.load.image('bg_far',  'assets/images/backgrounds/cave_bg_far.png');
        this.load.image('bg_mid',  'assets/images/backgrounds/cave_bg_mid.png');
        this.load.image('bg_near', 'assets/images/backgrounds/cave_bg_near.png');

        // 鈹€鈹€ Warped-caves decoration props 鈹€鈹€
        this.load.image('deco_stalactite', 'assets/images/decorations/deco_stalactite.png');

        // 鈹€鈹€ Enemy textures (real pixel art 鈥?replaces programmatic generation) 鈹€鈹€
        this.load.image('enemy_shadow', 'assets/images/enemies/common/dark_forest_slime/Enemy_Forest_Idle_01.png');
        this.load.image('enemy_shard',  'assets/images/enemies/floating/ghost_gothicvania/Ghost1.png');
        this.load.image('enemy_bat',    'assets/images/enemies/floating/bat/Bat_Full.png');
        this.load.spritesheet('enemy_skeleton', 'assets/images/enemies/shadow/skeleton/skeleton-Sheet.png', { frameWidth: 48, frameHeight: 56 });

        // 鈹€鈹€ Audio 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
        // BGM
        this.load.audio('bgm_menu',      'assets/audio/bgm/menu_title.mp3');
        this.load.audio('bgm_explore',   'assets/audio/bgm/chiptune_exploration.mp3');
        this.load.audio('bgm_boss_p1',   'assets/audio/bgm/8bit_action_boss_battle_bpm145.mp3');
        this.load.audio('bgm_boss_p2',   'assets/audio/bgm/8bit_action_boss_battle_climax_bpm185.mp3');
        this.load.audio('bgm_credits',   'assets/audio/bgm/credits.mp3');

        // Player SFX
        this.load.audio('sfx_player_jump',  'assets/audio/sfx/player/sfx_player_jump_01.wav');
        this.load.audio('sfx_player_hurt',  'assets/audio/sfx/player/sfx_player_hurt_01.wav');
        this.load.audio('sfx_player_death', 'assets/audio/sfx/player/player_death.mp3');
        this.load.audio('sfx_player_dash',  'assets/audio/sfx/magic/magic_spell_fast.mp3');

        // Weapon SFX
        this.load.audio('sfx_sword_att1', 'assets/audio/sfx/sword/sword_synth_shing.mp3');
        this.load.audio('sfx_sword_att2', 'assets/audio/sfx/sword/sword_attack.mp3');
        this.load.audio('sfx_sword_air',  'assets/audio/sfx/sword/slash_rpg.mp3');
        this.load.audio('sfx_punch',      'assets/audio/sfx/enemy/sfx_enemy_hurt_01.wav');
        this.load.audio('sfx_sword_swing','assets/audio/sfx/sword/sfx_sword_blade_01.mp3');

        // Enemy SFX
        this.load.audio('sfx_enemy_hurt',  'assets/audio/sfx/enemy/sfx_enemy_hurt_01.wav');
        this.load.audio('sfx_enemy_death', 'assets/audio/sfx/enemy/sfx_enemy_death_01.wav');
        this.load.audio('sfx_enemy_attack','assets/audio/sfx/enemy/sfx_enemy_laser_01.mp3');
        this.load.audio('sfx_boss_hit',    'assets/audio/sfx/enemy/sfx_enemy_metal_hit_01.mp3');
        this.load.audio('sfx_boss_roar',   'assets/audio/sfx/enemy/sfx_enemy_roar_01.mp3');
        this.load.audio('sfx_boss_death',  'assets/audio/sfx/enemy/sfx_enemy_death_02.mp3');

        // UI SFX
        this.load.audio('sfx_ui_navigate', 'assets/audio/sfx/ui/sfx_ui_navigate_01.wav');
        this.load.audio('sfx_ui_confirm',  'assets/audio/sfx/ui/sfx_ui_confirm_01.wav');
        this.load.audio('sfx_ui_start',    'assets/audio/sfx/ui/menu_select.mp3');

        // Combo / Feelings SFX
        this.load.audio('sfx_combo_hit',     'assets/audio/sfx/combo/sfx_combo_resonance_01.wav');
        this.load.audio('sfx_combo_feelings','assets/audio/sfx/combo/sfx_combo_feelings_01.mp3');
        this.load.audio('sfx_combo_victory', 'assets/audio/sfx/combo/sfx_combo_powerup_01.mp3');
    }

    create() {
        // NOTE: zone ground tiles, cave backgrounds, and deco_stalactite are loaded
        // in preload() as real image assets — no longer programmatic.
        // Crystal, torch, and vine are still generated below.
        this._generateDecorationTextures();
        this._generateLegacyTextures();

        // 鈹€鈹€ Resize all 720脳720 player textures to 64脳64 鈹€鈹€
        const targetSize = 64;
        const resizeTo64 = (key) => {
            const src = this.textures.get(key).getSourceImage();
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(src, 0, 0, targetSize, targetSize);
            this.textures.remove(key);
            this.textures.addCanvas(key, canvas);
        };

        // Single-frame textures
        ['player_idle', 'player_jump', 'player_down',
         'player_sword_1', 'player_sword_2', 'player_sword_3', 'player_sword_4', 'player_sword_5'
        ].forEach(resizeTo64);

        // Extract attack frames from 256x256 spritesheet, resize to 64x64
        const attSrc = this.textures.get('player_att_raw').getSourceImage();
        const srcFrameSize = 256;
        const dstFrameSize = 64;
        const attCols = 4;
        const frameCount = 7;

        for (let i = 0; i < frameCount; i++) {
            const sx = (i % attCols) * srcFrameSize;
            const sy = Math.floor(i / attCols) * srcFrameSize;
            const canvas = document.createElement('canvas');
            canvas.width = dstFrameSize;
            canvas.height = dstFrameSize;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(attSrc, sx, sy, srcFrameSize, srcFrameSize, 0, 0, dstFrameSize, dstFrameSize);
            this.textures.addCanvas('player_att_frame_' + i, canvas);
        }

        // 鈹€鈹€ Extract run spritesheet frames at 64脳64 鈹€鈹€
        const runSrc = this.textures.get('player_run_sheet').getSourceImage();
        const runCols = 6;
        const runFrameSize = 720;
        for (let i = 0; i < 30; i++) {
            const col = i % runCols;
            const row = Math.floor(i / runCols);
            const sx = col * runFrameSize;
            const sy = row * runFrameSize;
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(runSrc, sx, sy, runFrameSize, runFrameSize, 0, 0, targetSize, targetSize);
            this.textures.addCanvas('player_run_frame_' + i, canvas);
        }
        this.textures.remove('player_run_sheet');

        // Extract dash spritesheet: 1x4 grid, 256x256 per frame, resize to 64x64
        const dashSrc = this.textures.get('player_dash_raw').getSourceImage();
        const dashSrcFrameSize = 256;
        const dashDstFrameSize = 64;
        const dashFrameCount = 4;
        for (let i = 0; i < dashFrameCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = dashDstFrameSize;
            canvas.height = dashDstFrameSize;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(dashSrc, i * dashSrcFrameSize, 0, dashSrcFrameSize, dashSrcFrameSize, 0, 0, dashDstFrameSize, dashDstFrameSize);
            this.textures.addCanvas('player_dash_frame_' + i, canvas);
        }
        this.textures.remove('player_dash_raw');

        // Player run animation (frames 6-20 = 15 frames of run cycle)
        this.anims.create({
            key: 'player_run',
            frames: Array.from({length: 15}, (_, i) => ({key: 'player_run_frame_' + (i + 6)})),
            frameRate: 18,
            repeat: -1,
        });

        // Attack1 animation (frames 0-3 at 12fps 鈥?~333ms)
        this.anims.create({
            key: 'player_att1',
            frames: [
                { key: 'player_att_frame_0' },
                { key: 'player_att_frame_1' },
                { key: 'player_att_frame_2' },
                { key: 'player_att_frame_3' },
            ],
            frameRate: 12,
            repeat: 0,
        });

        // Attack2 animation (frames 4-6 at 10fps 鈥?~300ms)
        this.anims.create({
            key: 'player_att2',
            frames: [
                { key: 'player_att_frame_4' },
                { key: 'player_att_frame_5' },
                { key: 'player_att_frame_6' },
            ],
            frameRate: 10,
            repeat: 0,
        });

        // Sword attack animation (5 single-image frames at 12fps 鈥?~417ms total swing)
        this.anims.create({
            key: 'player_sword_attack',
            frames: [
                { key: 'player_sword_1' },
                { key: 'player_sword_2' },
                { key: 'player_sword_3' },
                { key: 'player_sword_4' },
                { key: 'player_sword_5' },
            ],
            frameRate: 12,
            repeat: 0,
        });

        // Dash animation: 4 frames from 1x4 spritesheet
        this.anims.create({
            key: 'player_dash',
            frames: [
                { key: 'player_dash_frame_0' },
                { key: 'player_dash_frame_1' },
                { key: 'player_dash_frame_2' },
                { key: 'player_dash_frame_3' },
            ],
            frameRate: 15,
            repeat: 0,
        });

        // Sword air attack animation (sword_3, sword_4, sword_5 as a fast 3-frame animation)
        this.anims.create({
            key: 'player_sword_air_attack',
            frames: [
                { key: 'player_sword_3' },
                { key: 'player_sword_4' },
                { key: 'player_sword_5' },
            ],
            frameRate: 10,
            repeat: 0,
        });

        // Free raw spritesheet memory (extracted frames remain)
        this.textures.remove('player_att_raw');

        // Skeleton sheet has a solid background in the source asset. Convert the
        // frames we actually use into transparent textures so the enemy renders
        // as sprite art instead of a colored square.
        this._generateSkeletonTextures();
        this.textures.remove('enemy_skeleton');

        // Item textures (collectible pickups)
        this._generateItemTextures();

        // Vanish textures (player death animation 鈥?dissipating ghost silhouette)
        this._generateVanishTextures();

        this.scene.start('MenuScene');
    }

    /* _generateEnemyTextures() removed 鈥?enemy textures now loaded as real
     * pixel art assets in preload(). See enemy_shadow (dark_forest_slime)
     * and enemy_shard (ghost_gothicvania) image loads above. */

    _generateDecorationTextures() {
        let g;

        // deco_stalactite is now loaded from assets/images/decorations/deco_stalactite.png

        g = this.make.graphics({ add: false });
        g.fillStyle(0x7fe0de, 0.6);
        g.fillTriangle(6, 0, 0, 8, 6, 16);
        g.fillTriangle(6, 0, 12, 8, 6, 16);
        g.fillStyle(0x5ae0d0, 0.3);
        g.fillCircle(6, 8, 3);
        g.generateTexture('deco_crystal', 12, 16);
        g.destroy();

        g = this.make.graphics({ add: false });
        g.fillStyle(0x3a2a1a);
        g.fillRect(2, 6, 4, 10);
        g.fillStyle(0xff6633, 0.8);
        g.fillCircle(4, 3, 3);
        g.fillStyle(0xffaa44, 0.5);
        g.fillCircle(4, 3, 2);
        g.generateTexture('deco_torch', 8, 16);
        g.destroy();

        g = this.make.graphics({ add: false });
        g.fillStyle(0x3a5a4a, 0.5);
        g.fillRect(0, 0, 3, 24);
        g.fillStyle(0x4a6a5a, 0.3);
        g.fillRect(1, 0, 1, 24);
        g.generateTexture('deco_vine', 3, 24);
        g.destroy();
    }

    _generateLegacyTextures() {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x555555);
        g.fillRect(0, 0, 64, 34);
        g.fillStyle(0x777777);
        g.fillRect(0, 0, 64, 4);
        g.fillStyle(0x444444);
        g.fillRect(0, 34, 64, 2);
        g.fillStyle(0x333333);
        for (let i = 4; i < 64; i += 12) {
            g.fillRect(i, 6, 2, 2);
            g.fillRect(i + 6, 10, 2, 2);
            g.fillRect(i + 3, 20, 2, 2);
            g.fillRect(i + 9, 28, 2, 2);
        }
        g.generateTexture('ground', 64, 36);
        g.destroy();

        const bg = this.make.graphics({ add: false });
        bg.fillStyle(0x0a0a1a);
        bg.fillRect(0, 0, 64, 64);
        bg.fillStyle(0x0e0e24);
        for (let i = 0; i < 64; i += 16) {
            for (let j = 0; j < 64; j += 16) {
                if ((i / 16 + j / 16) % 2 === 0) {
                    bg.fillRect(i, j, 16, 16);
                }
            }
        }
        bg.generateTexture('bg_tile', 64, 64);
        bg.destroy();
    }

    /**
     * Convert selected skeleton sheet frames into transparent textures.
     * The source PNG uses a flat purple background, so we key that color out
     * and keep only the actual sprite pixels.
     */
    _generateSkeletonTextures() {
        const src = this.textures.get('enemy_skeleton').getSourceImage();
        const frameWidth = 48;
        const frameHeight = 56;
        const sheetCols = 8;

        const makeFrame = (frameIndex, textureKey) => {
            const sx = (frameIndex % sheetCols) * frameWidth;
            const sy = Math.floor(frameIndex / sheetCols) * frameHeight;

            const canvas = document.createElement('canvas');
            canvas.width = frameWidth;
            canvas.height = frameHeight;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(src, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

            const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
            const data = imageData.data;
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            for (let i = 0; i < data.length; i += 4) {
                if (data[i] === bgR && data[i + 1] === bgG && data[i + 2] === bgB) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            this.textures.addCanvas(textureKey, canvas);
        };

        makeFrame(0, 'enemy_skeleton_idle');
        makeFrame(3, 'enemy_skeleton_windup');
        makeFrame(6, 'enemy_skeleton_swing');
    }

    /** Generate programmatic textures for collectible items. */
    _generateItemTextures() {
        // 鈹€鈹€ HP Fragment: pink heart crystal (16脳16) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
        const hp = this.make.graphics({ add: false });
        hp.fillStyle(0xFF87A0, 1);
        // Heart shape using rectangles
        hp.fillRect(4, 3, 2, 2);
        hp.fillRect(10, 3, 2, 2);
        hp.fillRect(3, 5, 10, 6);
        hp.fillRect(5, 11, 6, 2);
        hp.fillRect(6, 13, 4, 1);
        hp.fillStyle(0xFFA8C0, 1);
        hp.fillRect(4, 5, 4, 2);
        hp.fillRect(5, 3, 2, 2);
        hp.generateTexture('item_hp_fragment', 16, 16);
        hp.destroy();

        // 鈹€鈹€ Feelings Shard: teal diamond (16脳16) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
        const fl = this.make.graphics({ add: false });
        fl.fillStyle(0x2EC4B6, 1);
        fl.fillTriangle(8, 0, 0, 8, 8, 16);
        fl.fillTriangle(8, 0, 16, 8, 8, 16);
        fl.fillStyle(0x5AE0D0, 1);
        fl.fillTriangle(8, 2, 2, 8, 8, 14);
        fl.generateTexture('item_feelings_shard', 16, 16);
        fl.destroy();

        // 鈹€鈹€ Health Orb: white circle with cross (16脳16) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
        const h = this.make.graphics({ add: false });
        h.fillStyle(0xa8d8ff, 1);
        h.fillCircle(8, 8, 7);
        h.fillStyle(0xffffff, 1);
        h.fillRect(6, 3, 4, 10);
        h.fillRect(3, 6, 10, 4);
        h.generateTexture('item_health_orb', 16, 16);
        h.destroy();
    }

    /** Generate programmatic vanish textures for player death animation. */
    _generateVanishTextures() {
        const S = 64;
        const cx = S / 2; // 32
        const white = 0xCCCCFF;
        const white2 = 0xEEEEFF;
        const white3 = 0xFFFFFF;

        // Vanish 1: Full ghostly silhouette (solid, bright)
        let g = this.make.graphics({ add: false });
        g.fillStyle(white3, 0.9);
        g.fillCircle(cx, 12, 5);         // head
        g.fillRect(cx - 7, 18, 14, 16);   // torso
        g.fillRect(cx - 14, 18, 6, 3);    // left arm
        g.fillRect(cx + 8, 18, 6, 3);     // right arm
        g.fillRect(cx - 6, 34, 5, 9);     // left leg
        g.fillRect(cx + 1, 34, 5, 9);     // right leg
        g.generateTexture('player_vanish1', S, S);
        g.destroy();

        // Vanish 2: Partially dissolved
        g = this.make.graphics({ add: false });
        g.fillStyle(white2, 0.65);
        g.fillCircle(cx, 12, 4);          // head (slightly smaller)
        g.fillRect(cx - 5, 18, 10, 12);   // torso (narrower)
        g.fillRect(cx - 14, 18, 5, 2);    // left arm
        g.fillRect(cx + 9, 18, 5, 2);     // right arm
        g.fillRect(cx - 5, 34, 4, 8);     // left leg
        g.fillRect(cx + 1, 34, 4, 8);     // right leg
        g.generateTexture('player_vanish2', S, S);
        g.destroy();

        // Vanish 3: Barely visible fragments
        g = this.make.graphics({ add: false });
        g.fillStyle(white, 0.35);
        g.fillCircle(cx, 12, 3);          // head (ghostly)
        g.fillRect(cx - 4, 18, 8, 6);     // upper torso fragment
        g.fillStyle(white, 0.2);
        g.fillRect(cx - 5, 26, 4, 4);     // lower body fragment
        g.fillRect(cx + 1, 28, 4, 3);
        g.generateTexture('player_vanish3', S, S);
        g.destroy();
    }
}

