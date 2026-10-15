"""Soundtrack for the kit tier-list TikTok, synthesised from scratch (no
samples, free to use). Music: a 120 BPM baile funk-style groove (tamborzao
drum pattern, distorted bass, whistle lead, group "HEY!" shouts).
Sound effects: a cartoon pop + impact when each shirt appears, a snare
drumroll while the score spins, an air horn when it lands in S tier, a
whoosh and thud onto the board, and an air horn, crowd and applause at the end.

Writes rank/out/mix.wav (music + sfx) and rank/out/sfx.wav (sfx only).
"""
import importlib.util
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import audio as A                                     # noqa: E402  shared synth helpers

spec = importlib.util.spec_from_file_location("drop_audio", os.path.join(HERE, "..", "drop", "audio.py"))
da = importlib.util.module_from_spec(spec)
spec.loader.exec_module(da)

SR = A.SR
DUR = 26.0
N = int(SR * DUR)
BEAT = 0.5
OUT = os.path.join(HERE, "out")
HOOK_END, SLOT, KITS, END = 2.0, 3.0, 6, 20.0
tt, ad, bp, hp, lp, pink, noise, mtof = A.tt, A.ad, A.bp, A.hp, A.lp, A.pink, A.noise, A.mtof


def buf():
    return np.zeros((N, 2))


def place(dst, sig, t0, gain=1.0, pan=0.0):
    sig = A.edge(np.array(sig, dtype=float))
    if sig.ndim == 1:
        sig = A.pan2(sig, pan)
    i = int(round(t0 * SR))
    n = min(len(sig), N - i)
    if n > 0 and i >= 0:
        dst[i:i + n] += sig[:n] * gain


# ---------------------------------------------------------------- music: baile funk
def funk_kick():
    t = tt(0.35)
    f = 48 + 150 * np.exp(-t / 0.018)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.001, 0.14)
    return np.tanh(body * 2.0) * 0.8 + bp(noise(0.35), 2000, 6000) * ad(t, 0.0004, 0.003) * 0.3


def conga(m):
    t = tt(0.25)
    f = mtof(m) * (1 + 0.3 * np.exp(-t / 0.01))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.001, 0.07) + bp(noise(0.25), 1500, 5000) * ad(t, 0.0005, 0.004) * 0.25


def funk_bass(m, d):
    t = tt(d)
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.02) * np.exp(-t / 0.35)
    return np.tanh(y * env * 2.5) * 0.5


def whistle_lead(m, d):
    """Whistle-like lead: pure tone with vibrato, a little breath."""
    t = tt(d)
    f = mtof(m) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.1))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + bp(noise(d), 2000, 6000) * 0.04
    env = np.minimum(1, t / 0.015) * np.minimum(1, (d - t) / 0.04)
    return y * env * 0.3


EH = ((560, 90, 1.0), (1800, 120, 0.6), (2550, 160, 0.2))


def hey(seed=0):
    """Group shout 'HEY!' (formant voices sliding down)."""
    out = np.zeros((int(0.3 * SR), 2))
    r = np.random.default_rng(seed)
    for v in range(7):
        m = 57 + r.integers(-3, 6)
        y = A.voice(m, 0.24, EH, seed * 13 + v, 0.02)
        y *= np.exp(-tt(0.24) / 0.12)
        s = A.pan2(y, r.random() * 1.4 - 0.7)
        i = int(r.random() * 0.015 * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return A.reverb(out / 4, 0.8, 0.25, 5000)


ROOTS = [45, 45, 41, 43]                               # A, A, F, G (bass, per bar)
LEAD = [  # (16th step, length in 16ths, MIDI) per 2 bars, original melody
    (0, 2, 81), (2, 2, 79), (4, 2, 76), (6, 2, 79), (8, 4, 81), (12, 2, 84), (14, 2, 83),
    (16, 2, 81), (18, 2, 79), (20, 2, 76), (22, 2, 74), (24, 6, 76), (30, 2, 79)]


def music():
    drums, bass, lead, vox = buf(), buf(), buf(), buf()
    for bar in range(int(DUR / 2)):
        b0 = bar * 2.0
        # tamborzao: kick X..X..X...X.X...
        for s in (0, 3, 6, 10, 12):
            place(drums, funk_kick(), b0 + s * 0.125, 0.9)
        for s in (4, 12):
            place(drums, A.clap(), b0 + s * 0.125, 0.7, 0.05)
        for s, m in ((2, 64), (5, 60), (7, 64), (9, 60), (11, 67), (13, 64), (15, 60)):
            place(drums, conga(m), b0 + s * 0.125, 0.45, 0.4 if s % 2 else -0.4)
        for s in range(16):
            place(drums, A.hat(open_=(s % 8 == 6)), b0 + s * 0.125, 0.3 if s % 2 else 0.18, -0.3)
        root = ROOTS[bar % 4]
        for s, ln in ((0, 3), (3, 3), (6, 4), (10, 2), (12, 4)):
            place(bass, funk_bass(root + (12 if s == 10 else 0), ln * 0.125), b0 + s * 0.125, 1.0)
        place(vox, hey(bar), b0 + 1.5, 0.9)                  # "HEY!" on beat 4 of every bar
    for start in np.arange(4.0, DUR - 0.5, 4.0):              # whistle melody every 2 bars after the hook
        for s, ln, m in LEAD:
            place(lead, whistle_lead(m, ln * 0.125 * 0.9), start + s * 0.125, 1.0, 0.15)
    d = int(0.375 * SR)
    lead[d:, 0] += lead[:-d, 1] * 0.25
    lead[d:, 1] += lead[:-d, 0] * 0.25
    place(drums, A.crash(), 0.0, 0.4)
    place(drums, A.crash(), END, 0.4)
    grit = bp(np.tanh(bass * 3.5), 150, 2200) * 0.5
    mix = hp(drums, 30) + lp(bass, 3000) * 0.7 + grit + A.reverb(hp(lead, 300), 1.0, 0.2) + hp(vox, 150) * 0.8
    tgrid = np.arange(N) / SR
    return mix * np.clip((DUR - tgrid) / 0.25, 0, 1)[:, None]


# ---------------------------------------------------------------- sound effects
def air_horn(pattern=((0, 0.13), (0.18, 0.13), (0.36, 0.55))):
    """Meme air horn: detuned saws with a slight pitch rise, band-passed and driven."""
    total = pattern[-1][0] + pattern[-1][1] + 0.1
    out = np.zeros(int(total * SR))
    for t0, d in pattern:
        t = tt(d)
        f0 = 466 * (0.97 + 0.03 * np.minimum(1, t / 0.05))
        y = np.zeros_like(t)
        for det in (-0.006, 0.0, 0.007):
            ph = np.cumsum(f0 * (1 + det)) / SR
            y += 2 * (ph % 1.0) - 1
        y = np.tanh(bp(y, 300, 3500) * 2.5)
        env = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)
        i = int(t0 * SR)
        out[i:i + len(t)] += y * env * 0.45
    return A.reverb(out, 0.8, 0.2, 6000)


def bloop():
    """Cartoon pop: quick upward pitch sweep."""
    t = tt(0.12)
    f = 250 + 1100 * (t / 0.12) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.002, 0.04) * 0.8


def snare():
    t = tt(0.18)
    tone = np.sin(2 * np.pi * 190 * t) * ad(t, 0.001, 0.035)
    return bp(pink(0.18), 1800, 7500) * ad(t, 0.001, 0.05) * 1.6 + tone * 0.4


def drumroll(d=1.05):
    out = np.zeros(int((d + 0.2) * SR))
    t = 0.0
    while t < d:
        rate = 10 + 26 * (t / d) ** 1.4               # hits per second, speeding up
        s = snare()
        g = 0.25 + 0.75 * (t / d) ** 1.5
        i = int(t * SR)
        out[i:i + len(s)] += s[: len(out) - i] * g
        t += 1.0 / rate
    return out


def thud():
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * ad(t, 0.001, 0.06) * 0.9


def sfx():
    fx = buf()
    place(fx, da.hit(), 0.0, 0.9)
    place(fx, A.swish(0.5), 0.0, 0.5)
    for k in range(1, 8):                               # hook flicker
        place(fx, bloop(), k * 0.25, 0.35, 0.4 if k % 2 else -0.4)
    for i in range(KITS):
        S = HOOK_END + i * SLOT
        place(fx, A.swish(0.3), S - 0.15, 0.6, 0.4)     # shirt pops up
        place(fx, bloop(), S, 0.9)
        place(fx, da.hit(), S, 0.7)
        place(fx, drumroll(1.05), S + 0.45, 0.6)        # score spinning
        place(fx, air_horn(), S + 1.5, 0.75)            # S TIER!
        place(fx, da.hit(), S + 1.5, 0.8)
        place(fx, A.roar(1.5, 20 + i), S + 1.5, 0.35 + 0.06 * i)
        place(fx, A.swish(0.5), S + 2.2, 0.5, -0.4)     # flies to the board
        place(fx, thud(), S + 2.75, 0.9)
    # ending
    place(fx, air_horn(((0, 0.13), (0.18, 0.13), (0.36, 0.13), (0.54, 0.7))), END, 0.85)
    place(fx, da.hit(), END, 0.9)
    place(fx, A.roar(3.0, 40), END, 0.7)
    place(fx, A.applause(5.5, 41), END + 0.4, 0.8)
    place(fx, da.hit(), END + 3.0, 0.85)
    place(fx, bloop(), END + 3.25, 0.7)
    place(fx, bloop(), END + 3.5, 0.7)
    return hp(fx, 30)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m, f = music(), sfx()
    da.write(os.path.join(OUT, "mix.wav"), m * 0.8 + f * 0.85)
    da.write(os.path.join(OUT, "sfx.wav"), f)
    da.write(os.path.join(OUT, "music.wav"), m)
    print("audio written")
