"""Soundtrack for the kit tier-list TikTok: the drop video's phonk/drill beat
(reused from ../drop/audio.py) cut to 26 s, plus tier-list sounds: slams,
a rolling score ticker, a meme-style deep boom for the C-tier diss, crowd
roars for S-tier, and whooshes as each kit flies onto the board.

Writes rank/out/mix.wav (music + sfx) and rank/out/sfx.wav (sfx only).
"""
import importlib.util
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("drop_audio", os.path.join(HERE, "..", "drop", "audio.py"))
da = importlib.util.module_from_spec(spec)
spec.loader.exec_module(da)

DUR = 26.0
da.DUR, da.N, da.END = DUR, int(da.SR * DUR), 20.0
SR, tt, ad, lp, pink, bp = da.SR, da.tt, da.ad, da.lp, da.pink, da.bp
OUT = os.path.join(HERE, "out")
HOOK_END, SLOT = 2.0, 3.0
TIERS = ["S", "S", "S", "S", "S", "S"]          # reveal order, matches rank.js


def deep_boom():
    """Meme-style 'boom': a big low sine drop with a long tail."""
    t = tt(1.8)
    f = 38 + 70 * np.exp(-t / 0.08)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.004, 0.7)
    return np.tanh(y * 2.2) * 0.8 + lp(pink(1.8), 300) * ad(t, 0.002, 0.08) * 0.4


def thud():
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * ad(t, 0.001, 0.06) * 0.9


def sfx():
    fx = da.buf()
    da.place(fx, da.hit(), 0.0, 0.9)
    da.place(fx, da.swish(0.5), 0.0, 0.4)
    for k in range(1, 8):                                   # hook flicker
        da.place(fx, da.tick(), k * 0.25, 0.5)
    for i, tier in enumerate(TIERS):
        S = HOOK_END + i * SLOT
        da.place(fx, da.swish(0.3), S - 0.12, 0.5, 0.4)
        da.place(fx, da.hit(), S, 0.85)                     # card slams in
        u = 0.45
        while u < 1.5:                                      # score spinning
            da.place(fx, da.tick(), S + u, 0.55, 0.3 if int(u * 20) % 2 else -0.3)
            u += 0.07
        da.place(fx, da.hit(), S + 1.5, 0.9)                # score lands + tier stamp
        if tier == "C":
            da.place(fx, deep_boom(), S + 1.5, 1.0)
        if tier == "S":
            da.place(fx, da.roar(1.6, 20 + i), S + 1.5, 0.35 + 0.08 * i)   # crowd gets louder every time
        da.place(fx, da.swish(0.5), S + 2.2, 0.45, -0.4)    # flies to the board
        da.place(fx, thud(), S + 2.75, 0.8)
    da.place(fx, da.hit(), 20.0, 0.9)
    da.place(fx, da.roar(2.5, 40), 20.0, 0.5)
    da.place(fx, da.hit(), 23.0, 0.85)
    return da.hp(fx, 30)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m, f = da.music(), sfx()
    da.write(os.path.join(OUT, "mix.wav"), m + f * 0.6)
    da.write(os.path.join(OUT, "sfx.wav"), f)
    print("audio written")
