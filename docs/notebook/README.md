# Статический просмотрщик notebook

`viewer.html` загружает `.ipynb` как JSON и показывает сохранённые ячейки и
outputs. Python не выполняется. Для GitHub Pages не нужны сервер, сборка
notebook или nbviewer. Стили интерфейса находятся в `viewer.css`.

## Причина схлопывания формул

При прямом вызове `MathJax.tex2chtmlPromise()` создаётся CHTML, но требуется
отдельно обновить адаптивную таблицу стилей MathJax. Прежний viewer этого не
делал: `#MJX-CHTML-styles` отсутствовал, `mjx-math` и `mjx-itable` имели
`display: inline`, а содержимое `mjx-table` получало ширину 0 px.

В браузерном воспроизведении формулы (1)–(3) из «Интегралов» занимали
205–251 px по высоте при ширине `mjx-math` около 62 px. Отключение стилей
viewer не исправляло раскладку. Вызовы
`MathJax.startup.document.clear()` и `updateDocument()` при том же DOM
возвращали горизонтальную раскладку с высотой около 33 px.
Этот порядок обновления показан и в [примере в репозитории MathJax](https://github.com/mathjax/MathJax/issues/2397).

После исправления и увеличения базового текста тело этих формул имеет
ширину примерно 232 / 302 / 290 px и высоту около 39 px на desktop.
Тест измеряет именно `mjx-table` внутри tagged formula: ширина внешнего
контейнера сама по себе не обнаруживает эту регрессию.

## Рендеринг

1. Защитить TeX непрозрачными маркерами до Markdown-парсинга.
2. Обработать Markdown через marked и очистить HTML через DOMPurify.
3. Восстановить DOM placeholders только в текстовых узлах. В code и
   атрибутах оставить исходный текст, не вставлять HTML формулы.
4. После `DOMContentLoaded` дождаться запуска MathJax, получить метрики
   контейнеров и последовательно выполнить `tex2chtmlPromise()`.
5. Обновить CHTML stylesheet и дождаться шрифтов перед сообщением готовности.

TeX environments передаются MathJax без замены `align` на `aligned` и без
удаления `equation`. Старые CSS overrides удалены; CSS viewer не задаёт
размеры `mjx-*`. Горизонтальная прокрутка принадлежит внешним оболочкам
формул и таблиц. Текст: 16 px desktop / 15 px mobile, таблицы: 14 px.
Preview использует тот же читаемый размер. Заголовки таблиц не sticky.

Сохранены query-параметры, темы и сообщения `nsu-pdf-ready`,
`nsu-close-pdf`, `nsu-pdf-theme`, поиск и zoom 80–150% с localStorage.
При CSS zoom ширина в процентах уже учитывает масштаб; повторная компенсация
`100 / zoom` удалена, чтобы 80% не расширяли страницу.

Используется браузерная сборка highlight.js вместо CommonJS-сборки,
которая завершалась ошибкой `require is not defined`.

## Проверки

Из корня репозитория:

```sh
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python -m unittest discover -s tests -v
```

Для установленного Edge в PowerShell:

```powershell
$env:NOTEBOOK_BROWSER_CHANNEL='msedge'
python -m unittest discover -s tests -v
```

Тесты запускают временный HTTP-сервер только для проверки статических файлов.
Нужен доступ к CDN библиотек. Они проверяют все 14 notebook на desktop и
mobile, геометрию tagged math, локальную прокрутку таблиц, изображения,
подсветку кода и outputs, темы, поиск, масштабы и настоящий iframe/fullscreen
главной страницы. Дополнительный fixture покрывает delimiters, AMS,
attachments, безопасный HTML и форматы output, которых нет в текущих файлах.

Сравнение notebook с `771a9200a7e9346e5efe06da187e8410791b770f` показало:
предыдущие правки затрагивали Markdown source (delimiters, environments,
пробелы, в том числе Markdown hard breaks) и завершающие переводы строк.
Количество ячеек, code source, outputs, metadata и attachments не изменились.
Текущее исправление не меняет `.ipynb` и не восстанавливает `База/INDEX.ipynb`.
