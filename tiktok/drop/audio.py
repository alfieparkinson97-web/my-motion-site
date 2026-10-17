"""Soundtrack for the "Who's That Kit?" drop TikTok, synthesised from scratch
(no samples, free to use). 120 BPM phonk/drill-style beat in A minor: a gritty
808 that carries on phone speakers, hard claps, rolling hats and a cowbell
hook, plus game sounds: countdown ticks, hint pops, reveal hits.

Writes drop/out/mix.wav (music + sfx), drop/out/sfx.wav (sfx only).
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from audio import (SR, ad, bp, clap, crash, hat, hp, limiter, lp, mtof, noise,   # noqa: E402
                   pan2, pink, pop, reverb, roar, swish, tick, tt, edge)

DUR = 30.0
N = int(SR * DUR)
BEAT = 0.5
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
HOOK_END, SLOT, REVEAL, KITS = 2.0, 4.0, 2.5, 6
END = HOOK_END + KITS * SLOT        # 26 s


def buf():
    return np.zeros((N, 2))


def place(dst, sig, t0, gain=1.0, pan=0.0):
    sig = edge(np.array(sig, dtype=float))
    if sig.ndim == 1:
        sig = pan2(sig, pan)
    i = int(round(t0 * SR))
    n = min(len(sig), N - i)
    if n > 0 and i >= 0:
        dst[i:i + n] += sig[:n] * gain


# ---------------------------------------------------------------- instruments
def kick():
    t = tt(0.3)
    f = 50 + 140 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.001, 0.12) + bp(noise(0.3), 2500, 7000) * ad(t, 0.0004, 0.003) * 0.3


def b808(m, d, glide_from=None):
    """Distorted 808: sine with a pitch drop and a tanh drive so its harmonics reach phone speakers."""
    t = tt(d)
    f1 = mtof(m)
    f = f1 * (1 + 1.2 * np.exp(-t / 0.012))
    if glide_from is not None:
        f = f * np.where(t < 0.09, (mtof(glide_from) / f1) ** (1 - t / 0.09), 1.0)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = ad(t, 0.002, 0.9) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(y * env * 3.2) * 0.55


def cowbell(m, d=0.16):
    """808 cowbell: two square waves a fifth-ish apart, band-passed, pitched to the note."""
    t = tt(d)
    f = mtof(m)
    sq = lambda fr: np.sign(np.sin(2 * np.pi * fr * t))
    y = bp(sq(f) + sq(f * 1.48), 500, 6000)
    return y * ad(t, 0.001, 0.07) * 0.3


def roll_hats(t0, n, dt):
    out = []
    for k in range(n):
        out.append((t0 + k * dt, 0.25 + 0.5 * k / n))
    return out


def hit():
    """Reveal impact: low punch + noise crack."""
    t = tt(1.5)
    low = np.sin(2 * np.pi * np.cumsum(40 + 90 * np.exp(-t / 0.05)) / SR) * ad(t, 0.001, 0.35)
    crack = bp(pink(1.5), 800, 6000) * ad(t, 0.001, 0.05) * 0.9
    return low + crack


def rev_swell(d=0.5):
    t = tt(d)
    return hp(pink(d), 2500) * (t / d) ** 3 * 0.9


# ---------------------------------------------------------------- arrange
CHORD_ROOTS = [33, 33, 29, 31]        # A, A, F, G (MIDI, octave 1) — one per bar
COWBELL = [69, 72, 76, 74, 72, 69, 67, 69, 69, 72, 76, 79, 76, 74, 72, 74]   # 16ths, A minor pentatonic-ish
COWBELL_B = [65, 69, 72, 69, 67, 72, 76, 74, 72, 69, 67, 64, 67, 69, 72, 71]


def music():
    drums, bass, bell = buf(), buf(), buf()
    bars = int(DUR / 2)
    for bar in range(bars):
        b0 = bar * 2.0
        root = CHORD_ROOTS[bar % 4]
        last_bar = b0 >= DUR - 2
        # 808 + kick: syncopated (16th positions)
        for k, (pos, ln) in enumerate(((0, 6), (6, 4), (10, 4), (14, 2))):
            t0 = b0 + pos * 0.125
            place(drums, kick(), t0, 0.9)
            glide = root + 12 if k == 2 else None
            note = root + (12 if k == 3 else 0)
            place(bass, b808(note, ln * 0.125 + 0.05, glide), t0, 1.0)
        # claps on 2 and 4
        for bt in (1, 3):
            place(drums, clap(), b0 + bt * BEAT, 0.8, 0.05)
        # 16th hats, with a triplet roll at the end of every second bar
        for s16 in range(16):
            if bar % 2 == 1 and s16 >= 12:
                continue
            place(drums, hat(), b0 + s16 * 0.125, 0.45 if s16 % 2 == 0 else 0.25, 0.3 if s16 % 2 else -0.3)
        if bar % 2 == 1:
            for t0, g in roll_hats(b0 + 1.5, 9, 0.5 / 9):
                place(drums, hat(), t0, g, 0.2)
        # cowbell hook (comes in after the hook bar)
        if bar >= 1:
            pat = COWBELL if bar % 2 == 0 else COWBELL_B
            for s16, m in enumerate(pat):
                if s16 % 4 == 3 and bar % 4 == 1:
                    continue
                place(bell, cowbell(m), b0 + s16 * 0.125, 0.7 if s16 % 4 == 0 else 0.5, 0.35 if s16 % 2 else -0.35)
    # ping-pong delay on the cowbell
    d = int(0.375 * SR)
    bell[d:, 0] += bell[:-d, 1] * 0.28
    bell[d:, 1] += bell[:-d, 0] * 0.28
    for t0 in (0.0, END):
        place(drums, crash(), t0, 0.45, 0.1)
    grit = bp(np.tanh(bass * 4.0), 180, 2200) * 0.55             # 808 harmonics for phone speakers
    mix = hp(drums, 30) * 1.15 + lp(bass, 3500) * 0.6 + grit + reverb(hp(bell, 300), 0.9, 0.18) * 2.0
    tgrid = np.arange(N) / SR
    mix *= (np.clip((DUR - tgrid) / 0.25, 0, 1))[:, None]          # hard stop at the end (loops on TikTok)
    return mix


def sfx():
    fx = buf()
    place(fx, hit(), 0.0, 0.8)
    place(fx, swish(0.5), 0.0, 0.4)
    for i in range(KITS):
        S = HOOK_END + i * SLOT
        place(fx, swish(0.3), S - 0.1, 0.45, 0.5)                    # card slides in
        for u in (0.0, 1.0, 2.0):                                     # 3-2-1 countdown
            place(fx, tick(), S + u, 0.9)
            place(fx, tick(), S + u + 0.06, 0.4)
        for u in (0.55, 1.35):                                        # hints pop up
            place(fx, pop(), S + u, 0.8)
        place(fx, rev_swell(0.5), S + REVEAL - 0.5, 0.6)             # reveal
        place(fx, hit(), S + REVEAL, 0.9)
        place(fx, crash(), S + REVEAL, 0.25)
        place(fx, swish(0.25), S + SLOT - 0.22, 0.3, -0.5)
    place(fx, roar(2.2, 9), HOOK_END + 5 * SLOT + REVEAL, 0.6)        # crowd for the final reveal
    place(fx, hit(), END, 0.9)
    place(fx, hit(), END + 2.0, 0.8)
    place(fx, roar(3.5, 10), END, 0.5)
    return hp(fx, 30)


def write(path, x):
    x = limiter(x / (np.abs(x).max() + 1e-9) * 1.25)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m, f = music(), sfx()
    write(os.path.join(OUT, "mix.wav"), m + f * 0.55)
    write(os.path.join(OUT, "sfx.wav"), f)
    print("audio written")
