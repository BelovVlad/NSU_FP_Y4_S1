# Particle Explorer

`particles.js` contains the original 49 records and 104 relationships, preserved without edits.
`extra-particles.js` adds 50 distinct states, making 99 in total, and their composition,
family, kaon-mixing and explicitly named decay-product relationships.

The added masses, widths, lifetimes, charges and J/P/C quantum numbers come from the official
**PDG 2024** database bundled with `pdg==0.1.4`. Each added record stores the corresponding
particle and quantity PDG identifiers, including the selected branching-fraction identifiers.
Mass ranges and width limits retain the PDG display conventions; they are not converted to
precise measurements. K_S/K_L use the shared K⁰ mass entry and their separate lifetimes.
The kaon composition formulas neglect CP violation. Light scalar compositions are left
unspecified rather than assigning a definite valence model. Other displayed compositions
are conventional valence assignments; mixed states are marked explicitly.

Reference: S. Navas et al. (Particle Data Group), *Phys. Rev. D* **110**, 030001 (2024).
Data source: <https://pdg.lbl.gov/2024/api/index.html>, CC BY 4.0.

To reproduce the extension:

```sh
python -m pip install pdg==0.1.4
python .github/scripts/build_particle_extension.py
```

The browser needs no Python, network API, or third-party rendering library.
`layout.js` places seeded irregular clouds with collision clearance, allowing their luminous
outer layers to overlap. Positions stay stable while filtering and browsing the map.

Validation:

```sh
node --test tests/particles-layout.test.cjs
python -m unittest discover -s tests -p test_particles_browser.py -v
```
