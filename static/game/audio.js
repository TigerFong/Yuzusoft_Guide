// 文件：static/game/audio.js
// 柚子社 · 幻境交錯 —— Web Audio API 音效引擎
// 純合成、零外部素材、零延遲
// 對外 API：
//   SFX.cardPlay()              普通卡打出
//   SFX.ultimate()              必殺卡打出
//   SFX.hit(isCrit)             傷害命中
//   SFX.playerHurt()            我方受傷
//   SFX.heal() / SFX.shield()   治療 / 護盾
//   SFX.spGain()                SP 增加
//   SFX.select() / SFX.deny()   選卡 / 拒絕
//   SFX.victory() / SFX.defeat()  戰鬥結算
//   SFX.gachaReveal(rarity)     抽卡飛出（'SSR' | 'SR' | 'R'）
//   SFX.click() / SFX.upgrade() / SFX.reward()   通用

(function () {
    'use strict';

    let ctx = null;
    let masterGain = null;
    let enabled = true;

    function _ensureCtx() {
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try {
            ctx = new Ctx();
        } catch (e) {
            return null;
        }
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.35;
        masterGain.connect(ctx.destination);
        return ctx;
    }

    // 瀏覽器要求用戶手勢後才允許音頻，這裡掛一次
    function unlock() {
        const c = _ensureCtx();
        if (c && c.state === 'suspended') c.resume();
    }
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);

    // 單音合成
    // opts = { freq, endFreq, sweep, type, gain, attack, decay, sustain, release, delay }
    function _tone(opts) {
        if (!enabled) return;
        const c = _ensureCtx();
        if (!c) return;
        const t0 = c.currentTime + (opts.delay || 0);
        const osc = c.createOscillator();
        const g = c.createGain();

        osc.type = opts.type || 'sine';
        const startFreq = opts.freq || 440;
        osc.frequency.setValueAtTime(startFreq, t0);
        if (opts.endFreq) {
            const sweep = opts.sweep || 0.2;
            try {
                osc.frequency.exponentialRampToValueAtTime(Math.max(opts.endFreq, 1), t0 + sweep);
            } catch (e) { /* noop */ }
        }

        const peak = opts.gain != null ? opts.gain : 0.25;
        const attack = opts.attack || 0.005;
        const decay = opts.decay || 0.08;
        const sustain = opts.sustain != null ? opts.sustain : 0;
        const release = opts.release || 0.12;

        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + attack);
        g.gain.exponentialRampToValueAtTime(Math.max(peak * sustain, 0.0001), t0 + attack + decay);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay + release);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(t0);
        osc.stop(t0 + attack + decay + release + 0.08);
    }

    // 白噪聲 + 帶通
    function _noise(duration, gainVal, filterFreq) {
        if (!enabled) return;
        const c = _ensureCtx();
        if (!c) return;
        const size = Math.max(1, Math.floor(c.sampleRate * duration));
        const buffer = c.createBuffer(1, size, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

        const src = c.createBufferSource();
        src.buffer = buffer;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq || 1800;
        filter.Q.value = 1.2;
        const g = c.createGain();
        g.gain.setValueAtTime(gainVal || 0.08, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        src.start(c.currentTime);
        src.stop(c.currentTime + duration + 0.02);
    }

    // ========================= 對外音效 =========================
    const SFX = {
        cardPlay() {
            _tone({ freq: 660, endFreq: 990, sweep: 0.08, type: 'triangle',
                    gain: 0.12, attack: 0.005, decay: 0.05, release: 0.08 });
            _noise(0.06, 0.05, 2400);
        },
        ultimate() {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                _tone({ freq: f, type: 'sawtooth', gain: 0.12, delay: i * 0.04,
                        attack: 0.01, decay: 0.12, release: 0.35 });
            });
            _noise(0.4, 0.06, 3200);
        },
        hit(isCrit) {
            if (isCrit) {
                _tone({ freq: 220, endFreq: 90, sweep: 0.12, type: 'square',
                        gain: 0.18, decay: 0.10, release: 0.15 });
                _tone({ freq: 880, type: 'triangle', gain: 0.12, delay: 0.02, release: 0.18 });
                _noise(0.12, 0.10, 4200);
            } else {
                _tone({ freq: 180, endFreq: 80, sweep: 0.10, type: 'square',
                        gain: 0.14, decay: 0.08, release: 0.10 });
                _noise(0.08, 0.06, 2800);
            }
        },
        playerHurt() {
            _tone({ freq: 140, endFreq: 60, sweep: 0.15, type: 'sawtooth',
                    gain: 0.16, decay: 0.10, release: 0.14 });
            _noise(0.10, 0.08, 800);
        },
        heal() {
            [660, 990].forEach((f, i) => {
                _tone({ freq: f, type: 'sine', gain: 0.10, delay: i * 0.06,
                        attack: 0.01, decay: 0.08, release: 0.18 });
            });
        },
        shield() {
            [440, 660, 880].forEach((f, i) => {
                _tone({ freq: f, type: 'sine', gain: 0.08, delay: i * 0.05,
                        attack: 0.02, decay: 0.10, release: 0.20 });
            });
        },
        spGain() {
            _tone({ freq: 1200, type: 'triangle', gain: 0.08,
                    attack: 0.005, decay: 0.04, release: 0.10 });
        },
        deny() {
            _tone({ freq: 300, endFreq: 180, sweep: 0.12, type: 'square',
                    gain: 0.12, decay: 0.06, release: 0.10 });
        },
        select() {
            _tone({ freq: 880, type: 'triangle', gain: 0.08,
                    attack: 0.005, decay: 0.03, release: 0.06 });
        },
        victory() {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                _tone({ freq: f, type: 'triangle', gain: 0.14, delay: i * 0.09,
                        attack: 0.01, decay: 0.15, release: 0.40 });
            });
        },
        defeat() {
            [392, 349.23, 293.66, 220].forEach((f, i) => {
                _tone({ freq: f, type: 'sine', gain: 0.14, delay: i * 0.12,
                        attack: 0.01, decay: 0.18, release: 0.50 });
            });
        },
        gachaReveal(rarity) {
            if (rarity === 'SSR') {
                [784, 988, 1175, 1568].forEach((f, i) => {
                    _tone({ freq: f, type: 'triangle', gain: 0.14, delay: i * 0.08,
                            attack: 0.01, decay: 0.15, release: 0.60 });
                });
                _noise(0.40, 0.05, 5200);
            } else if (rarity === 'SR') {
                [660, 990].forEach((f, i) => {
                    _tone({ freq: f, type: 'triangle', gain: 0.12, delay: i * 0.07,
                            attack: 0.01, decay: 0.12, release: 0.35 });
                });
            } else {
                _tone({ freq: 660, type: 'sine', gain: 0.08, decay: 0.06, release: 0.20 });
            }
        },
        click() {
            _tone({ freq: 1200, type: 'triangle', gain: 0.05,
                    attack: 0.002, decay: 0.02, release: 0.05 });
        },
        upgrade() {
            [523, 659, 880].forEach((f, i) => {
                _tone({ freq: f, type: 'triangle', gain: 0.12, delay: i * 0.07,
                        attack: 0.01, decay: 0.10, release: 0.30 });
            });
        },
        reward() {
            [880, 1320].forEach((f, i) => {
                _tone({ freq: f, type: 'triangle', gain: 0.10, delay: i * 0.07,
                        attack: 0.01, decay: 0.10, release: 0.25 });
            });
        },
    };

    window.SFX = SFX;

    window.AudioSettings = {
        mute() { enabled = false; if (masterGain) masterGain.gain.value = 0; },
        unmute() { enabled = true; if (masterGain) masterGain.gain.value = 0.35; },
        setVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); },
        isEnabled() { return enabled; },
    };
})();