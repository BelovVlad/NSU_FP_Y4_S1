# Particle Explorer

`particles.js` contains the original 49 records and 104 relationships, preserved without edits.
`extra-particles.js` adds 151 distinct states, making 200 in total, and their composition,
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
`layout.js` packs each state into a pointy hexagon on a regular staggered lattice.
Small gutters separate subgroups and the five root groups. Empty header bands reserve
space for group and subgroup names; colour is applied to tiles only, with related shades
within each root. Positions stay deterministic and stable while filtering and browsing.
Click a root heading to fit its group, a subgroup heading to fit its tiles, or any tile to
open the existing particle card. Wheel zoom, pan, pinch, search and minimap navigation
also remain available. Zoom-out stops at the overview scale for the current viewport;
zoom-in stops at 4x. Dragging is bounded so the map cannot disappear completely.
Only the selected particle's direct, enabled relationships are drawn. A mask keeps
connections outside tile interiors and reserved headers; arrow colours and dashed
styles retain the existing interaction legend. Symbol sizes use rendered glyph bounds
after fonts load. `contours.js` is retained for its standalone geometry utilities but
is no longer loaded by the honeycomb map.

Validation:

```sh
node --test tests/particles-layout.test.cjs
python -m unittest discover -s tests -p test_particles_browser.py -v
```
