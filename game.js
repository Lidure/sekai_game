class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            '🎮 游戏加载成功！\n（这里将是你类银河恶魔城的起点）',
            { fontSize: '32px', fill: '#fff', align: 'center' }
        ).setOrigin(0.5);

        console.log('游戏引擎已启动！');
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [BootScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);