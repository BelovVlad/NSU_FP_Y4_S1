"""Extract karma UI materials. Game files are read-only inputs."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import wave
import UnityPy
from PIL import Image

ROOT = Path(__file__).parent
GAME = Path(r'C:\Users\bjise\Downloads\site\RWLD_copy')
DATA = GAME / 'RainWorld_Data'
STREAM = DATA / 'StreamingAssets'
manifest = []

def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def write_json(name, value):
    path = ROOT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def copy(source, relative):
    dest = ROOT / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, dest)
    digest = sha(source)
    assert digest == sha(dest)
    manifest.append({'source': str(source), 'output': relative, 'sha256': digest})
    return relative

core = list((ROOT / 'code').glob('*.cs'))
visual = core + [ROOT / 'code/support/HUD.FadeCircle.cs']
text = '\n'.join(p.read_text(encoding='utf-8-sig') for p in visual)
literals = set(re.findall(r'"([^"\r\n]+)"', text))
effects = {'pixel','LinearGradient200','Futile_White','karmaRing','karmaRingReinforced',
           'smallKarmaRingReinforced','smallEmptyCircle','Circle4'}
env = UnityPy.load(str(DATA / 'resources.assets'))
textures, maps, objects = {}, {}, {}
for obj in env.objects:
    if obj.type.name not in ('TextAsset','Texture2D'):
        continue
    d = obj.read()
    if obj.type.name == 'Texture2D':
        textures[d.m_Name] = d
        objects[('Texture2D',d.m_Name)] = obj.path_id
    else:
        try:
            value = json.loads(d.m_Script)
        except (ValueError, TypeError):
            continue
        if isinstance(value, dict) and 'frames' in value:
            maps[d.m_Name] = (value, d.m_Script)
            objects[('TextAsset',d.m_Name)] = obj.path_id
sprites, atlases = [], []
for atlas, (meta, raw) in maps.items():
    selected = [(key, frame) for key, frame in meta['frames'].items()
                if re.match(r'^(?:smallKarma|karma)', Path(key).stem)
                or Path(key).stem in effects or Path(key).stem in literals]
    if not selected:
        continue
    image = textures[atlas].image.convert('RGBA')
    (ROOT / 'atlases').mkdir(exist_ok=True)
    image.save(ROOT / f'atlases/{atlas}.png')
    (ROOT / f'atlases/{atlas}.json').write_text(raw, encoding='utf-8')
    atlases.append({'name': atlas, 'source': str(DATA / 'resources.assets'),
                    'texture_path_id': objects[('Texture2D', atlas)],
                    'metadata_path_id': objects[('TextAsset', atlas)],
                    'size': image.size})
    for key, frame in selected:
        name = Path(key).stem
        assert not frame['rotated']
        f, offset, size = frame['frame'], frame['spriteSourceSize'], frame['sourceSize']
        box = (f['x'], f['y'], f['x']+f['w'], f['y']+f['h'])
        assert 0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height
        result = Image.new('RGBA', (size['w'], size['h']))
        result.paste(image.crop(box), (offset['x'], offset['y']))
        path = ROOT / 'sprites' / atlas / f'{name}.png'
        path.parent.mkdir(parents=True, exist_ok=True)
        result.save(path)
        sprites.append({'name': name, 'atlas': atlas, 'path': path.relative_to(ROOT).as_posix(), 'frame': frame})
write_json('sprites.json', sprites)
write_json('atlas-provenance.json', atlases)
by_name = {x['name']: x for x in sprites}
mapping = []
for level in range(1, 11):
    index = level - 1
    suffix = str(index) if index < 5 else f'{index}-9'
    row = {'level':level, 'game_index':index, 'game_cap':9}
    for size, prefix in [('large','karma'), ('small','smallKarma')]:
        name = prefix + suffix
        assert name in by_name, name
        row[size] = {'sprite':name, 'path':by_name[name]['path']}
        dest = ROOT / 'levels' / size / f'karma-{level:02}.png'
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / by_name[name]['path'], dest)
    mapping.append(row)
write_json('karma-levels.json', mapping)
(ROOT / 'textures').mkdir(exist_ok=True)
Image.new('RGBA',(16,16),(255,255,255,255)).save(ROOT / 'textures/Futile_White.png')
copy(STREAM / 'illustrations/bigkarma.png', 'reference/bigkarma.png')
for file in ('noise.png','noise2.png'):
    copy(STREAM / 'palettes' / file, 'textures/' + file)
seen, missing_includes = set(), set()
def shader(name):
    if name in seen:
        return
    seen.add(name)
    source = STREAM / 'shaders' / name
    if not source.exists():
        missing_includes.add(name)
        return
    copy(source, 'shaders/' + name)
    for dep in re.findall(r'#include\s+"([^"]+)"', source.read_text(encoding='utf-8-sig')):
        shader(dep)
for name in set(re.findall(r'Shaders\["([^"]+)"\]', text)) | {'Basic'}:
    shader(name + '.shader')

# Keep exact sound configuration and separate sample parameters from event parameters.
event_ids = set(re.findall(r'(?:SoundID|MSCSoundID)\.([A-Za-z0-9_]+)', text))
configs = [STREAM / 'soundeffects/sounds.txt', STREAM / 'mergedmods/soundeffects/sounds.txt']
sounds, lines_out = [], []
audio_files = [p for p in STREAM.rglob('*') if p.suffix.lower() in ('.wav','.ogg') and
               ('soundeffects' in str(p).lower() or 'loadedsoundeffects' in str(p).lower())]
copied_audio = {}
bundle_path = STREAM / 'AssetBundles/loadedsoundeffects'
audio_env = UnityPy.load(str(bundle_path))
clips = {}
for obj in audio_env.objects:
    if obj.type.name == 'AudioClip':
        data = obj.read()
        clips[data.m_Name.lower()] = (obj.path_id, data)
audio_provenance = []
for config in configs:
    layer = 'mergedmods' if 'mergedmods' in config.parts else 'base'
    copy(config, f'reference/sounds-{layer}.txt')
    for lineno, line in enumerate(config.read_text(encoding='utf-8-sig').splitlines(),1):
        clean = line.strip()
        commented = clean.startswith('//')
        body = clean[2:].strip() if commented else clean
        event = re.split(r'[/\s:]', body)[0]
        if event not in event_ids and not event.startswith(('MENU_Karma_', 'HUD_Karma_')):
            continue
        lines_out.append(f'{layer}:{lineno}: {line}')
        row = {'event':event, 'layer':layer, 'line':lineno, 'raw':line,
               'enabled':not commented and ':' in body, 'samples':[]}
        if ':' in body:
            left, right = body.split(':',1)
            row['event_options'] = left.strip().split('/')[1:]
            for entry in right.split(','):
                parts = entry.strip().split('/')
                sample = parts[0]
                matches = [p for p in audio_files if re.fullmatch(re.escape(sample) + r'(?:_\d+)?',p.stem,re.I)]
                exported = []
                for path in matches:
                    rel = path.relative_to(STREAM).as_posix()
                    target = 'audio/' + rel
                    if target not in copied_audio:
                        if path.stat().st_size:
                            copy(path,target)
                        else:
                            path_id, clip = clips[path.stem.lower()]
                            decoded = clip.samples
                            assert len(decoded) == 1, (path, list(decoded))
                            payload = next(iter(decoded.values()))
                            assert payload[:4] == b'RIFF' and len(payload) > 44
                            dest = ROOT / target
                            dest.parent.mkdir(parents=True, exist_ok=True)
                            dest.write_bytes(payload)
                            audio_provenance.append({'source':str(bundle_path), 'path_id':path_id,
                                                     'clip':clip.m_Name,'output':target,
                                                     'placeholder':str(path),'sha256':sha(dest)})
                        copied_audio[target] = str(path)
                    exported.append(target)
                row['samples'].append({'sample':sample,'options':parts[1:],'files':exported})
        sounds.append(row)
write_json('sounds.json', sounds)
(ROOT / 'sound-events.txt').write_text('\n'.join(lines_out), encoding='utf-8')
unconfigured = sorted(event_ids - {s['event'] for s in sounds if s['enabled']})
unresolved_samples = sorted({s['sample'] for e in sounds if e['enabled'] for s in e['samples'] if not s['files']})
write_json('audio-provenance.json',audio_provenance)
write_json('audio-bundle-audit.json',{'source':str(bundle_path),'sha256':sha(bundle_path),
    'audio_clip_count':len(clips),
    'exact_matches_for_unresolved':[n for n in unresolved_samples if n.lower() in clips],
    'related_names':[d.m_Name for _,d in clips.values() if 'uiwood' in d.m_Name.lower() or 'bell2' in d.m_Name.lower()]})
write_json('unresolved.json', {'unconfigured_or_disabled_events':unconfigured,
                              'samples_not_found_as_loose_files':unresolved_samples,
                              'external_shader_includes':sorted(missing_includes)})
copy(DATA / 'Managed/Assembly-CSharp.dll', 'reference/Assembly-CSharp.dll')
write_json('copied-files.json',manifest)
print(json.dumps({'sprites':len(sprites), 'atlases':len(atlases), 'levels':len(mapping),
                  'audio_files':len(copied_audio),'unresolved_samples':unresolved_samples,
                  'unconfigured_events':unconfigured},ensure_ascii=False,indent=2))
