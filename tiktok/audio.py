"""kits4u TikTok soundtrack, synthesised from scratch (no samples, so it is
free to use anywhere). 120 BPM, A minor, 34.5 seconds.

Music: an upbeat house groove (punchy kick, claps, shaker, a bass with
enough upper harmonics to carry on phone speakers, tresillo piano stabs)
under an original terrace-style "oh-oh" crowd chant.
Sound effects are stadium sounds: crowd, ball kicks, referee's whistle,
applause, soft swishes and pops.

Writes:
  out/mix.wav    music + sound effects
  out/sfx.wav    sound effects only (for adding a trending sound in TikTok)
  out/music.wav  music only
"""
import os
import wave

import numpy as np
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

SR = 44100
# The visuals are written in "story" seconds (0–22) and played back slower.
# These knots must match TIME_STORY / TIME_VIDEO in scene.js.
STORY_KNOTS = (0, 2, 5, 8, 9, 10, 11, 14, 18, 22)
VIDEO_KNOTS = (0, 3, 7.5, 13.5, 15.5, 17.5, 19.5, 24, 29, 34.5)


def V(t):
    """Story time → video time."""
    return float(np.interp(t, STORY_KNOTS, VIDEO_KNOTS))


DUR = VIDEO_KNOTS[-1]
N = int(SR * DUR)
BEAT = 0.5
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
rng = np.random.default_rng(2010)

# timings shared with the visuals (scene.js / game.js), in story seconds
CUTS = (2, 5, 8, 9, 10, 11, 14, 18)
SHOTS = ((11.55, 11.8), (12.05, 12.3), (12.55, 12.8), (13.3, 13.55), (13.6, 13.82))
PICKUPS = (12.08, 12.6, 13.15)


# ---------------------------------------------------------------- helpers
def buf():
    return np.zeros((N, 2))


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def pink(d):
    """Pink-ish noise: smoother and less hissy than white noise."""
    w = noise(d)
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(len(w), 1 / SR)
    spec /= np.sqrt(np.maximum(f, 20))
    y = np.fft.irfft(spec, len(w))
    return y / (np.abs(y).max() + 1e-9)


def sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return sosfilt(sos("low", f, order), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(sos("high", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(sos("band", [lo, hi], order), x, axis=0)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ad(t, a, d):
    """Attack/decay envelope with a smooth (raised-cosine) attack."""
    att = np.where(t < a, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1)), 1.0)
    return att * np.exp(-np.clip(t - a, 0, None) / d)


def edge(x, ms=3):
    """Short fades at both ends so nothing clicks."""
    n = min(len(x) // 2, int(SR * ms / 1000))
    if n > 0:
        r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
        x[:n] *= r if x.ndim == 1 else r[:, None]
        x[-n:] *= r[::-1] if x.ndim == 1 else r[::-1, None]
    return x


def pan2(sig, pan):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([sig * l, sig * r], axis=1) * 1.414


def place(dst, sig, t0, gain=1.0, pan=0.0):
    sig = edge(np.array(sig, dtype=float))
    if sig.ndim == 1:
        sig = pan2(sig, pan)
    i = int(round(t0 * SR))
    j0 = max(0, -i)
    n = min(len(sig) - j0, N - max(i, 0))
    if n > 0:
        dst[max(i, 0):max(i, 0) + n] += sig[j0:j0 + n] * gain


def sweep_bp(x, f0, f1, q=0.5, block=256):
    """Band-pass with a centre frequency that glides from f0 to f1."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        k = b / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** k
        s = sos("band", [max(40, fc * (1 - q)), min(SR / 2 - 200, fc * (1 + q))])
        if zi is None:
            zi = np.zeros((s.shape[0], 2))
        y, zi = sosfilt(s, x[b * block:(b + 1) * block], zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def reverb(x, secs=1.4, wet=0.2, tone=5000, predelay=0.012):
    t = tt(secs)
    ir = np.stack([noise(secs), noise(secs)], axis=1) * np.exp(-t * 6.9 / secs)[:, None]
    ir = lp(ir, tone)
    ir = hp(ir, 250)
    ir = np.concatenate([np.zeros((int(predelay * SR), 2)), ir])
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + y * wet


def limiter(x, ceiling=0.89, look=0.004, release=0.12):
    """Look-ahead peak limiter: smooth gain riding, no clipping."""
    peak = np.abs(x).max(axis=1)
    la = int(look * SR)
    peak = maximum_filter1d(peak, size=2 * la + 1)
    g = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    # release smoothing (one-pole on the gain), then a short attack smoothing
    a = np.exp(-1 / (release * SR))
    s = sosfilt(np.array([[1 - a, 0, 0, 1, -a, 0]]), g - 1) + 1
    g = np.minimum(g, s)
    g = sosfiltfilt(sos("low", 400, 1), g)
    g = np.minimum(g, 1.0)
    return x * g[:, None]


# ---------------------------------------------------------------- drums
def kick():
    t = tt(0.42)
    f = 52 + 110 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.002, 0.22)
    knock = np.sin(2 * np.pi * np.cumsum(f * 2.2) / SR) * ad(t, 0.001, 0.045) * 0.45   # audible on phone speakers
    click = bp(noise(0.42), 2000, 6000) * ad(t, 0.0005, 0.004) * 0.25
    return body + knock + click


def clap():
    t = tt(0.35)
    n = bp(pink(0.35), 900, 4500)
    env = np.zeros_like(t)
    for k, o in enumerate((0, 0.011, 0.022)):
        tk = np.clip(t - o, 0, None)
        env += (t >= o) * ad(tk, 0.001, 0.006 if k < 2 else 0.1)
    return n * env * 1.6


def hat(open_=False):
    d = 0.3 if open_ else 0.08
    t = tt(d)
    return bp(noise(d), 6500, 12000) * ad(t, 0.001, 0.08 if open_ else 0.018) * 0.35


def shaker():
    t = tt(0.1)
    return bp(noise(0.1), 4500, 9000) * ad(t, 0.02, 0.025) * 0.25


def tom(m):
    t = tt(0.4)
    f = mtof(m) * (1 + 0.6 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.002, 0.16) + bp(pink(0.4), 200, 2000) * ad(t, 0.001, 0.02) * 0.3


def crash():
    t = tt(2.2)
    return bp(pink(2.2), 3500, 12000) * ad(t, 0.003, 0.7) * 0.9


# ---------------------------------------------------------------- tonal
CHORDS = [(57, 60, 64, 69), (53, 57, 60, 65), (55, 60, 64, 67), (55, 59, 62, 67)]  # Am F C G
ROOTS = [45, 41, 48, 43]                                                          # A2 F2 C3 G2


def chord_at(t):
    return int(t // 2) % 4


def piano(m, d=0.45, vel=1.0):
    """Bright house piano: inharmonic partials, two detuned strings, hammer."""
    t = tt(d + 0.6)
    f = mtof(m)
    y = np.zeros_like(t)
    for det in (-0.0005, 0.0005):
        for h in range(1, 11):
            fh = f * h * np.sqrt(1 + 0.0004 * h * h) * (1 + det)
            if fh > 9000:
                break
            y += np.sin(2 * np.pi * fh * t + h) / h ** 1.15 * np.exp(-t * (1.6 + 0.9 * h))
    y *= ad(t, 0.002, 1.2) * np.where(t < d, 1.0, np.exp(-(t - d) / 0.08))
    y += bp(noise(d + 0.6), 1500, 5000) * ad(t, 0.0005, 0.006) * 0.08
    return y * 0.32 * vel


def bass(m, d=0.22):
    t = tt(d)
    f = mtof(m)
    y = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-h / 4.0) / h ** 0.5 for h in range(1, 11))
    y += np.sin(np.pi * f * t) * 0.5                       # sub an octave down
    env = np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.02) * (0.65 + 0.35 * np.exp(-t / 0.08))
    return y * env * 0.42


# terrace-style crowd chant on "oh" (formant synthesis, several singers)
OH = ((450, 80, 1.0), (800, 100, 0.55), (2830, 160, 0.12))
AH = ((730, 90, 1.0), (1090, 110, 0.5), (2440, 160, 0.12))


def formant_amp(f, vowel):
    return sum(g / (1 + ((f - F) / B) ** 2) for F, B, g in vowel) + 0.015


def voice(m, d, vowel=OH, seed=0, vib=0.012):
    r = np.random.default_rng(seed)
    t = tt(d)
    f0 = mtof(m + (r.random() - 0.5) * 0.3) * (1 + vib * np.sin(2 * np.pi * (4.8 + r.random()) * t + r.random() * 6))
    ph = 2 * np.pi * np.cumsum(f0) / SR
    base = mtof(m)
    y = np.zeros_like(t)
    for h in range(1, int(4200 / base)):
        y += np.sin(h * ph) * formant_amp(h * base, vowel) / h ** 0.6
    breath = bp(noise(d), 600, 3000) * 0.02
    env = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.09)
    return (y + breath) * env


def chant_note(m, d, voices=6, seed=0, vowel=OH):
    r = np.random.default_rng(seed)
    out = np.zeros((int((d + 0.05) * SR), 2))
    for v in range(voices):
        oct_ = -12 if v % 3 == 2 else 0                    # a few lower voices
        y = voice(m + oct_, d, vowel, seed * 31 + v)
        i = int(r.random() * 0.025 * SR)
        s = pan2(y, r.random() * 1.4 - 0.7)
        out[i:i + len(s)] += s[: len(out) - i]
    return out / voices


# original chant melody, 8 beats: (beat, length in beats, MIDI note)
CHANT = [(0, 1, 57), (1, .5, 57), (1.5, .5, 60), (2, 1.5, 57), (3.5, .5, 55),
         (4, 1, 52), (5, .5, 52), (5.5, .5, 55), (6, 1.8, 57)]


# ---------------------------------------------------------------- stadium sfx
def crowd_bed(d, seed=0):
    r = np.random.default_rng(seed)
    t = tt(d)
    n = bp(pink(d), 250, 2600)
    am = 0.7 + 0.3 * sum(np.sin(2 * np.pi * (0.2 + r.random() * 0.9) * t + r.random() * 6) for _ in range(4)) / 4
    return np.stack([n * am, np.roll(n, 3000) * am], axis=1) * 0.5


def roar(d, seed=0):
    """Crowd cheer: noise bed plus many open-voiced 'ahh' singers, swelling."""
    t = tt(d)
    out = crowd_bed(d, seed) * 1.6
    r = np.random.default_rng(seed)
    for v in range(10):
        m = 50 + r.integers(0, 14)
        out[: len(t)] += pan2(voice(m, d, AH, seed * 7 + v, 0.03) * 0.12, r.random() * 1.6 - 0.8)
    env = np.minimum(1, t / 0.35) * np.exp(-np.clip(t - 0.6, 0, None) / (d * 0.45))
    return reverb(out * env[:, None], 1.8, 0.3, 4000)


def whistle(d=0.55):
    """Referee's pea whistle: ~2.9 kHz tone with the pea's fast trill."""
    t = tt(d)
    f = 2900 + 70 * np.sin(2 * np.pi * 27 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.75 + 0.25 * np.sin(2 * np.pi * 27 * t))
    breath = bp(noise(d), 2400, 4200) * 0.25
    env = np.minimum(1, t / 0.015) * np.minimum(1, (d - t) / 0.03)
    return reverb((tone + breath) * env * 0.4, 1.0, 0.2, 7000)


def ball_kick():
    t = tt(0.25)
    f = 70 + 90 * np.exp(-t / 0.02)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.001, 0.05)
    slap = bp(noise(0.25), 700, 3500) * ad(t, 0.0005, 0.006) * 0.6
    return thump + slap


def swish(d=0.3):
    t = tt(d)
    n = sweep_bp(pink(d), 500, 2400, 0.7)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return n * env * 0.9


def pop():
    t = tt(0.06)
    f = 280 + 650 * np.exp(-t / 0.008)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.0008, 0.015) * 0.7


def tap():
    t = tt(0.04)
    return bp(noise(0.04), 1500, 5000) * ad(t, 0.0004, 0.004) * 1.2


def tick():
    t = tt(0.025)
    return bp(noise(0.025), 2200, 4200) * ad(t, 0.0004, 0.003) * 1.4


def applause(d, seed=0, rate=260):
    r = np.random.default_rng(seed)
    out = np.zeros((int((d + 0.2) * SR), 2))
    for _ in range(int(rate * d)):
        i = int(r.random() * d * SR)
        L = int(0.02 * SR)
        c = bp(noise(0.02), 900 + r.random() * 1500, 4000) * ad(tt(0.02), 0.0005, 0.003 + r.random() * 0.003)
        s = pan2(c * (0.3 + 0.7 * r.random()), r.random() * 1.8 - 0.9)
        out[i:i + L] += s[: len(out) - i]
    t = np.arange(len(out)) / SR
    env = np.minimum(1, t / 0.5) * np.minimum(1, (len(out) / SR - t) / 0.6)
    return reverb(out * env[:, None] * 0.8, 1.2, 0.3, 6000)


def big_hit():
    t = tt(2.5)
    low = np.sin(2 * np.pi * np.cumsum(45 + 60 * np.exp(-t / 0.06)) / SR) * ad(t, 0.002, 0.45)
    drum = tom(45)
    out = np.zeros(len(t))
    out[: len(drum)] += drum * 0.8
    return out + low


# ================================================================ arrange
FILL = (V(14) - 1.5, V(14))          # tom fill into the breakdown (22.5 → 24 s)
BREAK = (V(14), V(16))               # breakdown before the launch reveal (24 → 26.5 s)
OUTRO = 32.0                         # drums drop out for the last bars


def drums_on(t):
    return t < FILL[0] or BREAK[1] <= t < OUTRO


def music():
    drums, bassb, keys, voxb = buf(), buf(), buf(), buf()
    for i in range(int(DUR / BEAT)):
        b = i * BEAT
        if drums_on(b):
            place(drums, kick(), b, 0.9)
            if i % 2 == 1:
                place(drums, clap(), b, 0.5, 0.05)
            place(drums, hat(open_=(i % 4 == 3)), b + 0.25, 0.5, 0.3)
            for s in (0.125, 0.375):
                place(drums, shaker(), b + s, 0.6, -0.3)
    for k, m in enumerate((50, 50, 47, 47, 45, 45, 43, 43, 40, 40, 38, 38)):   # tom fill
        place(drums, tom(m), FILL[0] + k * 0.125, 0.55, -0.5 + k / 11)
    place(drums, kick(), OUTRO, 0.9)
    for t0 in (0.0, V(2), V(8), V(16), V(18)):
        place(drums, crash(), t0, 0.35, 0.15)

    # bass: root on the beat, bouncing octaves on the offbeats
    for i in range(int(DUR / 0.25)):
        t0 = i * 0.25
        if not drums_on(t0):
            continue
        pos = i % 8
        if pos in (0, 2, 3, 4, 6, 7):
            root = ROOTS[chord_at(t0)]
            place(bassb, bass(root + (12 if pos in (3, 7) else 0)), t0, 0.55)
    for t0 in (BREAK[0], OUTRO):
        place(bassb, bass(ROOTS[chord_at(t0)], 2.4), t0, 0.4)

    # house piano stabs (tresillo) — held chords in the breakdown and outro
    for bar in range(int(np.ceil(DUR / 2))):
        b0 = bar * 2.0
        chord = CHORDS[bar % 4]
        if BREAK[0] <= b0 < BREAK[1] - 1.0 or b0 >= OUTRO:
            for m in chord:
                place(keys, piano(m, 1.9, 0.8), b0, 1.0, (m - 60) / 20)
            continue
        if b0 >= FILL[0] and b0 < BREAK[0]:
            continue
        for e in (0, 3, 6, 10, 13):                      # stab positions in 16ths within the bar
            t0 = b0 + e * 0.125
            if BREAK[0] <= t0 < BREAK[1]:
                continue
            for m in chord:
                place(keys, piano(m, 0.22, 0.9 if e in (0, 10) else 0.7), t0, 1.0, (m - 60) / 20)

    # the chant
    for start in (0.0, 8.0, 16.0, BREAK[1], BREAK[1] + 4.0):
        for k, (bt, ln, m) in enumerate(CHANT):
            place(voxb, chant_note(m, ln * BEAT * 0.92, 6, int(start * 10) + k), start + bt * BEAT, 0.9)

    tgrid = np.arange(N) / SR
    on = np.array([drums_on(x) for x in (tgrid // BEAT) * BEAT])
    pump = np.where(on, 1 - 0.3 * np.exp(-(tgrid % BEAT) / 0.1), 1.0)
    bassb *= pump[:, None]
    keys *= (0.85 + 0.15 * pump)[:, None]

    mus = (hp(drums, 30) + lp(bassb, 2200) + reverb(hp(keys, 120), 1.2, 0.18)
           + reverb(hp(voxb, 120), 2.4, 0.35, 5000) * 1.1)
    fade = np.clip((DUR - tgrid) / 1.2, 0, 1) ** 1.5
    return mus * fade[:, None]


def sfx():
    fx = buf()
    place(fx, crowd_bed(DUR, 1), 0.0, 0.22)                    # stadium atmosphere throughout
    place(fx, roar(2.6, 2), 0.0, 0.7)                          # hook: crowd cheer
    place(fx, ball_kick(), 0.0, 0.9)
    for c in CUTS:                                             # soft swish on every cut
        place(fx, swish(), V(c) - 0.18, 0.45, -0.3 if c % 2 else 0.3)
    for k in range(1, 6):                                      # shirt cards sliding in
        place(fx, swish(0.22), V(5 + k * 0.5) - 0.12, 0.3, 0.4)
    for i in range(7):                                         # flags popping out
        place(fx, pop(), V(3.3 + i * 0.07), 0.6, -0.6 + i * 0.2)
    place(fx, tap(), V(4.18), 0.8)
    place(fx, swish(0.7), V(10.08), 0.35, 0.6)                 # shooting star
    place(fx, tap(), V(10.45), 0.8)
    place(fx, pop(), V(10.47), 0.8)
    place(fx, roar(1.4, 3), V(10.47), 0.45)
    for tf, th in SHOTS:                                       # Asteroid Rush
        place(fx, ball_kick(), V(tf), 0.7, 0.15)
        place(fx, roar(0.9, int(th * 100)), V(th), 0.35, -0.2)
    for tp in PICKUPS:
        place(fx, pop(), V(tp), 0.7, 0.2)
    place(fx, roar(BREAK[1] - BREAK[0], 5), BREAK[0], 0.35)     # crowd builds in the breakdown
    n, t0, t1, last = 26, 14.95, 16.0, 0                       # countdown ticks
    for s in range(int((t1 - t0) * SR / 64)):
        t = t0 + s * 64 / SR
        idx = int((1 - (1 - (t - t0) / (t1 - t0)) ** 3) * (n - 1))
        if idx != last:
            place(fx, tick(), V(t), 0.4, 0.25 if idx % 2 else -0.25)
            last = idx
    place(fx, big_hit(), V(16), 0.9)                           # the reveal
    place(fx, whistle(0.75), V(16), 0.55)
    place(fx, roar(3.5, 6), V(16), 0.9)
    place(fx, applause(DUR - V(18), 7), V(18), 0.7)            # end card
    for t0, d in ((32.3, 0.22), (32.7, 0.22), (33.1, 0.8)):    # full-time whistle
        place(fx, whistle(d), t0, 0.45)
    return hp(fx, 30)


def write(path, x):
    x = limiter(x / (np.abs(x).max() + 1e-9) * 1.25)
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m = music()
    f = sfx()
    write(os.path.join(OUT, "mix.wav"), m * 1.0 + f * 0.45)
    write(os.path.join(OUT, "sfx.wav"), f)
    write(os.path.join(OUT, "music.wav"), m)
    print("audio written")
