#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
STRUCTURE=ROOT/'docs/search-index/structure.json'; RULES=ROOT/'Karma/rules.json'; OUTPUT=ROOT/'docs/search-index/karma-history.json'
START=datetime.fromisoformat('2026-09-19T00:00:00+07:00')
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT,text=True,encoding='utf-8').strip()
def counts(data,rules):
    groups=data.get('groups',[]) if isinstance(data,dict) else []
    out={}
    for s in rules['series']:
        g=next((g for g in groups if g.get('subject')==s['subject'] and g.get('section')==s['section']),None)
        out[s['id']]=len((g or {}).get('items') or [])
    return out
def at(commit):
    try:return json.loads(git('show',f'{commit}:docs/search-index/structure.json'))
    except Exception:return None
def main():
    rules=json.loads(RULES.read_text('utf-8')); current=counts(json.loads(STRUCTURE.read_text('utf-8')),rules)
    try: lines=git('log','--first-parent','--format=%H%x09%cI','--','docs/search-index/structure.json').splitlines()
    except Exception: lines=[]
    rows=[]
    for line in reversed(lines):
        if '\t' not in line: continue
        sha,stamp=line.split('\t',1)
        try: rows.append((sha,datetime.fromisoformat(stamp)))
        except ValueError: pass
    snapshots=[]; baseline=None; last=None
    for sha,stamp in rows:
        data=at(sha)
        if data is None: continue
        value=counts(data,rules)
        if stamp<=START: baseline=value; continue
        if baseline is not None and not snapshots:
            snapshots.append({'at':START.isoformat(),'counts':baseline}); last=baseline
        if stamp>=START and value!=last:
            snapshots.append({'at':stamp.isoformat(),'counts':value}); last=value
    if not snapshots and baseline is not None:
        snapshots.append({'at':START.isoformat(),'counts':baseline}); last=baseline
    now=datetime.now(timezone.utc)
    if not snapshots: snapshots=[{'at':now.isoformat(),'counts':current}]
    elif current!=last: snapshots.append({'at':now.isoformat(),'counts':current})
    OUTPUT.write_text(json.dumps({'version':1,'generatedAt':now.isoformat(),'rules':rules,'currentCounts':current,'snapshots':snapshots},ensure_ascii=False,separators=(',',':'))+'\n','utf-8')
    print(f'karma history: {len(snapshots)} snapshots')
if __name__=='__main__': main()
