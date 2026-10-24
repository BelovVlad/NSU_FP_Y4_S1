// Data only: files that were renamed after links to them had been shared.
// Add an entry here when renaming a published PDF; the viewer keeps old links working.
export default {
  // Exact old path -> current file name in the same folder.
  files: {
    'СВЧ/02_Литература/lab_1_2026.pdf': 'Лаба 1 — Ферритовый циркулятор.pdf',
    'СВЧ/02_Литература/lab_2.pdf': 'Лаба 2 — Волноводный направленный ответвитель.pdf',
    'СВЧ/02_Литература/lab_3_2010.pdf': 'Лаба 3 — Измерение мощности в диапазоне СВЧ.pdf',
    'СВЧ/02_Литература/lab_4.pdf': 'Лаба 4 — Измерение сопротивлений волноводной измерительной линией.pdf',
    'СВЧ/02_Литература/lab_5.pdf': 'Лаба 5 — Взаимные четырёхполюсники без потерь.pdf',
    'СВЧ/02_Литература/lab_6_2026.pdf': 'Лаба 6 — Волноводные диафрагмы. Измерения импедометром.pdf',
    'СВЧ/02_Литература/lab_7_20206.pdf': 'Лаба 7 — Добротность объёмного резонатора.pdf',
    'СВЧ/02_Литература/lab_8.pdf': 'Лаба 8 — Поля в объёмном резонаторе. Метод малого возмущающего тела.pdf',
    'СВЧ/02_Литература/lab_9_2010.pdf': 'Лаба 9 — Рупорные и линзовые антенны.pdf'
  },
  // <subject>/<NN_Kind>/final.pdf became <subject>/<NN_Kind>/<subject>_<Kind>.pdf.
  finalPdfSubjects: ['ОВФ', 'ТДиСФ', 'ФКСВ', 'ФЭЧ', 'ФиХАиМ']
};
