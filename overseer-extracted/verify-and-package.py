from pathlib import Path
import hashlib
import json
import zipfile
from PIL import Image

root = Path(__file__).parent
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

copies = json.loads((root / 'copied-files.json').read_text(encoding='utf-8-sig'))
for row in copies:
    expected = row['sha256'].lower()
    assert digest(Path(row['source'])) == expected, row['source']
    assert digest(root / row['output']) == expected, row['output']

pngs = [p for p in root.rglob('*.png') if 'tools' not in p.relative_to(root).parts]
for path in pngs:
    with Image.open(path) as img:
        img.verify()
sprites = json.loads((root / 'sprites.json').read_text(encoding='utf-8'))
for row in sprites:
    with Image.open(root / row['output']) as img:
        size = row['original_frame']['sourceSize']
        assert img.size == (size['w'], size['h']), row['name']
unresolved = json.loads((root / 'unresolved-assets.json').read_text(encoding='utf-8'))
assert not unresolved['required_core_missing']
types = json.loads((root / 'exported-types.json').read_text(encoding='utf-8-sig'))
assert len(list((root / 'code').rglob('*.cs'))) == len(types)
report = {'copied_files_verified': len(copies), 'source_hashes_still_match': True,
          'pngs_decoded': len(pngs), 'sprites_dimensions_verified': len(sprites),
          'decompiled_top_level_types': len(types),
          'required_core_assets_missing': [],
          'optional_gate_scene_missing': unresolved['optional_GateScene_missing'],
          'render_runtime_tested': False, 'standalone_compilation_tested': False}
(root / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
files = sorted(p for p in root.rglob('*') if p.is_file()
               and 'tools' not in p.relative_to(root).parts
               and p.name != 'checksums.sha256')
(root / 'checksums.sha256').write_text(''.join(
    f'{digest(p)}  {p.relative_to(root).as_posix()}\n' for p in files), encoding='utf-8')
archive = root.parent / 'overseer-render-kit.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for path in files + [root / 'checksums.sha256']:
        z.write(path, 'overseer-extracted/' + path.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
print(json.dumps({**report, 'archive': str(archive), 'archive_bytes': archive.stat().st_size}, indent=2))
