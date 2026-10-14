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

grids = {
    17: '''# При N = 2000 шаг h = 2 / 2000 = 0.001.
N_values = np.array([4, 6, 8, 12, 16, 24, 32, 48, 64, 96,
                     128, 192, 256, 384, 512, 768, 1024, 1536, 2000])''',
    26: '''# При N = 1000 шаг h = 1 / 1000 = 0.001.
N_values_erf = np.array([4, 6, 8, 12, 16, 24, 32, 48, 64, 96,
                         128, 192, 256, 384, 512, 768, 1000])''',
}

for index, grid in grids.items():
    cell = notebook.cells[index]
    cell.source = re.sub(r'^N_values(?:_erf)? = [^\n]+',
                         lambda match: grid, cell.source, count=1)
    old = '''        if previous_error > 0 and error > 0:
            order = math.log(previous_error / error) / math.log(n / previous_n)
            order = round(order, 3)
        else:
            order = "—"'''
    new = '''        if previous_n == 0:
            order = "—"
        elif error < 1e-14 or previous_error < 1e-14:
            order = "ошибка слишком мала"
        else:
            order = math.log(previous_error / error) / math.log(n / previous_n)
            order = round(order, 3)'''
    assert old in cell.source
    cell.source = cell.source.replace(old, new)

for index in (19, 27):
    cell = notebook.cells[index]
    # On a logarithmic axis a genuinely zero error has no finite coordinate.
    cell.source = cell.source.replace(
        '# Деления оси X:',
        '# Нулевые ошибки пропускаем: логарифм нуля не определён.\n'
        'plt.yscale("log", nonpositive="mask")\n'
        '# Деления оси X:')

notebook.cells[18].source += '''

Расчёты продолжаются до $h=10^{-3}$. На мелкой сетке ошибка Симпсона
достигает уровня округления чисел Python, поэтому линия может перестать
убывать. Когда ошибка меньше $10^{-14}$, численный порядок уже не оцениваем.'''

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
for index in (17, 26):
    text = ''.join(output.get('text', '') for output in notebook.cells[index].outputs)
    print('Final rows for cell', index)
    print('\n'.join(text.strip().splitlines()[-5:]))

assert path.read_text(encoding='utf-8') == original, 'Notebook changed during execution.'
nbformat.write(notebook, path)
copy = path.with_name('Задача_3_исправлено.ipynb')
if copy.exists():
    nbformat.write(notebook, copy)
print('PASS: all cells executed; actual data in both graphs reach h = 0.001.')
