"""Build the bundled county catalogue from the official GUS 2026 KTS/TERYT table.

Development-only: python -m pip install --target artifacts/python-tools xlrd==2.0.2
python scripts/import-counties.py artifacts/gus-kts-teryt-2026.xls
Source URL and verification date are recorded in PROVIDERS.md.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path('artifacts/python-tools').resolve()))
import xlrd

book = xlrd.open_workbook(sys.argv[1])
sheet = book.sheet_by_name('Powiaty')
regions = {}
for i in range(1, book.sheet_by_index(0).nrows):
    code, _, name = book.sheet_by_index(0).row_values(i)
    regions[code] = name.title()
counties = []
for i in range(1, sheet.nrows):
    code, _, name = sheet.row_values(i)
    assert len(code) == 4 and code.isdigit()
    label = name.replace('Powiat m. ', '') + ' (city)' if name.startswith('Powiat m. ') else name.removeprefix('Powiat ') + ' county'
    counties.append({'code': code, 'name': label, 'region': regions[code[:2]]})
assert len(counties) == 380 and len({c['code'] for c in counties}) == 380
destination = pathlib.Path('src/providers/counties.json')
destination.write_text(json.dumps(counties, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(counties)} counties to {destination}')
