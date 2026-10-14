import base64
import contextlib
import io
import math
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
NotebookClient(notebook, km=km, timeout=120,
               resources={'metadata': {'path': str(path.parent.resolve())}}).execute()
nbformat.validate(notebook)

images = 0
for index, cell in enumerate(notebook.cells):
    for output in cell.get('outputs', []):
        assert output.output_type != 'error', (index, output)
        if 'image/png' in output.get('data', {}):
            images += 1
            Path(f'tmp/ovf_task3_plot_{images}.png').write_bytes(
                base64.b64decode(output.data['image/png']))
    if index in [4, 6, 8, 10, 12]:
        text = ''.join(output.get('text', '') for output in cell.outputs)
        assert 'Интеграл:' in text and 'Абсолютная ошибка:' in text
        print(f'Cell {index}: {text.strip()}')

namespace = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec('import matplotlib; matplotlib.use("Agg")', namespace)
    for cell in notebook.cells:
        if cell.cell_type == 'code':
            exec(cell.source, namespace)

for name, method in namespace['methods']:
    for n in [1, 3, 8, 64]:
        assert abs(method(lambda x: 3, -0.5, 2, n) - 7.5) < 1e-13
        assert abs(method(lambda x: 3, 2, -0.5, n) + 7.5) < 1e-13
    assert abs(method(namespace['f'], -1, 1, 64) - math.pi / 2) < 0.001

for n in [1, 3, 8]:
    for degree in range(4):
        exact = (2**(degree + 1) - (-0.5)**(degree + 1)) / (degree + 1)
        actual = namespace['find_simpson'](lambda x: x**degree, -0.5, 2, n)
        assert abs(exact - actual) < 1e-12

for key, expected in [('errors_a', [2, 2, 2, 2, 6]),
                      ('errors_erf', [1, 1, 2, 2, 4])]:
    for (name, _), order in zip(namespace['methods'], expected):
        errors = namespace[key][name]
        actual = math.log2(errors[-2] / errors[-1])
        assert abs(actual - order) < 0.1, (name, actual, order)
        print(key, name, round(actual, 3))

assert namespace['find_erf'](0) == 0
assert abs(namespace['find_erf'](-1) + namespace['find_erf'](1)) < 1e-13
assert namespace['max_error'] < 1e-9
assert images == 2
nbformat.write(notebook, path)
print('PASS: all cells executed, per-method outputs saved, convergence verified, two plots saved.')
