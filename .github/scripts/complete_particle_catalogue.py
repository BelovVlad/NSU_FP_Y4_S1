"""Add every remaining MC-numbered state from the bundled 2024 database.

Existing records stay intact. Missing measurements are not inferred from names.
Antiparticle decays are included only when their parent is explicitly identified.
"""
import importlib.util
import json
import re
import sqlite3
from pathlib import Path

import pdg
from pdg.units import convert

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('initial_catalogue', Path(__file__).with_name('build_particle_extension.py'))
initial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(initial)

SUB = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')
SUP = str.maketrans('+-0123456789', '⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹')
GREEK = {'pi':'π', 'rho':'ρ', 'omega':'ω', 'phi':'ϕ', 'eta':'η',
         'Delta':'Δ', 'Lambda':'Λ', 'Sigma':'Σ', 'Xi':'Ξ', 'Omega':'Ω',
         'Upsilon':'Υ', 'chi':'χ'}
WORDS = {'pi':'пион', 'rho':'ро-мезон', 'omega':'омега-мезон', 'phi':'фи-мезон',
         'eta':'эта-мезон', 'N':'нуклон', 'Delta':'дельта', 'Lambda':'лямбда',
         'Sigma':'сигма', 'Xi':'кси', 'Omega':'омега', 'Upsilon':'ипсилон',
         'K':'каон', 'D':'D-мезон', 'B':'B-мезон', 'chi':'хи-мезон', 'h':'h-мезон'}


def old_records():
    base = (ROOT/'docs/particles/particles.js').read_text(encoding='utf-8')
    records = []
    for line in base.splitlines():
        code = re.search(r'pdg:(-?\d+)', line)
        if not code:
            continue
        item = {'pdg':int(code[1])}
        for key in ['id', 'symbol', 'name', 'ru', 'group', 'quarks']:
            match = re.search(r"\b"+key+r":'((?:\\.|[^'\\])*)'", line)
            item[key] = match[1].replace("\\'", "'")
        records.append(item)
    extension = (ROOT/'docs/particles/extra-particles.js').read_text(encoding='utf-8')
    records += json.loads(extension.split('window.PARTICLE_EXTENSION = ', 1)[1].split(';\n', 1)[0])
    return records


def identity(name, code):
    # Preserve the distinct charge, excitation and anti-state in every symbol.
    anti = 'bar' in name
    clean = name.replace('bar', '').replace('()', '')
    charge = re.search(r'([+-]+|0)$', clean)
    suffix = charge[1] if charge else ''
    if charge:
        clean = clean[:charge.start()]
    stem = re.split(r'[_^(]', clean)[0]
    symbol = clean.replace('^*', '*').replace('^\'', '′').replace("'", '′')
    symbol = re.sub(r'_(\d+)', lambda m:m[1].translate(SUB), symbol)
    symbol = symbol.replace('_s', 'ₛ').replace('_c', '꜀').replace('_b', 'b')
    for token, replacement in GREEK.items():
        symbol = symbol.replace(token, replacement)
    if anti:
        symbol = symbol[0]+'̄'+symbol[1:]
    symbol += suffix.translate(SUP)
    excitation = re.search(r'\(([^)]+)\)', name)
    ru = ('анти-' if anti else '')+WORDS.get(stem, stem+'-мезон')
    if excitation:
        ru += ' ('+excitation[1]+')'
    if suffix:
        ru += {'0':' нейтральный', '+':' плюс', '-':' минус', '++':' два-плюс', '--':' два-минус'}.get(suffix, '')
    if abs(code) <= 6:
        flavor = name[0]
        return flavor+('̄' if code<0 else ''), ('анти-' if code<0 else '')+flavor+'-кварк'
    if abs(code) in (12,14,16):
        flavor, adjective = {12:('ₑ','электронное'),14:('μ','мюонное'),16:('τ','тау')}[abs(code)]
        return 'ν'+('̄' if code<0 else '')+flavor, adjective+(' антинейтрино' if code<0 else ' нейтрино')
    if name == 'pbar':
        return 'p̄', 'антипротон'
    if name == 'nbar':
        return 'n̄', 'антинейтрон'
    return symbol, ru


def classification(name, code, charge):
    clean = name.replace('bar', '')
    if abs(code)<=6:
        return 'quarks', 'lightquark' if abs(code)<=3 else 'heavyquark', 'элементарная'
    if abs(code) in (12,14,16):
        return 'leptons', 'neutrino', 'элементарная'
    if clean.startswith(('N(', 'Delta', 'Lambda', 'Sigma', 'Xi', 'Omega')) or clean in ('p','n'):
        if '_c' in clean:
            family = 'charmedbaryons'
            q = 'udc' if clean.startswith('Lambda') else ('ddc','udc','uuc')[int(charge)] if clean.startswith('Sigma') else 'dsc' if clean.startswith('Xi') and charge==0 else 'usc' if clean.startswith('Xi') else 'ssc'
        elif '_b' in clean:
            family = 'bottombaryons'
            q = 'udb' if clean.startswith('Lambda') else {-1:'ddb',0:'udb',1:'uub'}[int(charge)] if clean.startswith('Sigma') else 'dsb' if clean.startswith('Xi') and charge==-1 else 'usb' if clean.startswith('Xi') else 'ssb'
        elif clean.startswith('N') or clean in ('p','n'):
            family, q = 'nucleon', 'uud' if charge==1 else 'udd'
        elif clean.startswith('Delta'):
            family, q = 'delta', {-1:'ddd',0:'udd',1:'uud',2:'uuu'}[int(charge)]
        elif clean.startswith('Lambda'):
            family, q = 'lambda', 'uds'
        elif clean.startswith('Sigma'):
            family, q = 'sigma', {-1:'dds',0:'uds',1:'uus'}[int(charge)]
        elif clean.startswith('Xi'):
            family, q = 'xi', 'uss' if charge==0 else 'dss'
        else:
            family, q = 'omega', 'sss'
        return 'baryons', family, q
    if clean.startswith('K'):
        return 'strange', 'strangemesons' if abs(code)<1000 else 'strangeexcited', 'd s̄' if charge==0 else 'u s̄'
    if clean.startswith('D'):
        return 'charm', 'opencharm', 'c s̄' if '_s' in clean else 'c ū' if charge==0 else 'c d̄'
    if clean.startswith('B'):
        return 'bottom', 'openbottom', 's b̄' if '_s' in clean else 'c b̄' if '_c' in clean else 'd b̄' if charge==0 else 'u b̄'
    if clean.startswith(('Upsilon','chi_b','h_b','eta_b')):
        return 'bottom', 'bottomonium', 'b b̄'
    if clean.startswith('pi_1'):
        q = 'однозначный валентный состав не установлен'
    elif clean.startswith(('phi','omega','f_','eta','h_')):
        q = 's s̄' if clean.startswith('phi') else 'смешанное скалярное состояние' if clean.startswith('f_0') else 'смешанное изоскалярное состояние'
    else:
        q = 'смешанное скалярное состояние' if clean.startswith('a_0') else 'u d̄' if charge==1 else '(uū − dd̄)/√2'
    return 'light', 'lightmesons' if '(' in clean and any(x in clean for x in ['(980)','(1400)']) and clean.startswith('a_0') else 'lightresonances', q


def conjugate_quarks(text):
    # Toggle complete flavor tokens, including combining and precomposed bars.
    text = text.replace('ū','ū')
    return re.sub(r'([udscbt])(̄?)', lambda m:m[1] if m[2] else m[1]+'̄', text)


def mass_display(value):
    text = initial.display(value)
    if not value or value.get('unit_text')!='u':
        return text
    # Atomic mass units are energy-equivalent units, not MeV sorting keys.
    def number(match):
        converted = format(convert(float(match[0]), 'u', 'MeV'), '.12g')
        if 'e' in converted:
            mantissa, exponent = converted.split('e')
            return mantissa+' × 10'+str(int(exponent)).translate(str.maketrans('-0123456789','⁻⁰¹²³⁴⁵⁶⁷⁸⁹'))
        return converted
    return re.sub(r'\d+(?:\.\d+)?',number,text.removesuffix(' u'))+' MeV'


def build():
    api = pdg.connect()
    old = old_records()
    old_codes = {p['pdg'] for p in old}
    db = sqlite3.connect(api.database_url.removeprefix('sqlite:///'))
    rows = db.execute('SELECT mcid,name FROM pdgparticle WHERE mcid IS NOT NULL ORDER BY id').fetchall()
    db.close()
    items = []
    for code, name in rows:
        if code in old_codes:
            continue
        p = api.get_particle_by_mcid(code)
        symbol, ru = identity(name, code)
        group, family, quarks = classification(name, code, abs(p.charge) if code<0 and not name.startswith('K') else p.charge)
        # Classify an antiparticle with its particle's charge, then conjugate the valence tokens.
        if code<0 and group not in ('quarks','leptons'):
            counterpart = api.get_particle_by_mcid(-code)
            group, family, quarks = classification(counterpart.name, -code, counterpart.charge)
            if not re.search(r'смешанн|не указан|не установлен', quarks):
                quarks = conjugate_quarks(quarks)
        mass, mass_id = initial.summary(p.masses())
        life, life_id = initial.summary(p.lifetimes())
        width, width_id = initial.summary(p.widths())
        branches = []
        for branch in p.exclusive_branching_fractions():
            parent, _, products = branch.description.partition('-->')
            # Shared multiplet tables do not provide charge-conjugated anti-decays.
            if code<0 and parent.strip()!=name:
                continue
            try:
                value = dict(branch.best_summary())
                if value.get('value') is not None and value.get('limit_type') is None:
                    branches.append((value['value'],products.strip(),initial.display(value),branch.pdgid))
            except pdg.errors.PdgError:
                continue
        branches = sorted(branches, reverse=True)[:3]
        charge = int(p.charge) if float(p.charge).is_integer() else p.charge
        charge_text = ('+' if charge>0 else '−' if charge<0 else '')+str(abs(charge))
        if group=='quarks':
            charge_text = ('+' if charge>0 else '−')+('2/3' if abs(code) in (2,4,6) else '1/3')
        item = dict(id='pdg'+str(code), pdg=code, symbol=symbol, name=name, ru=ru,
            group=group, family=family, r=26, mass=mass_display(mass) if mass else 'Нет измерения',
            charge=charge_text, spin=p.quantum_J or '—', parity={'+':'+1','-':'−1'}.get(p.quantum_P,'—'),
            cparity={'+':'+1','-':'−1'}.get(p.quantum_C,'—'), quarks=quarks,
            lifetime=('τ = '+initial.display(life)) if life else ('Γ = '+initial.display(width)) if width else 'Нет измерения',
            aliases=[name,ru,str(code)], decays=[[b[1],b[2]] for b in branches],
            source=dict(edition='2024',particle=p.pdgid,mass=mass_id,lifetime=life_id,width=width_id,decays=[b[3] for b in branches]))
        if code<0:
            item['antiparticleOf'] = next((x['id'] for x in old if x['pdg']==-code), 'pdg'+str(-code))
        if abs(code) in (12,14,16):
            item['aliases'] += [{12:'ν̄e',14:'ν̄μ',16:'ν̄τ'}[abs(code)], 'anti-'+{12:'nu_e',14:'nu_mu',16:'nu_tau'}[abs(code)]]
        if mass and mass.get('value') is not None:
            item['massValue'] = convert(mass['value'],mass.get('unit_text'),'MeV')
        item['lifetime'] = item['lifetime'].replace('= <','<').replace('= >','>')
        items.append(item)
    all_items = old+items
    assert len(all_items)==616 and len({p['pdg'] for p in all_items})==616
    assert len({p['symbol'] for p in all_items})==616, 'Every charge/excitation/anti-state needs a distinct glyph'
    names = {p['name']:p['symbol'] for p in all_items}
    names.update({'gamma':'γ','pi+':'π⁺','pi-':'π⁻','pi0':'π⁰','eta':'η',
        'J/psi(1S)':'J/ψ','J/psi':'J/ψ','K+':'K⁺','K-':'K⁻','K0':'K⁰','Kbar0':'K̄⁰',
        'Lambda':'Λ⁰','Lambda0':'Λ⁰','e+':'e⁺','e-':'e⁻','mu+':'μ⁺','mu-':'μ⁻'})
    for item in items:
        for decay in item['decays']:
            decay[0] = ' '.join(names.get(token,token) for token in decay[0].split())
    output = '/* Complete additive catalogue; generated by complete_particle_catalogue.py. Data attribution: README.md. */\nwindow.PARTICLE_REMAINDER = '+json.dumps(items,ensure_ascii=False,indent=2)+';\n'
    output += '''(() => {
  const data=window.PARTICLE_DATA;
  data.particles.push(...window.PARTICLE_REMAINDER);
  const byCode=new Map(data.particles.map(p=>[p.pdg,p]));
  const symbols=new Map(data.particles.map(p=>[p.symbol,p.id]));
  const anchors={lightmesons:'pip',lightresonances:'pip',strangemesons:'k0',strangeexcited:'k0',opencharm:'d0',charmonium:'jpsi',openbottom:'pdg511',bottomonium:'pdg553',delta:'pdg2224',nucleon:'p',lambda:'lambda',sigma:'sig0',xi:'xi0',omega:'omega',charmedbaryons:'pdg4122',bottombaryons:'pdg5122',lightquark:'u',heavyquark:'c',neutrino:'nue'};
  const edges=[],keys=new Set(data.edges.map(e=>e.from+'|'+e.to+'|'+e.kind));
  const add=(from,to,kind)=>{
    const key=from+'|'+to+'|'+kind;
    if(from===to||keys.has(key))return;
    keys.add(key);edges.push({id:'complete-e'+edges.length,from,to,kind});
  };
  for(const p of window.PARTICLE_REMAINDER){
    if(anchors[p.family])add(p.id,anchors[p.family],'family');
    if(p.antiparticleOf)add(p.id,p.antiparticleOf,'family');
    const tokens=p.quarks.replace(/\\bmixture\\b/g,'').replace(/ū/g,'ū').match(/[udscbt]̄?/g)||[];
    const flavorCodes={u:2,d:1,s:3,c:4,b:5,t:6};
    for(const token of new Set(tokens)){
      const constituent=byCode.get(flavorCodes[token[0]]*(token.includes('̄')?-1:1));
      if(constituent)add(constituent.id,p.id,'composition');
    }
    for(const [channel] of p.decays){
      const kind=p.source.lifetime?'weak':/γ|e⁺|e⁻|μ⁺|μ⁻/.test(channel)?'em':'strong';
      for(const token of channel.split(/\\s+/)){const target=symbols.get(token);if(target)add(p.id,target,kind);}
    }
  }
  data.edges.push(...edges);
})();\n'''
    (ROOT/'docs/particles/remaining-particles.js').write_text(output,encoding='utf-8')
    print('Added',len(items),'states;',len(all_items),'total.')


if __name__=='__main__':
    build()
