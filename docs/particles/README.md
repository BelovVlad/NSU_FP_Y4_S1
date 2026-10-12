# Particle Explorer

`particles.js` contains the original 49 records and 104 relationships, preserved without edits.
`extra-particles.js` adds the initial 151 distinct states. `remaining-particles.js` adds
the other 416 MC-numbered entries from the same database, including antiparticles,
for a total of 616 states. Composition, family, kaon-mixing and explicitly named
decay-product relationships remain available. Provenance is retained in the data
and this document; it is not displayed in the interaction UI.

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
python .github/scripts/complete_particle_catalogue.py
```

The browser needs no Python, network API, or third-party rendering library.
Missing measurements remain explicitly unknown; masses are never inferred from
the particle name. The complete import does not reuse a particle's decay channels
for its antiparticle when the shared table does not identify the antiparticle
parent. Exotic π₁ states have no definite valence assignment. Antiquark components
open the corresponding antiquark, and named antineutrino products are selectable.
`layout.js` partitions one regular hexagonal lattice into five touching root territories,
then subdivides each root into compact family patches. Every tile shares complete ribs
with its neighbours. Tile colours carry root identity and family shades; thicker root
contours separate mesons, baryons, quarks, bosons and leptons without coloured area fills.
Root headings occupy an empty band above the complete mosaic. Selecting a particle or
subgroup gives its patch a raised outline and shadow, while its full name appears in a
reserved badge above the map. The footprint stays fixed so neighbours remain tessellated.
Click root headings, subgroup borders or the active badge to drill down; wheel, pinch,
pan, search and minimap navigation remain available. Zoom-out stops at the current
viewport's overview scale and zoom-in stops at 4x.

`routes.js` builds a graph of shared hexagon ribs and computes continuous shortest paths.
Small parallel offsets separate interaction colours. Dark casings make routes readable
above cell borders. Terminal stems and arrowheads identify their destination; family
relations retain their undirected dashed style. Hover a related particle to highlight
its connection while fading the other routes. Routes are generated lazily for the
selected particle, never masked or hidden behind tile fills. They avoid symbols and
root headings. `contours.js` remains a standalone utility, unused by the atlas.

Validation:

```sh
node --test tests/particles-layout.test.cjs
python -m unittest discover -s tests -p test_particles_browser.py -v
```
