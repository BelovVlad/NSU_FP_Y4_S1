"""Generate dimensionless isotherms and the Maxwell construction for lecture 6.

Run with Python and mpmath from any directory. The PDF build reads the .dat
files directly and does not require Python.
"""
from pathlib import Path
import mpmath as mp

mp.mp.dps = 30
ROOT = Path(__file__).resolve().parent
Z3 = mp.zeta(mp.mpf('1.5'))
Z5 = mp.zeta(mp.mpf('2.5'))


def write(name, rows):
    (ROOT / name).write_text(
        ''.join(f'{float(x):.10f} {float(y):.10f}\n' for x, y in rows),
        encoding='ascii',
    )


# v = V / Vc(T), p is normalized by the saturated Bose pressure.
bose = [(mp.mpf(1), mp.mpf(1))]
mu_volume = [(mp.mpf(1), mp.mpf(0))]
for j in range(1, 161):
    x = -mp.mpf(4) * (mp.mpf(j) / 160) ** 2
    v = Z3 / mp.polylog(mp.mpf('1.5'), mp.exp(x))
    if v <= 5:
        bose.append((v, mp.polylog(mp.mpf('2.5'), mp.exp(x)) / Z5))
        mu_volume.append((v, x))
write('lecture6_bose_isotherm.dat', bose)
write('lecture6_bose_mu_volume.dat', mu_volume)

fermi = []
for j in range(241):
    x = -mp.mpf(4) + mp.mpf(12) * j / 240
    g3 = -mp.re(mp.polylog(mp.mpf('1.5'), -mp.exp(x)))
    g5 = -mp.re(mp.polylog(mp.mpf('2.5'), -mp.exp(x)))
    v = Z3 / g3
    if mp.mpf('.45') <= v <= 5:
        fermi.append((v, g5 / Z5))
write('lecture6_fermi_isotherm.dat', sorted(fermi))

# Reduced van der Waals isotherm, T / Tcrit = 0.9.
t = mp.mpf('.9')
p = lambda v: 8 * t / (3 * v - 1) - 3 / v**2
primitive = lambda v: 8 * t / 3 * mp.log(3 * v - 1) + 3 / v
vl, vg, ps = mp.findroot(
    lambda l, g, q: (
        p(l) - q,
        p(g) - q,
        primitive(g) - primitive(l) - q * (g - l),
    ),
    (mp.mpf('.6'), mp.mpf('2.35'), mp.mpf('.65')),
)
write('lecture6_vdw_isotherm.dat', [
    (v, p(v)) for v in (mp.mpf('.55') + mp.mpf('3.95') * j / 240 for j in range(241))
])
print(f'Maxwell: vl={float(vl):.10f}, vg={float(vg):.10f}, p={float(ps):.10f}')
print(f'Bose: {len(bose)} points; Fermi: {len(fermi)} points')
