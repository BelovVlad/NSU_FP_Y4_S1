from pathlib import Path

import nbformat


path = next(Path('.').glob('*/02_*/Задача_3.ipynb'))
notebook = nbformat.read(path, as_version=4)

for index, values in [(19, 'h_values'), (27, 'h_values_erf')]:
    cell = notebook.cells[index]
    old = f'plt.xticks({values}, {values})'
    new = f'''# Оставляем 5 коротких подписей, даже если точек много.
ticks = np.geomspace(min({values}), max({values}), 5)
labels = []
for h in ticks:
    labels.append(f"{{h:.3g}}")
plt.xticks(ticks, labels)'''
    assert old in cell.source
    cell.source = cell.source.replace(old, new)
    cell.source = cell.source.replace('plt.show()', 'plt.tight_layout()\nplt.show()')
    cell.outputs = []
    cell.execution_count = None

nbformat.write(notebook, path)
print('Updated both graph cells.')
