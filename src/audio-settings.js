const AUDIO_SETTINGS_STORAGE_KEY = 'sekai_audio_settings';

const AudioSettings = {
    _state: {
        master: 1,
        bgm: 0.75,
        sfx: 0.85,
    },
    _patched: false,

    init() {
        this._load();
        this._patchSoundManagers();
    },

    _load() {
        try {
            const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                ['master', 'bgm', 'sfx'].forEach((key) => {
                    if (typeof parsed[key] === 'number') {
                        this._state[key] = Phaser.Math.Clamp(parsed[key], 0, 1);
                    }
                });
            }
        } catch (_) {}
    },

    _save() {
        try {
            localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(this._state));
        } catch (_) {}
    },

    _patchSoundManagers() {
        if (this._patched || !Phaser?.Sound?.BaseSoundManager) return;
        this._patched = true;

        const proto = Phaser.Sound.BaseSoundManager.prototype;
        const origPlay = proto.play;
        const origAdd = proto.add;

        const decorate = (manager, key, config = {}, sound) => {
            const kind = this._kindForKey(key);
            const baseVolume = typeof config.volume === 'number' ? config.volume : 1;
            if (sound && sound.setVolume) {
                sound._sekaiAudioKind = kind;
                sound._sekaiBaseVolume = baseVolume;
                sound._sekaiAudioManager = manager;
                sound.setVolume(this._scaled(kind, baseVolume));
            }
            return sound;
        };

        proto.play = function(key, config = {}) {
            const kind = AudioSettings._kindForKey(key);
            const baseVolume = typeof config.volume === 'number' ? config.volume : 1;
            const sound = origPlay.call(this, key, Object.assign({}, config, {
                volume: AudioSettings._scaled(kind, baseVolume),
            }));
            return decorate(this, key, config, sound);
        };

        proto.add = function(key, config = {}) {
            const kind = AudioSettings._kindForKey(key);
            const baseVolume = typeof config.volume === 'number' ? config.volume : 1;
            const sound = origAdd.call(this, key, Object.assign({}, config, {
                volume: AudioSettings._scaled(kind, baseVolume),
            }));
            return decorate(this, key, config, sound);
        };
    },

    _kindForKey(key) {
        return String(key || '').startsWith('bgm_') ? 'bgm' : 'sfx';
    },

    _scaled(kind, baseVolume = 1) {
        const category = kind === 'bgm' ? this._state.bgm : this._state.sfx;
        return Phaser.Math.Clamp(baseVolume * this._state.master * category, 0, 1);
    },

    get(kind) {
        return this._state[kind] ?? 1;
    },

    set(kind, value) {
        if (!(kind in this._state)) return;
        this._state[kind] = Phaser.Math.Clamp(value, 0, 1);
        this._save();
        this.refreshAll();
    },

    setAll(values) {
        if (!values || typeof values !== 'object') return;
        ['master', 'bgm', 'sfx'].forEach((key) => {
            if (typeof values[key] === 'number') {
                this._state[key] = Phaser.Math.Clamp(values[key], 0, 1);
            }
        });
        this._save();
        this.refreshAll();
    },

    getLabel(kind) {
        return `${Math.round(this.get(kind) * 100)}%`;
    },

    scale(kind, baseVolume = 1) {
        return this._scaled(kind, baseVolume);
    },

    registerBgm(sound, baseVolume) {
        if (!sound) return sound;
        sound._sekaiAudioKind = 'bgm';
        sound._sekaiBaseVolume = typeof baseVolume === 'number' ? baseVolume : (sound._sekaiBaseVolume ?? 1);
        this.applyToSound(sound);
        return sound;
    },

    applyToSound(sound) {
        if (!sound || !sound._sekaiAudioKind) return;
        const target = this._scaled(sound._sekaiAudioKind, sound._sekaiBaseVolume ?? 1);
        if (typeof sound.setVolume === 'function') {
            sound.setVolume(target);
        } else {
            sound.volume = target;
        }
    },

    refreshScene(scene) {
        if (!scene || !scene.sound || !scene.sound.sounds) return;
        scene.sound.sounds.forEach((sound) => this.applyToSound(sound));
    },

    refreshAll() {
        const scenes = window.sekaiGame && window.sekaiGame.scene && window.sekaiGame.scene.scenes;
        if (!Array.isArray(scenes)) return;
        scenes.forEach((scene) => this.refreshScene(scene));
    },

    createBgm(scene, key, baseVolume) {
        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        return this.registerBgm(sound, baseVolume);
    },
};

AudioSettings.init();
