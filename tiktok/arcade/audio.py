"""Chiptune soundtrack + 8-bit sound effects for the arcade football short.
All synthesised from scratch (pulse waves, triangle bass, noise drums), so it
is free to use. 120 BPM; the music follows the story: intro jingle, main
groove with varied melodies, a slow-motion drop for the bicycle kick, a
major-key fanfare for the goal, and a "level complete" ending.

Writes arcade/out/mix.wav (music + sfx) and arcade/out/sfx.wav (sfx only).
"""
import os
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import audio as A                                     # noqa: E402  shared helpers

SR = A.SR
DUR = 24.0
N = int(SR * DUR)
OUT = os.path.join(HERE, "out")
tt, ad, bp, hp, lp, noise, mtof = A.tt, A.ad, A.bp, A.hp, A.lp, A.noise, A.mtof
STEP = 0.125                                           # 16th note at 120 BPM
RUN0, KICK, GOAL, CELEB, END = 2.0, 13.5, 14.5, 17.0, 20.0


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


# ---------------------------------------------------------------- chip voices
def pulse(f, d, duty=0.25, vib=0.0, decay=None):
    t = tt(d)
    ff = f * (1 + vib * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.15))
    ph = np.cumsum(ff) / SR % 1.0
    y = np.where(ph < duty, 1.0, -1.0)
    env = np.minimum(1, t / 0.003) * np.minimum(1, (d - t) / 0.01)
    if decay:
        env *= np.exp(-t / decay)
    return lp(y * env, 9000) * 0.22


def tri(f, d):
    t = tt(d)
    ph = np.cumsum(np.full(len(t), f)) / SR % 1.0
    y = 4 * np.abs(ph - 0.5) - 1
    return y * np.minimum(1, t / 0.003) * np.minimum(1, (d - t) / 0.01) * 0.45


def nkick():
    t = tt(0.18)
    f = 50 + 180 * np.exp(-t / 0.02)
    ph = np.cumsum(f) / SR % 1.0
    return (4 * np.abs(ph - 0.5) - 1) * ad(t, 0.001, 0.07) * 0.9


def nsnare():
    t = tt(0.16)
    return np.sign(noise(0.16)) * ad(t, 0.001, 0.05) * 0.35


def nhat(open_=False):
    d = 0.12 if open_ else 0.04
    t = tt(d)
    return hp(np.sign(noise(d)), 6000) * ad(t, 0.001, 0.04 if open_ else 0.012) * 0.25


def sweep(f0, f1, d, duty=0.5, gain=1.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = np.cumsum(f) / SR % 1.0
    return np.where(ph < duty, 1.0, -1.0) * np.minimum(1, t / 0.003) * np.minimum(1, (d - t) / 0.01) * 0.22 * gain


def arp(notes, d_each, duty=0.25):
    return np.concatenate([pulse(mtof(m), d_each, duty) for m in notes])


# ---------------------------------------------------------------- music
# E minor groove: Em C D B7 (per bar of 2 s)
BASS = [40, 36, 38, 35]
# melodies: (16th step, length in 16ths, MIDI) for one 2-bar phrase
MEL_A = [(0, 2, 76), (2, 2, 79), (4, 2, 83), (6, 4, 81), (10, 2, 79), (12, 4, 76), (16, 2, 74), (18, 2, 76),
         (20, 4, 79), (24, 2, 78), (26, 2, 74), (28, 4, 71)]
MEL_B = [(0, 3, 83), (3, 3, 81), (6, 2, 79), (8, 2, 81), (10, 2, 83), (12, 4, 86), (16, 2, 84), (18, 2, 83),
         (20, 2, 81), (22, 2, 79), (24, 6, 78), (30, 2, 74)]
MEL_C = [(0, 1, 88), (1, 1, 86), (2, 1, 83), (3, 1, 79), (4, 2, 81), (6, 2, 83), (8, 4, 84), (12, 4, 83),
         (16, 1, 86), (17, 1, 84), (18, 1, 83), (19, 1, 81), (20, 4, 79), (24, 4, 78), (28, 4, 76)]
FANFARE = [(0, 2, 79), (2, 2, 79), (4, 2, 79), (6, 6, 83), (12, 2, 81), (14, 2, 83), (16, 4, 86),
           (20, 2, 83), (22, 2, 86), (24, 8, 91)]                       # G major, goal
FANFARE_B = [(0, 2, 86), (2, 2, 88), (4, 4, 91), (8, 2, 88), (10, 2, 86), (12, 4, 83), (16, 2, 84),
             (18, 2, 86), (20, 4, 88), (24, 8, 86)]


def music():
    drums, bass, lead, harm = buf(), buf(), buf(), buf()

    # intro jingle (after the coin): a rising arp and a drum fill
    place(lead, arp([64, 67, 71, 76, 79, 83, 88], 0.07, 0.5), 0.55, 0.9)
    for k, s in enumerate((1.5, 1.625, 1.75, 1.875)):
        place(drums, nsnare(), s, 0.5 + 0.12 * k)
    for s in (1.0, 1.25, 1.5):                          # kick + bass pickup into the groove
        place(drums, nkick(), s, 1.0)
        place(bass, tri(mtof(40), 0.2), s, 1.0)
    place(harm, arp([76, 79, 83, 88] * 2, 0.0625, 0.125), 1.0, 0.5)

    # main groove 2.0 → 13.25
    bars = [(2.0, MEL_A), (6.0, MEL_B), (10.0, MEL_C)]
    for b0, mel in bars:
        for s, ln, m in mel:
            place(lead, pulse(mtof(m), ln * STEP * 0.92, 0.25 if b0 != 10.0 else 0.125, vib=0.006), b0 + s * STEP, 1.0, 0.1)
    for bar in range(6):
        b0 = 2.0 + bar * 2.0
        if b0 >= 13.25:
            break
        root = BASS[bar % 4]
        for s in range(16):
            t0 = b0 + s * STEP
            if t0 >= 13.25:
                break
            if s % 2 == 0:
                place(bass, tri(mtof(root + (12 if s in (6, 14) else 0)), STEP * 1.6), t0, 1.0)
            if s % 8 in (0, 3) or (bar % 2 and s == 10):
                place(drums, nkick(), t0, 1.0)
            if s % 8 == 4:
                place(drums, nsnare(), t0, 1.0)
            place(drums, nhat(open_=(s % 8 == 7)), t0, 0.7 if s % 2 else 0.45, 0.3)
        if bar >= 2:                                    # arpeggio layer after the first two bars
            chord = [root + 24, root + 31, root + 36] if bar % 4 != 3 else [root + 24, root + 28, root + 31]
            for s in range(16):
                t0 = b0 + s * STEP
                if t0 < 13.25:
                    place(harm, pulse(mtof(chord[s % 3]), STEP * 0.8, 0.125, decay=0.06), t0, 0.5, -0.3 if s % 2 else 0.3)

    # slow-mo: everything drops out, heartbeat + low drone + rising sweep
    place(bass, tri(mtof(28), GOAL - 13.3), 13.3, 0.9)
    for hb in (13.4, 13.65, 13.9, 14.15):
        place(drums, nkick(), hb, 0.9)
    place(harm, sweep(200, 1600, GOAL - 13.3, 0.5, 0.8), 13.3, 0.6)

    # goal fanfare (G major), then the celebration groove
    for b0, mel in ((GOAL, FANFARE), (GOAL + 4, FANFARE_B)):
        for s, ln, m in mel:
            t0 = b0 + s * STEP
            if t0 < END:
                place(lead, pulse(mtof(m), ln * STEP * 0.92, 0.5, vib=0.008), t0, 1.0)
                place(harm, pulse(mtof(m - 4), ln * STEP * 0.9, 0.25), t0, 0.45, 0.25)
    for s in range(int((END - GOAL) / STEP)):
        t0 = GOAL + s * STEP
        root = [43, 48, 50, 43][int((t0 - GOAL) // 1.0) % 4]
        if s % 2 == 0:
            place(bass, tri(mtof(root + (12 if s % 4 == 2 else 0)), STEP * 1.6), t0, 1.0)
        if s % 4 == 0 or (s % 8 == 6):
            place(drums, nkick(), t0, 1.0)
        if s % 8 == 4:
            place(drums, nsnare(), t0, 1.0)
        place(drums, nhat(), t0, 0.5, 0.3)

    # ending: "level complete" jingle and a final chord
    for k, m in enumerate((79, 83, 86, 91, 95)):
        place(lead, pulse(mtof(m), 0.11, 0.5), END + 0.05 + k * 0.11, 1.0)
    for m in (67, 71, 74, 79):
        place(harm, pulse(mtof(m), 1.6, 0.25, vib=0.01, decay=0.9), END + 0.7, 0.7)
    for s in range(int(3.2 / STEP)):                       # light groove under the end card
        t0 = END + 0.7 + s * STEP
        if s % 4 == 0 or s % 8 == 6:
            place(drums, nkick(), t0, 1.0)
        if s % 8 == 4:
            place(drums, nsnare(), t0, 1.0)
        place(drums, nhat(), t0, 0.5, 0.3)
        chord = [67, 71, 74, 79] if (s // 8) % 2 == 0 else [72, 76, 79, 84]
        place(harm, pulse(mtof(chord[s % 4]), STEP * 0.8, 0.125, decay=0.06), t0, 0.55, -0.3 if s % 2 else 0.3)
    for s in range(int(3.2 / (STEP * 2))):
        place(bass, tri(mtof([43, 43, 48, 50][(s // 4) % 4]), STEP * 1.6), END + 0.7 + s * STEP * 2, 1.0)

    mix = hp(drums, 30) + bass + lead + harm
    tgrid = np.arange(N) / SR
    return mix * np.clip((DUR - tgrid) / 0.3, 0, 1)[:, None]


# ---------------------------------------------------------------- sound effects
def coin():
    return np.concatenate([pulse(988, 0.07, 0.5), pulse(1319, 0.35, 0.5, decay=0.15)])


def crt_on():
    t = tt(0.4)
    return (np.sign(noise(0.4)) * ad(t, 0.001, 0.05) * 0.4 + np.sin(2 * np.pi * 15000 * t) * 0.03 * np.exp(-t / 0.3))


def explosion(d=1.0):
    t = tt(d)
    n = np.sign(noise(d)) * np.exp(-t / 0.25)
    return lp(n, 3000) * 0.8 + tri(55, d) * np.exp(-t / 0.3) * 1.2


def crowd8(d):
    t = tt(d)
    n = bp(noise(d), 400, 2500)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) * np.sin(2 * np.pi * 2.3 * t)
    return n * am * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.5) * 0.5


def fail_wah():
    """Descending 'wah-wah' for the defender who loses his ankles."""
    return np.concatenate([sweep(392, 370, 0.22, 0.5), sweep(370, 349, 0.22, 0.5), sweep(349, 262, 0.55, 0.5)])


def pop8():
    t = tt(0.06)
    return np.sign(noise(0.06)) * ad(t, 0.001, 0.012) * 0.35


def sfx():
    fx = buf()
    place(fx, crt_on(), 0.05, 0.8)
    place(fx, coin(), 0.4, 0.9)
    for k in range(4):                                   # "PLAYER 1 READY" blinks
        place(fx, pulse(1760, 0.04, 0.5), 1.0 + k * 0.25, 0.4)
    # dribble touches
    tch = RUN0 + 0.35
    while tch < 12.6:
        if not any(a <= tch < b for a, b in ((5.0, 5.5), (8.0, 8.8), (11.0, 11.6))):
            place(fx, pulse(220, 0.03, 0.5, decay=0.01), tch, 0.35, 0.2)
        tch += 0.35
    # skill moves
    place(fx, sweep(300, 900, 0.18), 5.1, 0.8)                         # hop over (nutmeg)
    place(fx, pulse(1047, 0.06, 0.5), 5.2, 0.6); place(fx, pulse(1568, 0.12, 0.5), 5.26, 0.6)
    place(fx, sweep(400, 2000, 0.6, 0.25), 8.05, 0.8)                   # rainbow flick: long rising arc
    place(fx, arp([72, 76, 79, 84], 0.05), 8.3, 0.7)
    for k in range(6):                                                  # elastico: zig-zag
        place(fx, pulse(mtof(76 + (4 if k % 2 else 0)), 0.05, 0.5), 11.0 + k * 0.08, 0.6)
    place(fx, arp([74, 78, 81, 86], 0.05), 11.3, 0.7)
    place(fx, fail_wah(), 11.75, 0.8)                                   # ankles gone
    place(fx, pulse(130, 0.12, 0.5, decay=0.05), 11.62, 0.8)            # defender hits the floor
    place(fx, sweep(150, 900, 0.5, 0.5), 12.6, 0.6)                     # flick up
    place(fx, sweep(800, 120, 0.35, 0.5), 13.55, 0.9)                   # the bicycle kick connects
    place(fx, explosion(0.4), 13.55, 0.4)
    # GOAL
    place(fx, explosion(1.2), GOAL, 1.0)
    place(fx, crowd8(CELEB - GOAL + 0.5), GOAL, 0.8)
    for ft in (GOAL + 0.2, GOAL + 0.7, GOAL + 1.2, GOAL + 1.8, GOAL + 2.3, CELEB + 0.5, CELEB + 1.4):
        place(fx, sweep(300, 1400, 0.25, 0.5, 0.6), ft - 0.25, 0.35)    # firework whistle up
        place(fx, explosion(0.35), ft, 0.5, 0.3)
    # kits unlocking
    k = 0
    tk = CELEB
    while tk < END:
        place(fx, arp([84 + (k % 3) * 2, 91 + (k % 3) * 2], 0.04), tk, 0.6, 0.2 if k % 2 else -0.2)
        tk += 0.42
        k += 1
    # end card pops
    for t0 in (END, END + 0.35, END + 0.7):
        place(fx, pop8(), t0, 0.9)
    place(fx, explosion(0.6), END + 0.7, 0.6)
    return hp(fx, 30)


def write(path, x):
    x = A.limiter(x / (np.abs(x).max() + 1e-9) * 1.25)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m, f = music(), sfx()
    write(os.path.join(OUT, "mix.wav"), m + f * 0.75)
    write(os.path.join(OUT, "sfx.wav"), f)
    print("audio written")
