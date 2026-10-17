"""Soundtrack for the kit tier-list TikTok, synthesised from scratch (no
samples, free to use). Music: a 120 BPM baile funk-style groove (tamborzao
drum pattern, distorted bass, whistle lead, group "HEY!" shouts).
Arranged in sections (intro, two grooves, breakdown, build, drop with samba
whistle, finale) with rotating drum, conga and bass patterns.
Sound effects change every time: each shirt's score spin (drumroll, clock,
riser, slot clicks) and its S-tier reaction (air horn, crowd "ooh", record
scratch, deep boom, referee whistle + roar, giant horn finale) are different.

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
# three original whistle phrases, each 2 bars: (16th step, length in 16ths, MIDI)
LEAD_A = [(0, 2, 81), (2, 2, 79), (4, 2, 76), (6, 2, 79), (8, 4, 81), (12, 2, 84), (14, 2, 83),
          (16, 2, 81), (18, 2, 79), (20, 2, 76), (22, 2, 74), (24, 6, 76), (30, 2, 79)]
LEAD_B = [(0, 3, 76), (3, 3, 79), (6, 2, 81), (10, 2, 79), (12, 4, 76), (16, 3, 74), (19, 3, 76),
          (22, 2, 72), (24, 8, 69)]
LEAD_C = [(0, 1, 88), (2, 1, 86), (4, 2, 84), (8, 1, 88), (10, 1, 86), (12, 4, 81), (16, 2, 84),
          (18, 2, 86), (20, 4, 88), (24, 2, 86), (26, 2, 84), (28, 4, 81)]
# kick patterns (16ths) and conga patterns to rotate through
KICKS = {"tamborzao": (0, 3, 6, 10, 12), "half": (0, 6, 10), "drive": (0, 3, 6, 8, 10, 12, 14), "sparse": (0, 10)}
CONGAS = [((2, 64), (5, 60), (7, 64), (9, 60), (11, 67), (13, 64), (15, 60)),
          ((1, 60), (3, 64), (7, 67), (9, 64), (14, 60), (15, 64)),
          ((2, 67), (6, 64), (8, 60), (11, 64), (13, 67))]
BASSLINES = [((0, 3, 0), (3, 3, 0), (6, 4, 0), (10, 2, 12), (12, 4, 0)),
             ((0, 2, 0), (2, 2, 12), (4, 4, 0), (8, 2, 7), (10, 2, 0), (12, 2, 12), (14, 2, 10)),
             ((0, 8, 0), (8, 8, -2))]

# per-bar plan: (kicks, conga set, bassline, claps, hats, hey)
PLAN = [
    ("drive", 2, 1, True, "full", True),                       # 0  hook: hit hard from frame one
    ("tamborzao", 0, 0, True, "full", False),                  # 1
    ("tamborzao", 1, 0, True, "full", True),                   # 2  melody A
    ("drive", 0, 1, True, "full", False),                      # 3  melody B
    ("tamborzao", 2, 1, True, "full", True),                   # 4
    ("half", None, 2, False, "light", False),                  # 5  breakdown, melody C
    ("half", 1, 2, True, "light", False),                      # 6
    ("sparse", None, 2, False, "roll", False),                 # 7  build
    ("drive", 0, 0, True, "full", True),                       # 8  drop + samba whistle
    ("tamborzao", 2, 1, True, "full", True),                   # 9
    ("tamborzao", 1, 0, True, "full", True),                   # 10 finale
    ("drive", 0, 1, True, "full", False),                      # 11
    ("half", 2, 2, True, "light", True),                       # 12 outro
]
MELODY = {1: LEAD_A, 3: LEAD_B, 5: LEAD_C, 8: LEAD_A, 10: LEAD_B}   # bar → 2-bar phrase (transposed up on the drop)


def riser(d):
    """Rising noise swell (filtered sweep upwards)."""
    t = tt(d)
    n = A.sweep_bp(pink(d), 400, 6000, 0.4)
    return n * (t / d) ** 2.2 * 1.2


def apito(t0):
    """Samba whistle rhythm (short-short-long)."""
    out = []
    for dt, d in ((0, 0.08), (0.125, 0.08), (0.25, 0.2), (0.75, 0.08), (0.875, 0.08), (1.0, 0.35)):
        out.append((t0 + dt, A.whistle(d)))
    return out


def music():
    drums, bass, lead, vox = buf(), buf(), buf(), buf()
    r = np.random.default_rng(5)
    for bar, (kicks, conga_set, bl, claps, hats, shout) in enumerate(PLAN):
        b0 = bar * 2.0
        for s in KICKS[kicks]:
            place(drums, funk_kick(), b0 + s * 0.125, 0.9)
        if claps:
            for s in ((4, 12) if bar % 3 else (4, 12, 15)):
                place(drums, A.clap(), b0 + s * 0.125, 0.7, 0.05)
        if conga_set is not None:
            for s, m in CONGAS[conga_set]:
                place(drums, conga(m), b0 + s * 0.125, 0.35 + 0.2 * r.random(), 0.4 if s % 2 else -0.4)
        if hats == "full":
            for s in range(16):
                place(drums, A.hat(open_=(s % 8 == 6)), b0 + s * 0.125, (0.3 if s % 2 else 0.18) * (0.8 + 0.4 * r.random()), -0.3)
        elif hats == "light":
            for s in range(0, 16, 2):
                place(drums, A.hat(), b0 + s * 0.125, 0.2, -0.3)
        elif hats == "roll":                                   # build: accelerating snare roll + riser
            t, k = 0.0, 0
            while t < 2.0:
                place(drums, snare(), b0 + t, 0.15 + 0.6 * (t / 2) ** 1.5, 0.1 if k % 2 else -0.1)
                t += 1 / (4 + 14 * t / 2)
                k += 1
            place(drums, riser(2.0), b0, 0.35)
        if bl is not None:
            root = ROOTS[bar % 4]
            for s, ln, off in BASSLINES[bl]:
                place(bass, funk_bass(root + off, ln * 0.125), b0 + s * 0.125, 1.0)
        if shout:
            place(vox, hey(bar), b0 + 1.5, 0.9)
        if bar in (8, 9):
            for t0, w in apito(b0):
                place(drums, w, t0, 0.35, 0.3)
    for bar, phrase in MELODY.items():
        up = 12 if bar >= 8 else 0
        for s, ln, m in phrase:
            place(lead, whistle_lead(m + up - (12 if m + up > 95 else 0), ln * 0.125 * 0.9), bar * 2.0 + s * 0.125, 1.0, 0.15)
    d = int(0.375 * SR)
    lead[d:, 0] += lead[:-d, 1] * 0.25
    lead[d:, 1] += lead[:-d, 0] * 0.25
    for t0 in (0.0, 16.0, END):
        place(drums, A.crash(), t0, 0.4)
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


def scratch(d=0.45):
    """DJ record scratch: a pitched noise burst whose speed swings back and forth."""
    t = tt(d)
    speed = np.sin(2 * np.pi * 6 * t) * np.exp(-t / 0.3)
    f = 600 + 900 * speed
    y = np.sin(2 * np.pi * np.cumsum(np.abs(f)) / SR) * 0.5 + bp(noise(d), 800, 4000) * np.abs(speed)
    return np.tanh(y * 1.5) * ad(t, 0.003, 0.25) * 0.7


def ooh(seed=0):
    """Crowd 'OOOH': a group of voices on 'oh', sliding up."""
    out = np.zeros((int(1.3 * SR), 2))
    r = np.random.default_rng(seed)
    for v in range(9):
        m = 52 + r.integers(0, 9)
        y = A.voice(m, 1.2, A.OH, seed * 17 + v, 0.03)
        y *= np.minimum(1, tt(1.2) / 0.2)
        s = A.pan2(y, r.random() * 1.6 - 0.8)
        out[: len(s)] += s
    return A.reverb(out / 5, 1.6, 0.35, 4000)


def deep_boom():
    t = tt(1.8)
    f = 38 + 70 * np.exp(-t / 0.08)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.004, 0.7)
    return np.tanh(y * 2.2) * 0.8 + lp(pink(1.8), 300) * ad(t, 0.002, 0.08) * 0.4


def clock_ticks(d=1.05):
    out = np.zeros(int((d + 0.1) * SR))
    t = 0.0
    while t < d:
        s = A.tick()
        i = int(t * SR)
        out[i:i + len(s)] += s * (0.5 + 0.5 * t / d)
        t += 0.16 - 0.1 * (t / d)
    return out


def slot_clicks(d=1.05):
    out = np.zeros(int((d + 0.1) * SR))
    t, k = 0.0, 0
    while t < d:
        tt_ = tt(0.03)
        c = np.sin(2 * np.pi * (900 + 60 * (k % 6)) * tt_) * ad(tt_, 0.001, 0.008)
        i = int(t * SR)
        out[i:i + len(c)] += c * 0.6
        t += 0.05
        k += 1
    return out


SPIN = [lambda: drumroll(1.05), lambda: clock_ticks(), lambda: riser(1.05), lambda: slot_clicks(), lambda: drumroll(1.05), None]
LAND = ["horn", "ooh", "scratch", "boom", "whistle", "finale"]


def sfx():
    fx = buf()
    place(fx, da.hit(), 0.0, 0.9)
    place(fx, A.swish(0.5), 0.0, 0.5)
    for k in range(1, 8):                               # hook flicker
        place(fx, bloop(), k * 0.25, 0.3, 0.4 if k % 2 else -0.4)
    for i in range(KITS):
        S = HOOK_END + i * SLOT
        place(fx, A.swish(0.25 + 0.05 * i), S - 0.15, 0.6, 0.4 if i % 2 else -0.4)   # shirt pops up
        place(fx, bloop() if i % 2 == 0 else A.pop(), S, 0.9)
        place(fx, da.hit(), S, 0.6)
        if SPIN[i]:
            place(fx, SPIN[i](), S + 0.45, 0.6)         # score spinning, different every time
        else:                                            # finale: drumroll + riser together
            place(fx, drumroll(1.05), S + 0.45, 0.6)
            place(fx, riser(1.05), S + 0.45, 0.4)
        L = S + 1.5                                      # lands in S tier: a different reaction each time
        place(fx, da.hit(), L, 0.8)
        kind = LAND[i]
        if kind == "horn":
            place(fx, air_horn(), L, 0.75)
        elif kind == "ooh":
            place(fx, ooh(i), L, 0.8)
            place(fx, A.applause(1.4, 30 + i, 200), L + 0.2, 0.6)
        elif kind == "scratch":
            place(fx, scratch(), L, 0.8)
        elif kind == "boom":
            place(fx, deep_boom(), L, 1.0)
        elif kind == "whistle":
            place(fx, A.whistle(0.6), L, 0.6)
            place(fx, A.roar(1.6, 20 + i), L, 0.6)
        else:
            place(fx, air_horn(((0, 0.13), (0.18, 0.13), (0.36, 0.13), (0.54, 0.6))), L, 0.8)
            place(fx, A.roar(2.0, 20 + i), L, 0.75)
        place(fx, A.swish(0.5), S + 2.2, 0.45, -0.4)    # flies to the board
        place(fx, thud(), S + 2.75, 0.9)
    # ending
    place(fx, da.hit(), END, 0.9)
    place(fx, A.roar(3.0, 40), END, 0.7)
    place(fx, A.applause(5.5, 41), END + 0.4, 0.8)
    for k, t0 in enumerate((END + 0.6, END + 1.2)):
        place(fx, hey(90 + k), t0, 0.6)
    place(fx, da.hit(), END + 3.0, 0.85)
    place(fx, A.whistle(0.25), END + 3.3, 0.45)
    place(fx, A.whistle(0.25), END + 3.65, 0.45)
    place(fx, A.whistle(0.8), END + 4.0, 0.45)
    return hp(fx, 30)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m, f = music(), sfx()
    da.write(os.path.join(OUT, "mix.wav"), m * 0.8 + f * 0.85)
    da.write(os.path.join(OUT, "sfx.wav"), f)
    da.write(os.path.join(OUT, "music.wav"), m)
    print("audio written")
