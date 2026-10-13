"""kits4u TikTok soundtrack, synthesised from scratch (no samples, so it is
free to use anywhere). 120 BPM, A minor, 22 seconds.

Mixed for clarity: every sound has click-free envelopes, nothing is
saturated, non-bass parts are high-passed to keep the low end clean, and the
master runs through a smooth look-ahead limiter instead of a clipper.

Writes:
  out/mix.wav  music + sound effects
  out/sfx.wav  sound effects only (for adding a trending sound in TikTok)
"""
import os
import wave

import numpy as np
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

SR = 44100
DUR = 22.0
N = int(SR * DUR)
BEAT = 0.5
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
rng = np.random.default_rng(2010)

# timings shared with the visuals (scene.js / game.js)
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
    t = tt(0.4)
    f = 48 + 95 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.002, 0.2)
    click = bp(noise(0.4), 1500, 5000) * ad(t, 0.0005, 0.003) * 0.12
    return body + click


def clap():
    t = tt(0.35)
    n = bp(pink(0.35), 1100, 4200)
    env = np.zeros_like(t)
    for k, o in enumerate((0, 0.012, 0.024)):
        tk = np.clip(t - o, 0, None)
        env += (t >= o) * ad(tk, 0.001, 0.006 if k < 2 else 0.09)
    return n * env * 1.4


def hat(open_=False):
    d = 0.3 if open_ else 0.08
    t = tt(d)
    return bp(noise(d), 7000, 13000) * ad(t, 0.001, 0.07 if open_ else 0.016) * 0.32


def snare():
    t = tt(0.22)
    tone = np.sin(2 * np.pi * 200 * t) * ad(t, 0.001, 0.04)
    return bp(pink(0.22), 1800, 7000) * ad(t, 0.001, 0.06) * 1.6 + tone * 0.4


def swell(d):
    """Reverse-cymbal style swell."""
    t = tt(d)
    return hp(pink(d), 3500) * (t / d) ** 3 * 0.8


def crash():
    t = tt(2.2)
    return bp(pink(2.2), 4000, 12000) * ad(t, 0.003, 0.7) * 0.9


# ---------------------------------------------------------------- tonal
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]  # Am F C G
ROOTS = [33, 29, 36, 31]


def chord_at(t):
    return int(t // 2) % 4


def pluck(freq, d=0.35, bright=1.0):
    t = tt(d)
    y = np.zeros_like(t)
    for h, amp in ((1, 1.0), (2, 0.5), (3, 0.33), (4, 0.22), (5, 0.15), (6, 0.1), (7, 0.06)):
        y += np.sin(2 * np.pi * freq * h * t) * amp * np.exp(-t * (5 + h * 6 / bright))
    return lp(y * ad(t, 0.003, 0.18), 2600) * 0.5


def pad_chord(notes, d):
    t = tt(d)
    y = np.zeros_like(t)
    for m in notes:
        for det in (-0.08, 0.0, 0.07):
            f = mtof(m + 12 + det)
            ph = rng.random() * 6.283
            # soft "saw" from 6 harmonics
            for h in range(1, 7):
                y += np.sin(2 * np.pi * f * h * t + ph * h) / h
    y = lp(y, 1100, 2) / (len(notes) * 3 * 2.4)
    env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.35)
    return y * env


def bass_note(m, d):
    t = tt(d)
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.006) * np.minimum(1, (d - t) / 0.02) * (0.6 + 0.4 * np.exp(-t / 0.15))
    return y * env


# ---------------------------------------------------------------- sfx
def whoosh(d=0.6, peak=0.42, f0=250, f1=3800, pan_from=-0.7, pan_to=0.7):
    t = tt(d)
    n = sweep_bp(pink(d), f0, f1, 0.6)
    env = np.where(t < peak, 0.5 - 0.5 * np.cos(np.pi * t / peak), np.exp(-(t - peak) / 0.09))
    y = lp(n * env, 7000)
    pan = np.linspace(pan_from, pan_to, len(t))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([y * l, y * r], axis=1) * 2.4


def boom():
    t = tt(3.2)
    f = 34 + 52 * np.exp(-t / 0.22)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.004, 1.1)
    sub2 = np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * ad(t, 0.003, 0.25) * 0.25
    thump = lp(pink(3.2), 900) * ad(t, 0.002, 0.05) * 0.5
    air = bp(pink(3.2), 300, 2500) * ad(t, 0.01, 0.5) * 0.12
    return body + sub2 + thump + air


def sparkle(d=1.2, density=14, seed=0):
    """Airy glitter: a soft high noise shimmer with tiny grains, no pitched bells."""
    r = np.random.default_rng(seed)
    L = int((d + 0.6) * SR)
    t = np.arange(L) / SR
    air = bp(pink(L / SR), 5000, 11000)
    env = np.sin(np.pi * np.clip(t / (d + 0.4), 0, 1)) ** 2
    out = pan2(air * env * 0.35, 0.0)
    for _ in range(density * 3):
        i = int(r.random() * d * SR)
        g = bp(noise(0.03), 6000, 12000) * ad(tt(0.03), 0.001, 0.006) * (0.2 + 0.4 * r.random())
        out[i:i + len(g)] += pan2(g, r.random() * 1.6 - 0.8)[: L - i]
    return reverb(out, 1.0, 0.25, 9000)


def tap():
    t = tt(0.06)
    return np.sin(2 * np.pi * 1300 * t * (1 - 0.3 * t / 0.06)) * ad(t, 0.0008, 0.012) * 0.8


def tick():
    t = tt(0.025)
    return bp(noise(0.025), 2200, 4200) * ad(t, 0.0004, 0.003) * 1.4


def laser():
    t = tt(0.2)
    f = 420 + 1500 * np.exp(-t / 0.045)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * ad(t, 0.002, 0.05)
    return lp(y, 6000) * 0.35


def blast():
    t = tt(0.8)
    return lp(pink(0.8), 700) * ad(t, 0.003, 0.16) * 1.1 + np.sin(2 * np.pi * 55 * t) * ad(t, 0.003, 0.18) * 0.5


def coin():
    out = np.zeros(int(0.35 * SR))
    for k, m in enumerate((76, 83)):
        t = tt(0.16)
        f = mtof(m)
        y = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 6))
        y = lp(y * ad(t, 0.002, 0.05), 3500)
        i = int(k * 0.07 * SR)
        out[i:i + len(y)] += y * 0.5
    return out


def riser(d):
    t = tt(d)
    n = sweep_bp(pink(d), 300, 7000, 0.35)
    f = 220 * (8 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08
    return (n * 1.4 + tone) * (t / d) ** 2.2


def blip(m):
    t = tt(0.25)
    return lp(np.sin(2 * np.pi * mtof(m) * t) + 0.3 * np.sin(4 * np.pi * mtof(m) * t), 3000) * ad(t, 0.002, 0.045) * 0.5


# ================================================================ arrange
def drums_on(t):
    return t < 14 or 16 <= t < 20


def music():
    drums, bass, synth, padb = buf(), buf(), buf(), buf()
    for i in range(int(DUR / BEAT)):
        b = i * BEAT
        if drums_on(b):
            place(drums, kick(), b, 0.95)
            if i % 2 == 1:
                place(drums, clap(), b, 0.4, 0.08)
            place(drums, hat(open_=(i % 4 == 3)), b + 0.25, 0.5, 0.3)
            for s in (0.125, 0.375):
                place(drums, hat(), b + s, 0.18, -0.3)
    place(drums, kick(), 20.0, 0.95)
    for t0 in (0.0, 2.0, 8.0, 16.0, 18.0):
        place(drums, crash(), t0, 0.35, 0.15)
    for k in range(16):  # snare build into the launch reveal
        place(drums, snare(), 13.0 + k * 0.0625, 0.08 + 0.22 * k / 16)
    place(drums, swell(1.0), 15.0, 0.5)

    for i in range(int(DUR / 0.25)):
        t0 = i * 0.25
        if drums_on(t0) and i % 2 == 1:
            place(bass, bass_note(ROOTS[chord_at(t0)], 0.23), t0, 0.5)
    for t0 in (14.0, 20.0):
        place(bass, bass_note(ROOTS[chord_at(t0)], 2.0), t0, 0.35)

    pat = [0, 1, 2, 1, 2, 0, 1, 2]
    for i in range(int(21.5 / 0.125)):
        t0 = i * 0.125
        notes = CHORDS[chord_at(t0)]
        m = notes[pat[i % 8]]
        brk = 14 <= t0 < 16
        place(synth, pluck(mtof(m), bright=0.4 if brk else (0.7 if t0 < 2 else 1.0)), t0, 0.15 if brk else 0.2, 0.25 if i % 2 else -0.25)
    d = int(0.375 * SR)  # dotted-eighth ping-pong delay
    dl = hp(lp(synth, 4500), 300)
    synth[d:, 0] += dl[:-d, 1] * 0.22
    synth[d:, 1] += dl[:-d, 0] * 0.22

    for bar in range(11):
        place(padb, pad_chord(CHORDS[bar % 4], 2.0), bar * 2.0, 0.55)

    tgrid = np.arange(N) / SR
    on = np.array([drums_on(x) for x in (tgrid // BEAT) * BEAT])
    pump = np.where(on, 1 - 0.45 * np.exp(-(tgrid % BEAT) / 0.11), 1.0)
    bass *= pump[:, None]
    padb *= pump[:, None]
    synth *= (0.75 + 0.25 * pump)[:, None]

    synth = hp(synth, 140)
    padb = hp(padb, 150)
    drums_hi = hp(drums, 30)
    mus = drums_hi + lp(bass, 900) + reverb(synth, 1.4, 0.18) + reverb(padb, 2.2, 0.25)
    fade = np.clip((DUR - tgrid) / 1.4, 0, 1) ** 1.5
    return mus * fade[:, None]


def sfx():
    fx = buf()
    place(fx, boom(), 0.0, 0.35)                              # hook impact
    place(fx, whoosh(0.8, 0.06, 5000, 300, 0.6, -0.6), 0.0, 0.35)
    for c in CUTS:                                            # whoosh into every cut
        place(fx, whoosh(), c - 0.42, 0.42)
    for k in range(1, 6):                                     # shirt cards sliding in
        place(fx, whoosh(0.32, 0.2, 900, 5000, 0.6, -0.6), 5 + k * 0.5 - 0.2, 0.2)
    for i, m in enumerate((64, 67, 69, 71, 72, 74, 76)):      # flags popping out
        place(fx, blip(m), 3.3 + i * 0.07, 0.3, -0.6 + i * 0.2)
    place(fx, tap(), 4.18, 0.5)
    place(fx, sparkle(1.4, 9, 2), 0.2, 0.18)                  # stars
    place(fx, whoosh(0.42, 0.37, 2200, 7000, 0.8, -0.2), 10.06, 0.3)
    place(fx, tap(), 10.45, 0.5)
    place(fx, sparkle(0.5, 16, 3), 10.47, 0.45)
    place(fx, blast(), 10.47, 0.25)
    for tf, th in SHOTS:                                      # Asteroid Rush
        place(fx, laser(), tf, 0.5, 0.15)
        place(fx, blast(), th, 0.55, -0.15)
    for tp in PICKUPS:
        place(fx, coin(), tp, 0.4)
    place(fx, riser(2.0), 14.0, 0.3)                          # launch
    n, t0, t1, last = 26, 14.95, 16.0, 0
    for s in range(int((t1 - t0) * SR / 64)):
        t = t0 + s * 64 / SR
        idx = int((1 - (1 - (t - t0) / (t1 - t0)) ** 3) * (n - 1))
        if idx != last:
            place(fx, tick(), t, 0.3, 0.25 if idx % 2 else -0.25)
            last = idx
    place(fx, boom(), 16.0, 0.9)
    place(fx, sparkle(1.8, 26, 4), 16.02, 0.4)
    place(fx, whoosh(1.0, 0.04, 6000, 400, -0.6, 0.6), 16.0, 0.35)
    place(fx, sparkle(1.6, 14, 5), 18.05, 0.3)
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
    write(os.path.join(OUT, "mix.wav"), m * 0.85 + f * 0.7)
    write(os.path.join(OUT, "sfx.wav"), f)
    print("audio written")
