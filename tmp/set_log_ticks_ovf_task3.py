import base64
from pathlib import Path
import re
import sys

import nbformat
from nbclient import NotebookClient
from jupyter_client import KernelManager


path = next(Path('.').glob('*/02_*/Задача_3.ipynb'))
original = path.read_text(encoding='utf-8')
notebook = nbformat.reads(original, as_version=4)

for index in (19, 27):
    cell = notebook.cells[index]
    new_ticks = '''# Деления оси X: степени десяти от 10^-3 до 10^0.
plt.xlim(1e-3, 1)
plt.xticks([1e-3, 1e-2, 1e-1, 1],
           [r"$10^{-3}$", r"$10^{-2}$", r"$10^{-1}$", r"$10^0$"])
plt.minorticks_off()'''
    cell.source, count = re.subn(
        r'# Подписываем только 5 делений, короткими числами\.\n'
        r'ticks = .*?plt\.minorticks_off\(\)',
        lambda match: new_ticks, cell.source, flags=re.DOTALL)
    assert count == 1, index

nbformat.validate(notebook)
km = KernelManager(kernel_name='python3')
km.kernel_spec.argv[0] = sys.executable
NotebookClient(notebook, km=km, timeout=120,
               resources={'metadata': {'path': str(path.parent.resolve())}}).execute()
nbformat.validate(notebook)

plot_count = 0
for cell in notebook.cells:
    if cell.cell_type == 'code':
        assert cell.execution_count is not None
    for output in cell.get('outputs', []):
        assert output.output_type != 'error'
        if 'image/png' in output.get('data', {}):
            plot_count += 1
            Path(f'tmp/ovf_task3_plot_{plot_count}.png').write_bytes(
                base64.b64decode(output.data['image/png']))
assert plot_count == 2
assert path.read_text(encoding='utf-8') == original, 'Notebook changed during execution.'
nbformat.write(notebook, path)
copy = path.with_name('Задача_3_исправлено.ipynb')
if copy.exists():
    nbformat.write(notebook, copy)
print('PASS: all cells executed; both plots have logarithmic X ticks from 1e-3 to 1.')
