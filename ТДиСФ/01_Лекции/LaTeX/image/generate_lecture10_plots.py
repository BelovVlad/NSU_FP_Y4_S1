"""Generate the recoilless fraction f(T) of the 57Fe line for lecture 10.

Run with Python and mpmath from any directory. The PDF build reads the .dat
file directly and does not require Python.
"""
from pathlib import Path
import mpmath as mp

mp.mp.dps = 30
ROOT = Path(__file__).resolve().parent

# 57Fe: E = 14.4 keV, Mc^2 = 57 * 931.494 MeV, Theta_D = 430 K.
K_B = mp.mpf('8.617333262e-5')
E_GAMMA = mp.mpf('14.4e3')
MC2 = 57 * mp.mpf('931.494e6')
RECOIL = E_GAMMA**2 / (2 * MC2)
THETA = 430 * K_B


def exponent(y):
    """k^2 <x_k^2> = (6R/Theta) [1/4 + y^2 int_0^{1/y} z dz/(e^z-1)]."""
    if y == 0:
        return 6 * RECOIL / THETA / 4
    tail = mp.quad(lambda z: z / mp.expm1(z), [0, 1 / y])
    return 6 * RECOIL / THETA * (mp.mpf(1) / 4 + y**2 * tail)


def write(name, rows):
    (ROOT / name).write_text(
        ''.join(f'{float(x):.10f} {float(y):.10f}\n' for x, y in rows),
        encoding='ascii',
    )


write('lecture10_mossbauer_fraction.dat', [
    (y, mp.exp(-exponent(y))) for y in (mp.mpf(3) * j / 240 for j in range(241))
])

print(f'R = {float(RECOIL):.4e} eV, R/Theta = {float(RECOIL / THETA):.5f}')
for t in (0, 77, 300, 430):
    y = mp.mpf(t) / 430
    low = 3 * RECOIL / (2 * THETA) * (1 + 2 * mp.pi**2 / 3 * y**2)
    high = 6 * RECOIL / THETA * y
    print(f'T={t:3d} K: f={float(mp.exp(-exponent(y))):.4f}, '
          f'low-T={float(mp.exp(-low)):.4f}, high-T={float(mp.exp(-high)):.4f}')
