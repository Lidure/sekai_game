class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // ── Images ────────────────────────────────────────────────────
        // Player textures from player_mfy (dedicated player character)
        this.load.image('player_idle',   'assets/images/player_mfy/mfy1.png');
        this.load.image('player_att1',   'assets/images/player_mfy/mfy_att1.png');
        this.load.image('player_att2',   'assets/images/player_mfy/mfy_att2.png');
        // Sword attack textures (unlocked via ability pickup)
        this.load.image('player_sword_1', 'assets/images/player_mfy/mfy_sword_1.png');
        this.load.image('player_sword_2', 'assets/images/player_mfy/mfy_sword_2.png');
        this.load.image('player_sword_3', 'assets/images/player_mfy/mfy_sword_3.png');
        this.load.image('player_sword_4', 'assets/images/player_mfy/mfy_sword_4.png');
        this.load.image('player_sword_5', 'assets/images/player_mfy/mfy_sword_5.png');
        this.load.image('item_sword',   'assets/images/weapon_sword.png');
        this.load.image('player_down',   'assets/images/player_mfy/mfy_down.png');
        this.load.image('player_jump',   'assets/images/player_mfy/mfy_jump.png');

        // Player run spritesheet (6 columns × 5 rows, 720×720 each — frames 0-10 for 11-frame cycle)
        this.load.spritesheet('player_run_sheet', 'assets/images/player_mfy/mfy_run.png', {
            frameWidth: 720,
            frameHeight: 720,
        });

        // Boss2 (Mafuyu) textures from boss2_mfy (dedicated boss — NOT shared with player)
        this.load.image('boss_idle',        'assets/images/boss2_mfy/boss_idle.png');
        this.load.image('boss_attack',      'assets/images/boss2_mfy/boss_attack.png');
        this.load.image('boss_dash',        'assets/images/boss2_mfy/boss_dash.png');
        this.load.image('boss_liberation',  'assets/images/boss2_mfy/boss_liberate.png');
        this.load.image('boss_cower',       'assets/images/boss2_mfy/boss_cower.png');

        // Boss1 (Miku) — reserved, not yet implemented

        // ── Enemy textures (real pixel art — replaces programmatic generation) ──
        this.load.image('enemy_shadow', 'assets/images/enemies/common/dark_forest_slime/Enemy_Forest_Idle_01.png');
        this.load.image('enemy_shard',  'assets/images/enemies/floating/ghost_gothicvania/Ghost1.png');
        this.load.image('enemy_bat',    'assets/images/enemies/floating/bat/Bat_Full.png');
        this.load.spritesheet('enemy_skeleton', 'assets/images/enemies/shadow/skeleton/skeleton-Sheet.png', { frameWidth: 48, frameHeight: 56 });

        // ── Audio ─────────────────────────────────────────────────────
        // BGM
        this.load.audio('bgm_menu',      'assets/audio/bgm/menu_title.mp3');
        this.load.audio('bgm_explore',   'assets/audio/bgm/chiptune_exploration.mp3');
        this.load.audio('bgm_boss_p1',   'assets/audio/bgm/8bit_action_boss_battle_bpm145.mp3');
        this.load.audio('bgm_boss_p2',   'assets/audio/bgm/8bit_action_boss_battle_climax_bpm185.mp3');

        // Player SFX
        this.load.audio('sfx_player_jump',  'assets/audio/sfx/player/sfx_player_jump_01.wav');
        this.load.audio('sfx_player_hurt',  'assets/audio/sfx/player/sfx_player_hurt_01.wav');
        this.load.audio('sfx_player_death', 'assets/audio/sfx/player/player_death.mp3');
        this.load.audio('sfx_player_dash',  'assets/audio/sfx/magic/magic_spell_fast.mp3');

        // Weapon SFX
        this.load.audio('sfx_sword_att1', 'assets/audio/sfx/sword/sword_synth_shing.mp3');
        this.load.audio('sfx_sword_att2', 'assets/audio/sfx/sword/sword_attack.mp3');
        this.load.audio('sfx_sword_air',  'assets/audio/sfx/sword/slash_rpg.mp3');

        // Enemy SFX
        this.load.audio('sfx_enemy_hurt',  'assets/audio/sfx/enemy/sfx_enemy_hurt_01.wav');
        this.load.audio('sfx_enemy_death', 'assets/audio/sfx/enemy/sfx_enemy_death_01.wav');
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

        // Player run animation (frames 6-23 = middle 18 frames of run cycle, from 5×6 spritesheet)
        this.anims.create({
            key: 'player_run',
            frames: this.anims.generateFrameNumbers('player_run_sheet', { start: 6, end: 20 }),
            frameRate: 18,
            repeat: -1,
        });

        // Sword attack animation (5 single-image frames at 12fps — ~417ms total swing)
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

        // Item textures (collectible pickups)
        this._generateItemTextures();

        // Vanish textures (player death animation — dissipating ghost silhouette)
        this._generateVanishTextures();

        this.scene.start('MenuScene');
    }

    /* _generateEnemyTextures() removed — enemy textures now loaded as real
     * pixel art assets in preload(). See enemy_shadow (dark_forest_slime)
     * and enemy_shard (ghost_gothicvania) image loads above. */

    /** Generate programmatic textures for collectible items. */
    _generateItemTextures() {
        // ── HP Fragment: pink heart crystal (16×16) ──────────────────────
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

        // ── Feelings Shard: teal diamond (16×16) ─────────────────────────
        const fl = this.make.graphics({ add: false });
        fl.fillStyle(0x2EC4B6, 1);
        fl.fillTriangle(8, 0, 0, 8, 8, 16);
        fl.fillTriangle(8, 0, 16, 8, 8, 16);
        fl.fillStyle(0x5AE0D0, 1);
        fl.fillTriangle(8, 2, 2, 8, 8, 14);
        fl.generateTexture('item_feelings_shard', 16, 16);
        fl.destroy();

        // ── Health Orb: white circle with cross (16×16) ──────────────────
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
        const S = 720; // match player texture size so body config stays valid
        const cx = S / 2; // 360
        const white = 0xCCCCFF;
        const white2 = 0xEEEEFF;
        const white3 = 0xFFFFFF;

        // Vanish 1: Full ghostly humanoid silhouette (solid, bright)
        let g = this.make.graphics({ add: false });
        g.fillStyle(white3, 0.9);
        g.fillCircle(cx, 140, 55);           // head
        g.fillRect(cx - 42, 200, 84, 180);    // torso
        g.fillRect(cx - 105, 200, 60, 28);    // left arm
        g.fillRect(cx + 45, 200, 60, 28);     // right arm
        g.fillRect(cx - 38, 380, 32, 100);    // left leg
        g.fillRect(cx + 6, 380, 32, 100);     // right leg
        g.generateTexture('player_vanish1', S, S);
        g.destroy();

        // Vanish 2: Figure partially dissolved — narrower torso, fewer parts
        g = this.make.graphics({ add: false });
        g.fillStyle(white2, 0.65);
        g.fillCircle(cx, 140, 48);           // head (slightly smaller)
        g.fillRect(cx - 35, 205, 70, 140);    // torso (narrower, shorter)
        g.fillRect(cx + 45, 200, 55, 24);     // right arm only
        g.fillRect(cx - 36, 380, 28, 90);     // left leg
        g.fillRect(cx + 8, 385, 28, 85);      // right leg (offset)
        g.generateTexture('player_vanish2', S, S);
        g.destroy();

        // Vanish 3: Barely visible fragments — just head + torso ghost
        g = this.make.graphics({ add: false });
        g.fillStyle(white, 0.35);
        g.fillCircle(cx, 140, 38);            // head (ghostly)
        g.fillRect(cx - 24, 210, 48, 70);     // upper torso fragment
        g.fillStyle(white, 0.2);
        g.fillRect(cx - 28, 295, 18, 50);     // lower body fragment
        g.fillRect(cx + 10, 315, 18, 40);
        g.generateTexture('player_vanish3', S, S);
        g.destroy();
    }
}
