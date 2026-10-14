import base64
import contextlib
import io
from pathlib import Path
import sys

import nbformat
from nbclient import NotebookClient
from jupyter_client import KernelManager


path = next(Path('.').glob('*/02_*/Задача_3.ipynb'))
notebook = nbformat.read(path, as_version=4)
nbformat.validate(notebook)
km = KernelManager(kernel_name='python3')
km.kernel_spec.argv[0] = sys.executable
NotebookClient(notebook, km=km, timeout=120, resources={'metadata': {'path': str(path.parent.resolve())}}).execute()
nbformat.validate(notebook)
nbformat.write(notebook, path)

images = 0
for i, cell in enumerate(notebook.cells):
    for output in cell.get('outputs', []):
        if output.output_type == 'error':
            raise AssertionError(f'Error output in cell {i}')
        if output.output_type == 'stream':
            print(f'CELL {i}:\n{output.text}')
        if 'image/png' in output.get('data', {}):
            images += 1
            target = Path(f'tmp/ovf_task3_plot_{images}.png')
            target.write_bytes(base64.b64decode(output.data['image/png']))
            print('PLOT', target)

# Execute the stored code independently for mathematical checks.
namespace = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec('import matplotlib; matplotlib.use("Agg")', namespace)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            exec(''.join(cell.source), namespace)

np = namespace['np']
f = namespace['f']
methods = namespace['methods']
for n in [1, 3, 8, 64]:
    vals = {name: method(f, -1.0, 1.0, n) for name, method in methods}
    assert abs(vals['Левые'] - vals['Трапеции']) < 1e-14
    assert abs(vals['Правые'] - vals['Трапеции']) < 1e-14
    assert abs(vals['Симпсон'] - (vals['Трапеции'] + 2 * vals['Средние']) / 3) < 1e-14
    for _, method in methods:
        assert abs(method(lambda x: np.ones_like(x) * 3.0, -0.5, 2.0, n) - 7.5) < 1e-13
        for x in [-2.0, -0.1, 0.0, 0.1, 2.0]:
            value = namespace['find_erf'](x, n, method)
            opposite = namespace['find_erf'](-x, n, method)
            assert abs(value + opposite) < 1e-13
            assert np.isfinite(value)
        assert namespace['find_erf'](0.0, n, method) == 0.0

# Simpson integrates cubic polynomials exactly, including odd N and reversed bounds.
for n in [1, 3, 8]:
    for a, b in [(-0.5, 2.0), (2.0, -0.5), (0.0, 0.0)]:
        for degree in range(4):
            exact = (b**(degree + 1) - a**(degree + 1)) / (degree + 1)
            actual = namespace['find_simpson'](lambda x: x**degree, a, b, n)
            assert abs(exact - actual) < 1e-12

for name, expected in [('Левые', 2), ('Правые', 2), ('Средние', 2), ('Трапеции', 2), ('Симпсон', 6)]:
    assert abs(namespace['results_a'][name][2][-1] - expected) < 0.1
for name, expected in [('Левые', 1), ('Правые', 1), ('Средние', 2), ('Трапеции', 2), ('Симпсон', 4)]:
    assert abs(namespace['results_erf'][name][2][-1] - expected) < 0.1
assert namespace['max_error'] < 1e-9
assert images == 2
assert all(c.execution_count is not None for c in notebook.cells if c.cell_type == 'code')
print('PASS: clean kernel execution; notebook schema; exact polynomial integrals; grid identities; erf properties; convergence orders; 2 saved plots.')
