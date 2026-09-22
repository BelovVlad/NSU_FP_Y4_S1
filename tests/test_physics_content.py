"""Coverage of the user's original constants, including both systems of units."""
import json
import math
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


def table_rows(notebook):
    return [[part.strip() for part in line.strip('|').split('|')]
            for cell in notebook['cells'] for line in ''.join(cell['source']).splitlines()
            if line.startswith('|') and not line.startswith('| ---')]


def numeric_values(text):
    text = text.replace(r'\,', '').replace(' ', '')
    return [float(m[1]) * 10 ** int(m[2] or m[3] or 0)
            for m in re.finditer(r'(\d+(?:\.\d+)?)(?:\\times10\^(?:\{(-?\d+)\}|(-?\d+)))?', text)]


class PhysicsContentTests(unittest.TestCase):
    def test_all_original_si_and_cgs_entries_remain_available(self):
        baseline = json.loads((ROOT/'tests/fixtures/physics_constants_coverage.json').read_text(encoding='utf-8'))
        notebook = json.loads((ROOT/'База/Практика/Физика/Физические константы.ipynb').read_text(encoding='utf-8'))
        rows = table_rows(notebook)
        self.assertEqual(sum(e['system']=='СИ' for e in baseline['entries']), 44)
        self.assertEqual(sum(e['system']=='СГС' for e in baseline['entries']), 42)
        for entry in baseline['entries']:
            with self.subTest(system=entry['system'], quantity=entry['original_name']):
                values = [value for row in rows if row[0]==entry['current_name'] and len(row)>entry['column']
                          for value in numeric_values(row[entry['column']])]
                self.assertTrue(any(math.isclose(value, entry['original_value'], rel_tol=baseline['relative_tolerance'])
                                    for value in values), 'Missing or inconsistent numerical value')


if __name__ == '__main__':
    unittest.main()
