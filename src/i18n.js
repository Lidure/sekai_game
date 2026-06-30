const LANG_STORAGE_KEY = 'sekai_lang';

const Lang = {
    _code: 'cn',

    EN: {
        pauseTitle: '\u25C6 PAUSED \u25C6',
        resume: 'RESUME',
        status: 'STATUS',
        save: 'SAVE',
        returnToMenu: 'RETURN TO MENU',
        fullscreen: 'FULLSCREEN',
        settings: 'SETTINGS',
        language: 'LANGUAGE',
        voice: 'VOICE',
        master: 'MASTER',
        bgm: 'BGM',
        sfx: 'SFX',
        back: 'BACK',
        cancel: 'CANCEL',
        confirm: 'CONFIRM',
        returnToMenuQ: 'RETURN TO MENU?',
        saved: '\u2605 SAVED \u2605',
        newGame: 'NEW GAME',
        loadGame: 'LOAD GAME',
        credits: 'CREDITS',
        pressJToStart: 'PRESS J TO START',
        tapToStart: 'TAP TO START',
        npcTalkMobile: '\u25C6 TALK',
        npcCloseMobile: '\u25C6 CLOSE',
        saveGame: '\u25C6 SAVE GAME \u25C6',
        loadGameTitle: '\u25C6 LOAD GAME \u25C6',
        emptySlot: 'EMPTY SLOT',
        helpNav: '\u2191\u2193 Navigate  |  J Confirm  |  K Cancel',
        helpVoice: '\u2190\u2192 Adjust Master  |  K Back',
        helpMaster: '\u2190\u2192 Adjust Master  |  K Back',
        helpPauseMaster: 'J Increase  |  K Decrease',
        helpMenuSettings: '\u2191\u2193 Navigate  |  J Select  |  K Back',
        helpMenuSettingsSlider: '\u2191\u2193 Navigate  |  J Increase  |  K Decrease',
        helpMenuSettingsToggle: '\u2191\u2193 Navigate  |  J Select  |  K Back',
        helpSlot: '\u2191\u2193 Select   J Confirm   K Cancel',
        helpConfirm: '\u2190\u2192 Select  |  J Confirm  |  K Cancel',
        roomIntro: 'INTRO',
        roomAscent: 'ASCENT',
        roomSecret: 'SECRET',
        roomLower: 'LOWER PATH',
        roomMid: 'MID CORRIDOR',
        roomShaft: 'VERTICAL SHAFT',
        roomPreboss: 'PRE-BOSS',
        roomBoss: 'BOSS AREA',
        controls: 'CONTROLS',
        pc: 'PC',
        mobile: 'MOBILE',
        on: 'ON',
        off: 'OFF',
        npcAscent_0: 'The echoes in this place... they sound like her voice.',
        npcAscent_1: 'She left something behind. I can feel it.',
        npcAscent_2: "You're looking for her too, aren't you?",
        npcMid_0: "I've been watching you. You carry her sword well.",
        npcMid_1: 'The door ahead requires resolve. Not just strength.',
        npcMid_2: "When you face her... remember that she's also facing herself.",
        npcTalk: '\u25C6 TALK (J)',
        npcClose: '\u25C6 CLOSE (J)',
    },

    CN: {
        pauseTitle: '\u25C6 \u6682\u505C \u25C6',
        resume: '\u7EE7\u7EED',
        status: '\u72B6\u6001',
        save: '\u5B58\u6863',
        returnToMenu: '\u8FD4\u56DE\u4E3B\u83DC\u5355',
        fullscreen: '\u5168\u5C4F',
        settings: '\u8BBE\u7F6E',
        language: '\u8BED\u8A00',
        voice: '\u97F3\u91CF',
        master: '\u4E3B\u97F3\u91CF',
        bgm: 'BGM',
        sfx: '\u6548\u679C',
        back: '\u8FD4\u56DE',
        cancel: '\u53D6\u6D88',
        confirm: '\u786E\u8BA4',
        returnToMenuQ: '\u8FD4\u56DE\u4E3B\u83DC\u5355\uFF1F',
        saved: '\u2605 \u5B58\u6863\u6210\u529F \u2605',
        newGame: '\u65B0\u6E38\u620F',
        loadGame: '\u8BFB\u53D6\u5B58\u6863',
        credits: '\u5236\u4F5C\u540D\u5355',
        pressJToStart: '\u6309 J \u5F00\u59CB',
        tapToStart: '\u70B9\u51FB\u5F00\u59CB',
        npcTalkMobile: '\u25C6 \u5BF9\u8BDD',
        npcCloseMobile: '\u25C6 \u5173\u95ED',
        saveGame: '\u25C6 \u5B58\u6863 \u25C6',
        loadGameTitle: '\u25C6 \u8BFB\u53D6\u5B58\u6863 \u25C6',
        emptySlot: '\u7A7A\u6863\u4F4D',
        helpNav: '\u2191\u2193 \u5BFC\u822A  |  J \u786E\u8BA4  |  K \u53D6\u6D88',
        helpVoice: '\u2190\u2192 \u8C03\u8282\u4E3B\u97F3\u91CF  |  K \u8FD4\u56DE',
        helpMaster: '\u2190\u2192 \u8C03\u8282\u4E3B\u97F3\u91CF  |  K \u8FD4\u56DE',
        helpPauseMaster: 'J \u63D0\u9AD8  |  K \u964D\u4F4E',
        helpMenuSettings: '\u2191\u2193 \u9009\u62E9  |  J \u786E\u8BA4  |  K \u8FD4\u56DE',
        helpMenuSettingsSlider: '\u2191\u2193 \u9009\u62E9  |  J \u63D0\u9AD8  |  K \u964D\u4F4E',
        helpMenuSettingsToggle: '\u2191\u2193 \u9009\u62E9  |  J \u786E\u8BA4  |  K \u8FD4\u56DE',
        helpSlot: '\u2191\u2193 \u9009\u62E9  J \u786E\u8BA4  K \u53D6\u6D88',
        helpConfirm: '\u2190\u2192 \u9009\u62E9  |  J \u786E\u8BA4  |  K \u53D6\u6D88',
        roomIntro: '\u5165\u53E3',
        roomAscent: '\u4E0A\u5347\u901A\u9053',
        roomSecret: '\u79D8\u5BC6\u533A\u57DF',
        roomLower: '\u4E0B\u5C42\u901A\u9053',
        roomMid: '\u4E2D\u90CA\u5ECA',
        roomShaft: '\u5782\u76F4\u4E95',
        roomPreboss: 'BOSS \u524D\u591C',
        roomBoss: 'BOSS \u533A\u57DF',
        controls: '操作',
        pc: 'PC',
        mobile: '移动端',
        on: '\u5F00',
        off: '\u5173',
        npcAscent_0: '\u8FD9\u4E2A\u7A7A\u95F4\u7684\u56DE\u97F3...\u50CF\u662F\u5979\u7684\u58F0\u97F3\u3002',
        npcAscent_1: '\u5979\u7559\u4E0B\u4E86\u4EC0\u4E48\u3002\u6211\u80FD\u611F\u89C9\u5230\u3002',
        npcAscent_2: '\u4F60\u4E5F\u5728\u627E\u5979\uFF0C\u5BF9\u5417\uFF1F',
        npcMid_0: '\u6211\u4E00\u76F4\u5728\u770B\u7740\u4F60\u3002\u4F60\u628A\u5979\u7684\u5251\u7528\u5F97\u4E0D\u9519\u3002',
        npcMid_1: '\u524D\u65B9\u7684\u95E8\u9700\u8981\u7684\u662F\u89C9\u609F\u3002\u4E0D\u53EA\u662F\u529B\u91CF\u3002',
        npcMid_2: '\u5F53\u4F60\u9762\u5BF9\u5979\u65F6...\u8BB0\u4F4F\uFF0C\u5979\u4E5F\u5728\u9762\u5BF9\u81EA\u5DF1\u3002',
        npcTalk: '\u25C6 \u5BF9\u8BDD (J)',
        npcClose: '\u25C6 \u5173\u95ED (J)',
    },

    init() {
        try {
            const saved = localStorage.getItem(LANG_STORAGE_KEY);
            if (saved === 'cn' || saved === 'en') this._code = saved;
        } catch (_) {}
    },

    getCode() { return this._code; },

    setCode(code) {
        if (code !== 'en' && code !== 'cn') return;
        this._code = code;
        try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch (_) {}
    },

    toggle() {
        this.setCode(this._code === 'en' ? 'cn' : 'en');
    },

    t(key) {
        const dict = this._code === 'cn' ? this.CN : this.EN;
        return dict[key] || key;
    },

    roomName(roomId) {
        const key = 'room' + roomId.charAt(0).toUpperCase() + roomId.slice(1);
        return this.t(key);
    },
};

Lang.init();
