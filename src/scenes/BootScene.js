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
        this.load.image('player_down',   'assets/images/player_mfy/mfy_down.png');
        this.load.image('player_jump',   'assets/images/player_mfy/mfy_jump.png');

        // Player run frames (11-frame cycle from player_mfy)
        for (let i = 1; i <= 11; i++) {
            this.load.image('player_run' + i, 'assets/images/player_mfy/mfy_run' + i + '.png');
        }

        // Boss2 (Mafuyu) textures from boss2_mfy (dedicated boss — NOT shared with player)
        this.load.image('boss_idle',        'assets/images/boss2_mfy/boss_idle.png');
        this.load.image('boss_attack',      'assets/images/boss2_mfy/boss_attack.png');
        this.load.image('boss_dash',        'assets/images/boss2_mfy/boss_dash.png');
        this.load.image('boss_liberation',  'assets/images/boss2_mfy/boss_liberate.png');
        this.load.image('boss_cower',       'assets/images/boss2_mfy/boss_cower.png');

        // Boss1 (Miku) — reserved, not yet implemented

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

        // Enemy textures (programmatic — no art assets needed)
        this._generateEnemyTextures();

        // Player run animation (11-frame cycle from boss_run1~11 assets)
        this.anims.create({
            key: 'player_run',
            frames: [
                { key: 'player_run1' }, { key: 'player_run2' }, { key: 'player_run3' },
                { key: 'player_run4' }, { key: 'player_run5' }, { key: 'player_run6' },
                { key: 'player_run7' }, { key: 'player_run8' }, { key: 'player_run9' },
                { key: 'player_run10' }, { key: 'player_run11' },
            ],
            frameRate: 16.7,
            repeat: -1,
        });

        this.scene.start('MenuScene');
    }

    _generateEnemyTextures() {
        // Shadow Fragment: dark blob with teal eyes (24x24)
        const sg = this.make.graphics({ add: false });
        sg.fillStyle(0x1a1a3e, 0.85);
        sg.fillCircle(12, 10, 10);
        sg.fillStyle(0x40d0c0, 0.9);
        sg.fillCircle(8, 8, 2);
        sg.fillCircle(16, 8, 2);
        sg.generateTexture('enemy_shadow', 24, 24);
        sg.destroy();

        // Floating Shard: purple crystal triangle (16x16)
        const sh = this.make.graphics({ add: false });
        sh.fillStyle(0x7b52c0, 0.9);
        sh.fillTriangle(8, 0, 0, 16, 16, 16);
        sh.fillStyle(0x9966ff, 0.6);
        sh.fillTriangle(8, 4, 3, 14, 13, 14);
        sh.generateTexture('enemy_shard', 16, 16);
        sh.destroy();
    }
}
