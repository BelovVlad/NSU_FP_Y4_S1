"""Record published index counts, never infer upload times from file mtimes."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = 'docs/search-index/structure.json'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8')


def counts(payload, series):
    groups = {(g['subject'], g['section']): len(g['items']) for g in payload.get('groups', [])}
    return {s['id']: groups.get((s['subject'], s['section']), 0) for s in series}


def build():
    rules = json.loads((ROOT / 'Karma/rules.json').read_text('utf-8'))
    rows = []
    # First-parent avoids treating unpublished side-branch versions as site updates.
    for line in git('log', '--first-parent', '--reverse', '--format=%H %cI', '--', INDEX).splitlines():
        commit, timestamp = line.split(' ', 1)
        payload = json.loads(git('show', f'{commit}:{INDEX}'))
        rows.append({'at': datetime.fromisoformat(timestamp).astimezone(timezone.utc).isoformat(),
                     'counts': counts(payload, rules['series']), 'commit': commit})
    current = json.loads((ROOT / INDEX).read_text('utf-8'))
    current_counts = counts(current, rules['series'])
    rows.sort(key=lambda r: r['at'])
    # A newly built, not-yet-committed index is published by the same CI job.
    if not rows or rows[-1]['counts'] != current_counts:
        rows.append({'at': datetime.now(timezone.utc).isoformat(), 'counts': current_counts,
                     'source': 'index-build'})
    compact = []
    for row in rows:
        if not compact or row['counts'] != compact[-1]['counts']:
            compact.append(row)
    output = {'version': 1, 'rules': rules, 'observedFrom': compact[0]['at'],
              'snapshots': compact, 'currentCounts': current_counts,
              'indexGeneratedAt': current.get('generated_at')}
    path = ROOT / 'docs/search-index/karma-history.json'
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f'Karma history: {len(compact)} changes since {compact[0]["at"]}')


if __name__ == '__main__':
    build()
