from pathlib import Path
import hashlib
import html
import json
import wave
import zipfile
from PIL import Image

ROOT = Path(__file__).parent
def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))

copies = read('copied-files.json')
for row in copies:
    assert sha(Path(row['source'])) == row['sha256'] == sha(ROOT / row['output']), row
for row in read('code-provenance.json'):
    assert sha(Path(row['source'])) == row['sha256'].lower()
for row in read('audio-provenance.json'):
    assert sha(ROOT / row['output']) == row['sha256']
audit = read('audio-bundle-audit.json')
assert sha(Path(audit['source'])) == audit['sha256']
sprites = read('sprites.json')
by_name = {x['name']:x for x in sprites}
variants = 0
for cap in range(4,10):
    for index in range(cap+1):
        for prefix in ('karma','smallKarma'):
            name = prefix + (str(index) if index < 5 else f'{index}-{cap}')
            assert name in by_name, name
            variants += 1
for sprite in sprites:
    with Image.open(ROOT / sprite['path']) as img:
        size = sprite['frame']['sourceSize']
        assert img.size == (size['w'],size['h'])
pngs = list(ROOT.rglob('*.png'))
for path in pngs:
    with Image.open(path) as img:
        img.verify()
audio = []
for path in sorted((ROOT / 'audio').rglob('*.wav')):
    with wave.open(str(path),'rb') as f:
        assert f.getnframes() > 0
        assert len(f.readframes(f.getnframes())) == f.getnframes()*f.getnchannels()*f.getsampwidth()
        audio.append({'path':path.relative_to(ROOT).as_posix(), 'name':path.stem,
                      'duration_seconds':f.getnframes()/f.getframerate(),
                      'sample_rate':f.getframerate(),'channels':f.getnchannels()})
(ROOT / 'audio-info.json').write_text(json.dumps(audio,indent=2),encoding='utf-8')

cards = []
for row in read('karma-levels.json'):
    level = row['level']
    for size in ('large','small'):
        alias = ROOT / f'levels/{size}/karma-{level:02}.png'
        assert sha(alias) == sha(ROOT / row[size]['path'])
    cards.append(f'<article><strong>{level}</strong><div><img src="levels/large/karma-{level:02}.png" alt="Карма {level}"></div>'
                 f'<div><img src="levels/small/karma-{level:02}.png" alt="Малый значок кармы {level}"></div>'
                 f'<code>{row["large"]["sprite"]}</code></article>')
players = ''.join(f'<li><label>{html.escape(a["name"])} · {a["duration_seconds"]:.2f} с</label>'
                  f'<audio controls preload="none" src="{a["path"]}"></audio></li>' for a in audio)
page = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Карма Rain World — извлечённые ресурсы</title><style>
body{background:#17191d;color:#ece5d8;font:16px system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px}
h1{font-size:28px}p{color:#bfbcb5;line-height:1.6}.levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
article{background:#23262b;border:1px solid #46484b;border-radius:8px;padding:16px;text-align:center}article div{min-height:80px;display:grid;place-items:center}
article img{image-rendering:pixelated;max-width:100%}code{font-size:12px;color:#bfbcb5}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
li{padding:12px;background:#23262b;border-radius:8px}label{display:block;margin-bottom:10px}audio{width:100%}a{color:#eecf83}
</style><h1>Карма Rain World: ресурсы</h1><p>Оригинальные значки уровней 1–10 при максимуме 10: сверху большой, ниже малый. Это просмотр материалов, не готовая игровая анимация.</p><section class="levels">'''
page += ''.join(cards) + '</section><h2>Звуки</h2><p>Исходные записи без игрового микширования; запуск вручную.</p><ul>' + players + '</ul><p>Описание: <a href="README.md">README</a>. Настройки событий: <a href="sounds.json">sounds.json</a>.</p></html>'
(ROOT / 'preview.html').write_text(page,encoding='utf-8')
report = {'source_copies_hash_verified':len(copies),'source_files_still_match':True,
          'top_level_types':len(read('code-provenance.json')),'sprites':len(sprites),
          'level_cap_size_combinations_verified':variants,'level_aliases_verified':20,
          'png_files_verified':len(pngs),'wav_files_decoded':len(audio),
          'runtime_animation_tested':False, 'unresolved':read('unresolved.json')}
(ROOT / 'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
files = sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name != 'checksums.sha256')
(ROOT / 'checksums.sha256').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT).as_posix()}\n' for p in files),encoding='utf-8')
archive = ROOT.parent / 'karma-render-kit.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files + [ROOT / 'checksums.sha256']:
        z.write(p,'karma-extracted/' + p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
print(json.dumps({**report,'archive_bytes':archive.stat().st_size},indent=2))
