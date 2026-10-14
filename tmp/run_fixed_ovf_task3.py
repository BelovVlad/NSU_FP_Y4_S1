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

for index, values in [(19, 'h_values'), (27, 'h_values_erf')]:
    cell = notebook.cells[index]
    replacement = f'''# Подписываем только 5 делений, короткими числами.
ticks = np.geomspace(min({values}), max({values}), 5)
labels = []
for h in ticks:
    labels.append(f"{{h:.3g}}")
plt.xticks(ticks, labels)'''
    cell.source, count = re.subn(r'^plt\.xticks\([^\n]*\)$', replacement,
                                cell.source, flags=re.MULTILINE)
    assert count == 1
    if 'plt.tight_layout()' not in cell.source:
        cell.source = cell.source.replace('plt.show()', 'plt.tight_layout()\nplt.show()')

for index in (17, 26):
    cell = notebook.cells[index]
    cell.source = cell.source.replace('previous_error = 0',
                                      'previous_error = 0\n    previous_n = 0')
    cell.source = cell.source.replace(
        'order = round(math.log2(previous_error / error), 3)',
        'order = math.log(previous_error / error) / math.log(n / previous_n)\n'
        '            order = round(order, 3)')
    cell.source = cell.source.replace('previous_error = error',
                                      'previous_error = error\n        previous_n = n')

notebook.cells[16].source = r'''### Численная проверка порядка:

Вычислим интеграл при разных числах интервалов $N$.
Если $\delta(h)\approx C h^p$, а $h=(b-a)/N$, то порядок можно оценить так:

$$
    p_{\mathrm{набл}}=
    \frac{\ln(\delta_{N_1}/\delta_{N_2})}{\ln(N_2/N_1)}.
$$

При удвоении $N$ эта формула превращается в
$p_{\mathrm{набл}}=\log_2(\delta_N/\delta_{2N})$.
Для второго порядка ошибка уменьшается примерно в $4$ раза, для шестого —
в $64$ раза. Формула в коде работает и при увеличении $N$ на единицу.
Для первой сетки предыдущей ошибки ещё нет, поэтому выводим прочерк.
На слишком мелких сетках ошибка Симпсона сравнивается с ошибкой округления,
и оценка порядка теряет смысл.'''

notebook.cells[18].source = r'''### График ошибок:

Расчёт подтверждает второй порядок у левых, правых, средних и трапеций.
У Симпсона на грубой сетке оценка может отличаться от предельной;
при увеличении числа интервалов она приближается к шести.

На графике в двойном логарифмическом масштабе зависимость $\delta\sim h^p$
представляет собой прямую с наклоном $p$. Совпадающие ошибки левых,
правых прямоугольников и трапеций покажем одной линией.'''

nbformat.validate(notebook)
km = KernelManager(kernel_name='python3')
km.kernel_spec.argv[0] = sys.executable
NotebookClient(notebook, km=km, timeout=120,
               resources={'metadata': {'path': str(path.parent.resolve())}}).execute()
nbformat.validate(notebook)

plot = 0
for cell in notebook.cells:
    if cell.cell_type == 'code':
        assert cell.execution_count is not None
    for output in cell.get('outputs', []):
        assert output.output_type != 'error'
        if 'image/png' in output.get('data', {}):
            plot += 1
            Path(f'tmp/ovf_task3_plot_{plot}.png').write_bytes(
                base64.b64decode(output.data['image/png']))
assert plot == 2

copy = path.with_name('Задача_3_исправлено.ipynb')
nbformat.write(notebook, copy)
if path.read_text(encoding='utf-8') == original:
    nbformat.write(notebook, path)
    print('Original notebook updated.')
else:
    print('Original changed during execution; preserved those edits.')
print('Fresh executed copy:', copy)
print('PASS: every code cell executed, both plots regenerated and saved.')
