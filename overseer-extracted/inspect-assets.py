from pathlib import Path
import json
import UnityPy

root = Path(r'C:\Users\bjise\Downloads\site\RWLD_copy\RainWorld_Data')
out = Path(__file__).parent
rows = []
for path in [*root.glob('*.assets'), *root.glob('StreamingAssets/aa/**/*.bundle')]:
    print('Reading', path.name, flush=True)
    env = UnityPy.load(str(path))
    for obj in env.objects:
        if obj.type.name not in ('Texture2D', 'TextAsset', 'Sprite'):
            continue
        data = obj.read()
        row = {'file': str(path), 'path_id': obj.path_id, 'type': obj.type.name, 'name': data.m_Name}
        rows.append(row)
        if any(x in data.m_Name.lower() for x in ('rainworld','uisprites','futile','noise')):
            print(row, flush=True)
(out / 'asset-inventory.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
print('Objects:', len(rows))
