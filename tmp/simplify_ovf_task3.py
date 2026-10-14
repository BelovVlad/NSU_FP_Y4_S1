import json
from pathlib import Path
from textwrap import dedent


path = next(Path('.').glob('*/02_*/Задача_3.ipynb'))
notebook = json.loads(path.read_text(encoding='utf-8'))


def replace(index, source):
    cell = notebook['cells'][index]
    cell['source'] = dedent(source).strip().splitlines(keepends=True)
    if cell['cell_type'] == 'code':
        cell['execution_count'] = None
        cell['outputs'] = []


replace(2, '''
    import math
    import numpy as np
    import matplotlib.pyplot as plt

    a = -1
    b = 1
    N = 64
    I_exact = math.pi / 2

    def f(x):
        return 1 / (1 + x**2)
''')

replace(4, '''
    def find_left(func, a, b, N):
        h = (b - a) / N
        total = 0
        for i in range(N):
            x = a + i * h
            total += func(x)
        return h * total

    result = find_left(f, a, b, N)
    print("Интеграл:", result)
    print("Остаток I - S:", I_exact - result)
    print("Абсолютная ошибка:", abs(I_exact - result))
''')

replace(6, '''
    def find_right(func, a, b, N):
        h = (b - a) / N
        total = 0
        for i in range(1, N + 1):
            x = a + i * h
            total += func(x)
        return h * total

    result = find_right(f, a, b, N)
    print("Интеграл:", result)
    print("Остаток I - S:", I_exact - result)
    print("Абсолютная ошибка:", abs(I_exact - result))
''')

replace(8, '''
    def find_midpoint(func, a, b, N):
        h = (b - a) / N
        total = 0
        for i in range(N):
            x = a + (i + 0.5) * h
            total += func(x)
        return h * total

    result = find_midpoint(f, a, b, N)
    print("Интеграл:", result)
    print("Остаток I - S:", I_exact - result)
    print("Абсолютная ошибка:", abs(I_exact - result))
''')

replace(10, '''
    def find_trapezoid(func, a, b, N):
        h = (b - a) / N
        total = 0
        for i in range(N):
            x1 = a + i * h
            x2 = a + (i + 1) * h
            total += (func(x1) + func(x2)) / 2
        return h * total

    result = find_trapezoid(f, a, b, N)
    print("Интеграл:", result)
    print("Остаток I - S:", I_exact - result)
    print("Абсолютная ошибка:", abs(I_exact - result))
''')

replace(12, '''
    def find_simpson(func, a, b, N):
        h = (b - a) / N
        total = 0
        for i in range(N):
            x1 = a + i * h
            x2 = a + (i + 1) * h
            middle = (x1 + x2) / 2
            total += func(x1) + 4 * func(middle) + func(x2)
        return h * total / 6

    result = find_simpson(f, a, b, N)
    print("Интеграл:", result)
    print("Остаток I - S:", I_exact - result)
    print("Абсолютная ошибка:", abs(I_exact - result))
''')

replace(14, '''
    # Название и функция для каждого метода.
    methods = [
        ("Левые", find_left),
        ("Правые", find_right),
        ("Средние", find_midpoint),
        ("Трапеции", find_trapezoid),
        ("Симпсон", find_simpson),
    ]

    print("Точное значение:", I_exact)
    print("Число интервалов:", N)

    for name, method in methods:
        result = method(f, a, b, N)
        error = I_exact - result
        print(f"{name}: S = {result:.12f}, R = {error:.3e}, ошибка = {abs(error):.3e}")
''')

replace(17, '''
    N_values = np.array([4, 8, 16, 32, 64])
    errors_a = {}

    for name, method in methods:
        print("\\nМетод:", name)
        errors = []
        previous_error = 0

        for n in N_values:
            result = method(f, a, b, n)
            error = abs(I_exact - result)
            errors.append(error)

            if previous_error > 0 and error > 0:
                order = round(math.log2(previous_error / error), 3)
            else:
                order = "—"

            print(f"N = {n}, ошибка = {error:.3e}, порядок = {order}")
            previous_error = error

        errors_a[name] = errors
''')

replace(19, '''
    h_values = (b - a) / N_values

    plt.figure(figsize=(7, 5))
    plt.loglog(h_values, errors_a["Трапеции"], "o-", label="Левые = правые = трапеции")
    plt.loglog(h_values, errors_a["Средние"], "s-", label="Средние")
    plt.loglog(h_values, errors_a["Симпсон"], "^-", label="Симпсон")
    plt.xticks(h_values, h_values)
    plt.minorticks_off()
    plt.xlabel("Шаг сетки h")
    plt.ylabel("Абсолютная ошибка")
    plt.title("Ошибки вычисления интеграла")
    plt.grid(True)
    plt.legend()
    plt.show()
''')

replace(21, '''
    def g(t):
        return math.exp(-t**2)

    def find_erf(x, N=64):
        integral = find_simpson(g, 0, x, N)
        return 2 / math.sqrt(math.pi) * integral

    print("erf(1):", find_erf(1))
    print("Абсолютная ошибка:", abs(math.erf(1) - find_erf(1)))
''')

replace(23, '''
    x_values = [-2, -1, 0, 0.5, 1, 2]
    N_erf = 64

    print("Метод Симпсона, N =", N_erf)
    for x in x_values:
        result = find_erf(x, N_erf)
        exact = math.erf(x)
        error = abs(exact - result)
        print(f"x = {x}: erf = {result:.12f}, math.erf = {exact:.12f}, ошибка = {error:.3e}")
''')

replace(24, '''
    x_erf = 1
    erf_exact = math.erf(x_erf)
    coefficient = 2 / math.sqrt(math.pi)

    print("Сравнение методов при x =", x_erf)
    print("Точное значение:", erf_exact)

    for name, method in methods:
        result = coefficient * method(g, 0, x_erf, N_erf)
        error = erf_exact - result
        print(f"{name}: erf = {result:.12f}, R = {error:.3e}, ошибка = {abs(error):.3e}")
''')

replace(26, '''
    N_values_erf = np.array([4, 8, 16, 32, 64])
    errors_erf = {}

    for name, method in methods:
        print("\\nМетод:", name)
        errors = []
        previous_error = 0

        for n in N_values_erf:
            result = coefficient * method(g, 0, x_erf, n)
            error = abs(erf_exact - result)
            errors.append(error)

            if previous_error > 0 and error > 0:
                order = round(math.log2(previous_error / error), 3)
            else:
                order = "—"

            print(f"N = {n}, ошибка = {error:.3e}, порядок = {order}")
            previous_error = error

        errors_erf[name] = errors
''')

replace(27, '''
    h_values_erf = x_erf / N_values_erf

    plt.figure(figsize=(7, 5))
    for name, method in methods:
        plt.loglog(h_values_erf, errors_erf[name], "o-", label=name)
    plt.xticks(h_values_erf, h_values_erf)
    plt.minorticks_off()
    plt.xlabel("Шаг сетки h")
    plt.ylabel("Абсолютная ошибка erf(1)")
    plt.title("Ошибки вычисления erf(1)")
    plt.grid(True)
    plt.legend()
    plt.show()
''')

replace(29, '''
    print("erf(0) =", find_erf(0, N_erf))
    print("erf(-1) + erf(1) =", find_erf(-1, N_erf) + find_erf(1, N_erf))

    max_error = 0
    for x in x_values:
        error = abs(find_erf(x, N_erf) - math.erf(x))
        if error > max_error:
            max_error = error

    print("Максимальная ошибка Симпсона:", max_error)
''')

for index in (1, 22, 30):
    source = ''.join(notebook['cells'][index]['source'])
    source = source.replace('В таблицах будем выводить', 'Под каждым методом будем выводить')
    source = source.replace('В таблице приведём значения', 'Выведем значения')
    source = source.replace('выведены в таблицах выше', 'выведены выше')
    replace(index, source)

path.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(path)
