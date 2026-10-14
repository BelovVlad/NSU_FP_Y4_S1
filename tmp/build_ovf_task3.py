import json
from pathlib import Path
from textwrap import dedent


path = next(Path('.').glob('*/02_*/Задача_3.ipynb'))
notebook = json.loads(path.read_text(encoding='utf-8'))
cells = [notebook['cells'][0]]


def add(kind, source):
    cell = {
        'cell_type': kind,
        'id': f'ovf3-{len(cells):02d}',
        'metadata': {},
        'source': dedent(source).strip().splitlines(keepends=True),
    }
    if kind == 'code':
        cell.update(execution_count=None, outputs=[])
    cells.append(cell)


def md(source):
    add('markdown', source)


def code(source):
    add('code', source)


md(r"""
## Пункт А: Вычисление интеграла.

### Точное значение и обозначения:

Используем формулы из лекции «Численное интегрирование» от 15.09.
Для проверки численных результатов сначала найдём точное значение:

$$
    I=\int_{-1}^{1}\frac{dx}{1+x^2}
    =\left.\arctan x\right|_{-1}^{1}
    =\frac{\pi}{2}.
$$

Разобьём отрезок $[a,b]$ на $N$ одинаковых интервалов:

$$
    h=\frac{b-a}{N}, \qquad x_i=a+ih, \qquad
    c_i=\frac{x_{i-1}+x_i}{2}, \qquad i=1,\ldots,N.
$$

Здесь $a=-1$, $b=1$, $f(x)=1/(1+x^2)$.
Как в лекции, обозначим численное значение через $S_h$, а остаточный член через

$$
    R(h)=I-S_h, \qquad \delta(h)=|R(h)|.
$$

В таблицах будем выводить и остаточный член со знаком, и абсолютную ошибку.
""")
code("""
import math
import numpy as np
import matplotlib.pyplot as plt

a = -1.0
b = 1.0
N = 64
I_exact = np.pi / 2.0


def f(x):
    return 1.0 / (1.0 + x**2)
""")
md(r"""
## Метод левых прямоугольников.

На каждом интервале заменяем функцию её значением в левом конце:

$$
    S_h^{(L)}=h\sum_{i=1}^{N}f(x_{i-1}).
$$
""")
code("""
def find_left(func, a, b, N):
    h = (b - a) / N
    x = np.linspace(a, b, N + 1)
    return h * np.sum(func(x[:-1]))
""")
md(r"""
## Метод правых прямоугольников.

Теперь используем значение функции в правом конце:

$$
    S_h^{(R)}=h\sum_{i=1}^{N}f(x_i).
$$
""")
code("""
def find_right(func, a, b, N):
    h = (b - a) / N
    x = np.linspace(a, b, N + 1)
    return h * np.sum(func(x[1:]))
""")
md(r"""
## Формула средних.

Высоту прямоугольника берём в середине интервала:

$$
    S_h^{(M)}=h\sum_{i=1}^{N}f(c_i).
$$
""")
code("""
def find_midpoint(func, a, b, N):
    h = (b - a) / N
    x = np.linspace(a, b, N + 1)
    c = (x[:-1] + x[1:]) / 2.0
    return h * np.sum(func(c))
""")
md(r"""
## Метод трапеций.

Заменяем график функции хордой на каждом интервале:

$$
    S_h^{(T)}=h\sum_{i=1}^{N}\frac{f(x_{i-1})+f(x_i)}{2}.
$$
""")
code("""
def find_trapezoid(func, a, b, N):
    h = (b - a) / N
    x = np.linspace(a, b, N + 1)
    return h * (func(x[0]) / 2.0
                + np.sum(func(x[1:-1])) + func(x[-1]) / 2.0)
""")
md(r"""
## Метод Симпсона.

Как в лекции, на каждом интервале используем два конца и середину:

$$
    S_h^{(S)}=\frac{h}{6}\sum_{i=1}^{N}
    \left[f(x_{i-1})+4f(c_i)+f(x_i)\right]
    =\frac{S_h^{(T)}+2S_h^{(M)}}{3}.
$$

Здесь $h$ — ширина целого интервала, а не расстояние до середины.
Поэтому коэффициент равен $h/6$. Число $N$ может быть любым положительным
целым: на каждом из $N$ интервалов дополнительно берётся середина.
""")
code("""
def find_simpson(func, a, b, N):
    h = (b - a) / N
    x = np.linspace(a, b, N + 1)
    c = (x[:-1] + x[1:]) / 2.0
    return h / 6.0 * np.sum(func(x[:-1]) + 4.0 * func(c) + func(x[1:]))
""")
md("""
## Сравнение результатов.

Вычислим интеграл всеми пятью методами при $N=64$.
Параметры можно изменить в первой ячейке с кодом и выполнить ячейки заново.
""")
code("""
methods = [
    ("Левые", find_left),
    ("Правые", find_right),
    ("Средние", find_midpoint),
    ("Трапеции", find_trapezoid),
    ("Симпсон", find_simpson),
]

print(f"Точное значение: I = {I_exact:.15f}")
print(f"N = {N}, h = {(b - a) / N:.8f}\\n")
print(f"{'Метод':<12} {'S_h':>19} {'I - S_h':>14} {'|I - S_h|':>14}")

for name, method in methods:
    value = method(f, a, b, N)
    error = I_exact - value
    print(f"{name:<12} {value:>19.15f} {error:>14.3e} {abs(error):>14.3e}")
""")
md(r"""
## Порядок точности методов.

### Теоретические оценки из лекции:

Для достаточно гладкой функции остаточные члены имеют вид

$$
\begin{aligned}
    R_L(h)&=\frac{h}{2}[f(b)-f(a)]+O(h^2),\\
    R_R(h)&=-\frac{h}{2}[f(b)-f(a)]+O(h^2),\\
    R_T(h)&=-\frac{h^2}{12}[f'(b)-f'(a)]+O(h^4),\\
    R_M(h)&=\frac{h^2}{24}[f'(b)-f'(a)]+O(h^4),\\
    R_S(h)&=-\frac{h^4}{2880}[f'''(b)-f'''(a)]+O(h^6).
\end{aligned}
$$

Следовательно, в общем случае левые и правые прямоугольники имеют первый
порядок, средние и трапеции — второй, Симпсон — четвёртый.
Если коэффициент главного члена ошибки равен нулю, на конкретной задаче
может наблюдаться более высокий порядок.

### Особенность левых и правых прямоугольников:

В нашей задаче $f(-1)=f(1)=1/2$, поэтому

$$
    S_h^{(R)}-S_h^{(L)}=h[f(b)-f(a)]=0.
$$

Кроме того,

$$
    S_h^{(T)}=\frac{S_h^{(L)}+S_h^{(R)}}{2}.
$$

Таким образом, для любой такой сетки

$$
    S_h^{(L)}=S_h^{(R)}=S_h^{(T)}
$$

в точной арифметике. При вычислениях возможны различия на уровне округления.
Член ошибки порядка $h$ исчезает, и оба метода прямоугольников здесь
имеют **второй порядок**.

Для нашей функции

$$
    f'(x)=-\frac{2x}{(1+x^2)^2}, \qquad
    f'(1)-f'(-1)=-1.
$$

Поэтому

$$
    R_L(h)=R_R(h)=R_T(h)=\frac{h^2}{12}+O(h^4), \qquad
    R_M(h)=-\frac{h^2}{24}+O(h^4).
$$

При достаточно мелкой сетке левые, правые и трапеции дают значение ниже
точного, а средние — выше. Ошибка средних примерно вдвое меньше ошибки трапеций.

### Особенность метода Симпсона:

Вычислим третью производную:

$$
    f'''(x)=\frac{24x(1-x^2)}{(1+x^2)^4}, \qquad
    f'''(-1)=f'''(1)=0.
$$

По лекционной формуле главный член ошибки Симпсона также равен нулю:

$$
    R_S(h)=-\frac{h^4}{2880}[f'''(1)-f'''(-1)]+O(h^6)
    =O(h^6).
$$

Для этого интеграла наблюдается **шестой порядок**. Это свойство выбранной
функции и границ интегрирования; общий порядок метода остаётся четвёртым.
""")
md(r"""
### Численная проверка порядка:

Увеличим число интервалов вдвое: $N\to2N$, то есть $h\to h/2$.
Если $\delta(h)\approx C h^p$, то

$$
    \frac{\delta(h)}{\delta(h/2)}\approx2^p, \qquad
    p_{\mathrm{набл}}=\log_2\frac{\delta(h)}{\delta(h/2)}.
$$

Для второго порядка ошибка уменьшается примерно в $4$ раза, для шестого —
в $64$ раза. Используем сетки $N=4,8,16,32,64$: на слишком мелких сетках
ошибка Симпсона сравнивается с ошибкой округления и оценка порядка теряет смысл.
""")
code("""
def find_convergence(func, a, b, exact, N_values, scale=1.0):
    results = {}

    for name, method in methods:
        values = np.array([scale * method(func, a, b, int(n)) for n in N_values])
        errors = np.abs(exact - values)
        orders = np.full(len(N_values) - 1, np.nan)
        mask = (errors[:-1] > 0.0) & (errors[1:] > 0.0)
        orders[mask] = np.log2(errors[:-1][mask] / errors[1:][mask])
        results[name] = (values, errors, orders)

    return results


def print_convergence(N_values, results):
    print("Абсолютные ошибки:")
    print(f"{'N':>6}" + "".join(f"{name:>13}" for name, _ in methods))

    for i, n in enumerate(N_values):
        print(f"{n:>6}" + "".join(f"{results[name][1][i]:>13.3e}"
                                 for name, _ in methods))

    print("\\nНаблюдаемый порядок при удвоении N:")
    print(f"{'N -> 2N':>12}" + "".join(f"{name:>13}" for name, _ in methods))

    for i in range(len(N_values) - 1):
        label = f"{N_values[i]} -> {N_values[i + 1]}"
        print(f"{label:>12}" + "".join(f"{results[name][2][i]:>13.4f}"
                                     for name, _ in methods))


N_values = np.array([4, 8, 16, 32, 64])
results_a = find_convergence(f, a, b, I_exact, N_values)
print_convergence(N_values, results_a)
""")
md(r"""
### График ошибок:

Таблица подтверждает второй порядок у левых, правых, средних и трапеций.
У Симпсона оценка на первом, грубом переходе $4\to8$ ещё отличается от
предельной; начиная с $8\to16$ она близка к шести.

На графике в двойном логарифмическом масштабе зависимость $\delta\sim h^p$
представляет собой прямую с наклоном $p$. Совпадающие ошибки левых,
правых прямоугольников и трапеций покажем одной линией.
""")
code("""
h_values = (b - a) / N_values

fig, ax = plt.subplots(figsize=(7.2, 4.6))
ax.loglog(h_values, results_a["Трапеции"][1], "o-",
          label="Левые = правые = трапеции")
ax.loglog(h_values, results_a["Средние"][1], "s-", label="Средние")
ax.loglog(h_values, results_a["Симпсон"][1], "^-", label="Симпсон")
ax.loglog(h_values, h_values**2 / 12.0, "k--", alpha=0.6, label=r"$h^2/12$")
reference6 = results_a["Симпсон"][1][-1] * (h_values / h_values[-1])**6
ax.loglog(h_values, reference6, ":", color="gray", label=r"$C h^6$")
ax.set_xlabel("Шаг сетки h")
ax.set_xticks(h_values)
ax.set_xticklabels([f"{h:g}" for h in h_values])
ax.tick_params(axis="x", which="minor", labelbottom=False)
ax.set_ylabel(r"Абсолютная ошибка $|I-S_h|$")
ax.set_title(r"Интеграл $1/(1+x^2)$ на $[-1,1]$")
ax.grid(True, which="both", alpha=0.3)
ax.legend()
fig.tight_layout()
plt.show()
""")
md(r"""
## Пункт Б: Вычисление функции ошибок.

### Интегральное представление:

Вычислим функцию, указанную в условии:

$$
    \operatorname{erf}(x)=\frac{2}{\sqrt{\pi}}\int_0^x e^{-t^2}\,dt.
$$

Используем те же пять методов с подынтегральной функцией $g(t)=e^{-t^2}$,
границами $a=0$, $b=x$ и множителем $2/\sqrt{\pi}$.
Для проверки возьмём `math.erf(x)` из стандартной библиотеки Python;
сама программа интегрирует функцию нашими методами.

При $x<0$ шаг $h=x/N$ отрицателен, что автоматически учитывает направление
интегрирования. При $x=0$ интеграл равен нулю.
""")
code("""
def g(t):
    return np.exp(-t**2)


def find_erf(x, N=64, method=find_simpson):
    return 2.0 / np.sqrt(np.pi) * method(g, 0.0, x, N)
""")
md("""
### Значения функции и ошибки:

Для примера возьмём $x=-2,-1,0,0.5,1,2$ и $N=64$.
В таблице приведём значения, полученные методом Симпсона,
а ниже сравним все методы при $x=1$.
""")
code("""
x_values = [-2.0, -1.0, 0.0, 0.5, 1.0, 2.0]
N_erf = 64

print(f"N = {N_erf}, метод Симпсона\\n")
print(f"{'x':>6} {'erf численно':>19} {'math.erf(x)':>19} {'Абс. ошибка':>14}")

for x in x_values:
    value = find_erf(x, N_erf)
    exact = math.erf(x)
    print(f"{x:>6.1f} {value:>19.15f} {exact:>19.15f} {abs(exact - value):>14.3e}")
""")
code("""
x_erf = 1.0
erf_exact = math.erf(x_erf)

print(f"x = {x_erf}, N = {N_erf}, math.erf(x) = {erf_exact:.15f}\\n")
print(f"{'Метод':<12} {'erf численно':>19} {'Точное - числ.':>15} {'Абс. ошибка':>14}")

for name, method in methods:
    value = find_erf(x_erf, N_erf, method)
    error = erf_exact - value
    print(f"{name:<12} {value:>19.15f} {error:>15.3e} {abs(error):>14.3e}")
""")
md(r"""
### Проверка обычного порядка точности:

На отрезке $[0,1]$ для $g(t)=e^{-t^2}$ имеем

$$
\begin{aligned}
    g(1)-g(0)&=e^{-1}-1\ne0,\\
    g'(1)-g'(0)&=-2e^{-1}\ne0,\\
    g'''(1)-g'''(0)&=4e^{-1}\ne0.
\end{aligned}
$$

Поэтому главные члены ошибок не исчезают. Ожидаем первый порядок
для левых и правых прямоугольников, второй — для средних и трапеций,
четвёртый — для Симпсона. Множитель $2/\sqrt{\pi}$ не меняет порядок.
""")
code("""
N_values_erf = np.array([4, 8, 16, 32, 64])
results_erf = find_convergence(g, 0.0, x_erf, erf_exact, N_values_erf,
                               scale=2.0 / np.sqrt(np.pi))
print_convergence(N_values_erf, results_erf)
""")
code("""
h_values_erf = x_erf / N_values_erf

fig, ax = plt.subplots(figsize=(7.2, 4.6))
for (name, _), marker in zip(methods, ["o", "s", "^", "D", "v"]):
    ax.loglog(h_values_erf, results_erf[name][1], marker=marker, label=name)
ax.set_xlabel("Шаг сетки h")
ax.set_xticks(h_values_erf)
ax.set_xticklabels([f"{h:g}" for h in h_values_erf])
ax.tick_params(axis="x", which="minor", labelbottom=False)
ax.set_ylabel("Абсолютная ошибка erf(1)")
ax.set_title("Порядок точности при вычислении erf(1)")
ax.grid(True, which="both", alpha=0.3)
ax.legend()
fig.tight_layout()
plt.show()
""")
md(r"""
### Проверка свойств функции:

Из определения следуют $\operatorname{erf}(0)=0$ и
$\operatorname{erf}(-x)=-\operatorname{erf}(x)$, поскольку $e^{-t^2}$ — чётная функция.
Проверим эти свойства и максимальную ошибку на выбранных точках.
""")
code("""
print(f"erf(0) = {find_erf(0.0, N_erf):.1f}")
print(f"erf(-1) + erf(1) = {find_erf(-1.0, N_erf) + find_erf(1.0, N_erf):.3e}")
max_error = max(abs(find_erf(x, N_erf) - math.erf(x)) for x in x_values)
print(f"Максимальная ошибка Симпсона на выбранных точках: {max_error:.3e}")
""")
md(r"""
## Ответ.

Точное значение первого интеграла:

$$
    \boxed{I_{3a}=\frac{\pi}{2}\approx1.570796326794897}.
$$

Все пять методов приближаются к этому значению при уменьшении шага сетки.
Для $1/(1+x^2)$ на $[-1,1]$ левые и правые прямоугольники совпадают с трапециями
и имеют второй порядок; средние также имеют второй порядок, Симпсон — шестой.
Повышение порядка связано с исчезновением главных членов ошибки в этой задаче.

Функция ошибок вычисляется той же программой по её интегральному представлению.
Например,

$$
    \boxed{\operatorname{erf}(1)\approx0.842700792949715}.
$$

Для $\operatorname{erf}(1)$ расчёты подтверждают обычные порядки:
первый у левых и правых прямоугольников, второй у средних и трапеций,
четвёртый у Симпсона.
Значения интегралов, ошибки и наблюдаемые порядки выведены в таблицах выше.
""")

notebook['cells'] = cells
path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'Written {path}: {len(cells)} cells')
