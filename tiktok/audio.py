"""kits4u TikTok soundtrack, synthesised from scratch (no samples, so it is
free to use anywhere). 120 BPM, A minor, 22 seconds.

Writes:
  out/mix.wav  music + sound effects
  out/sfx.wav  sound effects only (for adding a trending sound in TikTok)
"""
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
DUR = 22.0
N = int(SR * DUR)
BEAT = 0.5
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
rng = np.random.default_rng(2010)


def buf():
    return np.zeros((N, 2))


def place(dst, sig, t0, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal into dst at time t0 (s), pan -1..1."""
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], axis=1)
    i = int(round(t0 * SR))
    if i >= N:
        return
    j0 = max(0, -i)
    n = min(len(sig) - j0, N - max(i, 0))
    if n > 0:
        dst[max(i, 0):max(i, 0) + n] += sig[j0:j0 + n] * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def noise(d):
    return rng.standard_normal(int(d * SR))


def sweep_filter(x, f0, f1, q=0.6, block=512):
    """Band-pass with a centre frequency that glides from f0 to f1."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        k = b / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** k
        lo, hi = max(30, fc * (1 - q)), min(SR / 2 - 100, fc * (1 + q))
        sos = butter(2, [lo, hi], "band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[b * block:(b + 1) * block]
        y, zi = sosfilt(sos, seg, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def reverb(x, secs=1.8, wet=0.25, bright=6000):
    t = tt(secs)
    ir = np.stack([noise(secs), noise(secs)], axis=1) * np.exp(-t * 6.0 / secs)[:, None]
    ir = lp(ir, bright)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + y * wet * 2.2


# ---------------------------------------------------------------- drums
def kick():
    t = tt(0.45)
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22)
    click = hp(noise(0.45), 3000) * np.exp(-t / 0.004) * 0.35
    return np.tanh((body + click) * 1.6)


def clap():
    t = tt(0.3)
    n = bp(noise(0.3), 900, 3200)
    env = np.zeros_like(t)
    for k, o in enumerate((0, 0.011, 0.022)):
        env += (t >= o) * np.exp(-np.clip(t - o, 0, None) / (0.008 if k < 2 else 0.11))
    return n * env * 0.9


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    t = tt(d)
    return hp(noise(d), 7500, 4) * np.exp(-t / (0.08 if open_ else 0.018)) * 0.5


def snare():
    t = tt(0.25)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    return (bp(noise(0.25), 1500, 8000) * np.exp(-t / 0.07) + tone * 0.5) * 0.7


def crash():
    t = tt(2.0)
    return hp(noise(2.0), 4500, 2) * np.exp(-t / 0.6) * 0.35


# ---------------------------------------------------------------- tonal
CHORDS = [  # A minor, F, C, G  (MIDI notes)
    (57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62),
]
ROOTS = [33, 29, 36, 31]


def chord_at(t):
    return int(t // 2) % 4


def pluck(freq, d=0.32, bright=1.0):
    t = tt(d)
    y = np.zeros_like(t)
    for h in range(1, 12):
        y += np.sin(2 * np.pi * freq * h * t + h) / h * np.exp(-t * (6 + h * 7 / bright))
    return y * np.exp(-t / 0.25) * 0.5


def saw(freq, t):
    return 2 * ((freq * t) % 1.0) - 1


def pad_chord(notes, d):
    t = tt(d)
    y = np.zeros_like(t)
    for m in notes:
        for det in (-0.12, 0.0, 0.11):
            y += saw(mtof(m + 12 + det), t + rng.random())
    y = lp(y, 1400, 2) / (len(notes) * 3)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    return y * a


def bass_note(m, d):
    t = tt(d)
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.35 * lp(saw(f, t), 600)
    return np.tanh(y * 1.4) * np.exp(-t / 0.5) * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.01)


# ---------------------------------------------------------------- sfx
def whoosh(d=0.55, peak=0.4, f0=300, f1=4500, pan_from=-0.8, pan_to=0.8):
    t = tt(d)
    n = sweep_filter(noise(d), f0, f1, 0.5)
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / 0.08))
    y = n * env
    pan = np.linspace(pan_from, pan_to, len(t))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([y * l, y * r], axis=1) * 1.4


def boom():
    t = tt(3.0)
    f = 30 + 70 * np.exp(-t / 0.18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1)
    rumble = lp(noise(3.0), 160) * np.exp(-t / 0.8) * 0.8
    hit = lp(noise(3.0), 2500) * np.exp(-t / 0.03) * 0.7
    return np.tanh((body * 1.3 + rumble + hit) * 1.8)


SPARK_NOTES = [81, 83, 85, 88, 90, 93, 95, 97, 100, 102]  # A major pentatonic, high


def sparkle(d=1.2, density=26, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((int((d + 0.6) * SR), 2))
    for _ in range(density):
        o = r.random() * d
        m = SPARK_NOTES[r.integers(len(SPARK_NOTES))]
        dd = 0.15 + r.random() * 0.35
        t = tt(dd)
        ping = np.sin(2 * np.pi * mtof(m) * t + 0.6 * np.sin(2 * np.pi * mtof(m) * 2.01 * t)) * np.exp(-t / (dd / 4))
        i = int(o * SR)
        p = r.random() * 1.6 - 0.8
        g = 0.3 + 0.5 * r.random()
        out[i:i + len(t), 0] += ping * np.cos((p + 1) * np.pi / 4) * g
        out[i:i + len(t), 1] += ping * np.sin((p + 1) * np.pi / 4) * g
    return reverb(out, 1.2, 0.45, 9000)


def tap():
    t = tt(0.08)
    return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.012) + hp(noise(0.08), 4000) * np.exp(-t / 0.004) * 0.4) * 0.8


def tick():
    t = tt(0.03)
    return hp(noise(0.03), 3000) * np.exp(-t / 0.0035) * 0.9 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.006) * 0.3


def laser():
    t = tt(0.18)
    f = 300 + 1700 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * 0.45


def blast():
    t = tt(0.7)
    return np.tanh(lp(noise(0.7), 900) * np.exp(-t / 0.15) * 2.5 + np.sin(2 * np.pi * 60 * t) * np.exp(-t / 0.2)) * 0.6


def riser(d):
    t = tt(d)
    f = 180 * (12 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    n = sweep_filter(noise(d), 400, 9000, 0.4)
    return (n * 0.9 + tone) * (t / d) ** 2


def blip(m):
    t = tt(0.22)
    return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t / 0.05) * 0.5


# ================================================================ arrange
def music():
    drums, bass, synth, padb = buf(), buf(), buf(), buf()
    # kick / clap / hats on the grid, with a breakdown at 14–16 and an outro after 20
    def drums_on(t):
        return (t < 14 or 16 <= t < 20)

    for i in range(int(DUR / BEAT)):
        b = i * BEAT
        if drums_on(b):
            place(drums, kick(), b, 1.0)
            if i % 2 == 1:
                place(drums, clap(), b, 0.55, 0.1)
            place(drums, hat(open_=(i % 4 == 3)), b + 0.25, 0.32, 0.35)
            for s in (0.125, 0.375):
                place(drums, hat(), b + s, 0.12, -0.35)
    place(drums, kick(), 20.0, 1.0)
    for t0 in (0.0, 2.0, 8.0, 16.0, 18.0):
        place(drums, crash(), t0, 0.8, 0.2)
    # snare build into the launch reveal
    for k in range(16):
        place(drums, snare(), 13.0 + k * 0.0625, 0.15 + 0.35 * k / 16, 0)

    # sub bass: offbeat-pumping eighths
    for i in range(int(DUR / 0.25)):
        t0 = i * 0.25
        if not drums_on(t0) or i % 2 == 0:
            continue
        place(bass, bass_note(ROOTS[chord_at(t0)], 0.24), t0, 0.55)
    for t0 in (14.0, 20.0):  # long notes in the breakdown/outro
        place(bass, bass_note(ROOTS[chord_at(t0)], 2.0), t0, 0.4)

    # 16th-note arp
    pat = [0, 1, 2, 1, 2, 0, 1, 2]
    for i in range(int(DUR / 0.125)):
        t0 = i * 0.125
        if t0 >= 21.5:
            break
        notes = CHORDS[chord_at(t0)]
        m = notes[pat[i % 8]] + 12 + (12 if i % 8 == 4 else 0)
        bright = 0.35 if 14 <= t0 < 16 else (0.6 if t0 < 2 else 1.0)
        place(synth, pluck(mtof(m), bright=bright), t0, 0.32 if not (14 <= t0 < 16) else 0.22, 0.4 if i % 2 else -0.4)
    # dotted-eighth stereo delay on the arp
    d = int(0.375 * SR)
    synth[d:, 0] += synth[:-d, 1] * 0.32
    synth[d:, 1] += synth[:-d, 0] * 0.32

    for bar in range(11):
        place(padb, pad_chord(CHORDS[bar % 4], 2.0), bar * 2.0, 0.5)

    # sidechain pump from the kick grid
    tt_ = np.arange(N) / SR
    ph = tt_ % BEAT
    pump = 1 - 0.65 * np.exp(-ph / 0.09)
    pump = np.where([drums_on(x) for x in (tt_ // BEAT) * BEAT], pump, 1.0)
    bass *= pump[:, None]
    padb *= pump[:, None]
    synth *= (0.5 + 0.5 * pump)[:, None]

    mus = drums + bass + reverb(synth, 1.6, 0.3) + reverb(padb, 2.4, 0.35)
    # fade the tail
    fade = np.clip((DUR - tt_) / 1.2, 0, 1) ** 1.5
    return mus * fade[:, None]


def sfx():
    fx = buf()
    # big hit on frame one for the hook
    place(fx, boom(), 0.0, 0.45)
    place(fx, whoosh(0.7, 0.05, 6000, 300, 0.6, -0.6), 0.0, 0.5)
    # whooshes into every cut
    for c in (2, 5, 8, 9, 10, 11, 14, 18):
        place(fx, whoosh(), c - 0.4, 0.55)
    # card slides
    for k in range(1, 6):
        place(fx, whoosh(0.3, 0.18, 800, 6000, 0.7, -0.7), 5 + k * 0.5 - 0.18, 0.25)
    # flags popping out on their lines + the tap on England
    for i, m in enumerate((76, 79, 81, 83, 84, 86, 88)):
        place(fx, blip(m), 3.3 + i * 0.07, 0.35, -0.6 + i * 0.2)
    place(fx, sparkle(0.6, 10, 1), 3.3, 0.35)
    place(fx, tap(), 4.18, 0.6)
    # stars: twinkles in the hook, shooting-star catch, launch burst, end card
    place(fx, sparkle(1.4, 14, 2), 0.2, 0.25)
    place(fx, whoosh(0.4, 0.36, 2000, 8000, 0.8, -0.2), 10.08, 0.4)
    place(fx, tap(), 10.45, 0.6)
    place(fx, sparkle(0.6, 30, 3), 10.47, 0.7)
    # Asteroid Rush: lasers and blasts
    for tf, th in ((11.55, 11.8), (12.05, 12.3), (12.55, 12.8), (13.05, 13.3), (13.55, 13.8)):
        place(fx, laser(), tf, 0.5, 0.2)
        place(fx, blast(), th, 0.5, -0.2)
    # launch: riser, odometer ticks, the boom and a burst of sparkles
    place(fx, riser(2.0), 14.0, 0.35)
    n, t0, t1 = 38, 14.95, 16.0
    last = 0
    for s in range(int((t1 - t0) * SR / 64)):
        t = t0 + s * 64 / SR
        k = 1 - (1 - (t - t0) / (t1 - t0)) ** 3
        idx = int(k * (n - 1))
        if idx != last:
            place(fx, tick(), t, 0.4, 0.3 if idx % 2 else -0.3)
            last = idx
    place(fx, boom(), 16.0, 1.0)
    place(fx, sparkle(1.8, 40, 4), 16.02, 0.8)
    place(fx, sparkle(1.6, 24, 5), 18.05, 0.55)
    return fx


def write(path, x):
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    x /= max(1e-9, np.abs(x).max()) / 0.89
    data = (x * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    m = music()
    f = sfx()
    write(os.path.join(OUT, "mix.wav"), m * 0.8 + f * 0.75)
    write(os.path.join(OUT, "sfx.wav"), f)
    print("audio written")
