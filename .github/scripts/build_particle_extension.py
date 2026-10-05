"""Build the additive 50-state catalogue from the official pdg==0.1.4 (2024) database."""
import json
import re
from pathlib import Path
import warnings
import pdg

ROOT = Path(__file__).resolve().parents[2]
warnings.filterwarnings('ignore', category=Warning, module=r'pdg\..*')
# MC ID, symbol, Russian name, group, visible family, valence composition.
STATES = [
    (223,'ω','омега-мезон','light','lightmesons','uū, dd̄ mixture'),
    (9000221,'f₀(500)','скалярный f₀(500)','light','lightmesons','смешанное скалярное состояние'),
    (9010221,'f₀(980)','скалярный f₀(980)','light','lightmesons','смешанное скалярное состояние'),
    (9000111,'a₀(980)⁰','скалярный a₀(980)','light','lightmesons','смешанное скалярное состояние'),
    (225,'f₂(1270)','тензорный f₂(1270)','light','lightmesons','uū, dd̄ mixture'),
    (115,'a₂(1320)⁰','тензорный a₂(1320)','light','lightmesons','(uū − dd̄)/√2'),
    (100113,'ρ(1450)⁰','возбуждённый ро-мезон','light','lightmesons','(uū − dd̄)/√2'),
    (100111,'π(1300)⁰','возбуждённый пион','light','lightmesons','(uū − dd̄)/√2'),
    (100223,'ω(1420)','омега-мезон 1420','light','lightmesons','uū, dd̄ mixture'),
    (30223,'ω(1650)','омега-мезон 1650','light','lightmesons','uū, dd̄ mixture'),
    (310,'Kₛ','короткоживущий каон','strange','strangemesons','(d s̄ + s d̄)/√2'),
    (130,'Kₗ','долгоживущий каон','strange','strangemesons','(d s̄ − s d̄)/√2'),
    (10313,'K₁(1270)⁰','аксиальный каон','strange','strangemesons','d s̄'),
    (315,'K₂*(1430)⁰','тензорный каон','strange','strangemesons','d s̄'),
    (441,'ηc','эта-чарм','charm','charmonium','c c̄'),
    (100443,'ψ(2S)','пси 2S','charm','charmonium','c c̄'),
    (10441,'χc₀','хи-чарм 0','charm','charmonium','c c̄'),
    (20443,'χc₁','хи-чарм 1','charm','charmonium','c c̄'),
    (445,'χc₂','хи-чарм 2','charm','charmonium','c c̄'),
    (423,'D*⁰','возбуждённый D-ноль','charm','opencharm','c ū'),
    (413,'D*⁺','возбуждённый D-плюс','charm','opencharm','c d̄'),
    (433,'Dₛ*⁺','векторный D_s','charm','opencharm','c s̄'),
    (511,'B⁰','нейтральный B-мезон','bottom','openbottom','d b̄'),
    (521,'B⁺','положительный B-мезон','bottom','openbottom','u b̄'),
    (531,'Bₛ⁰','странный B-мезон','bottom','openbottom','s b̄'),
    (541,'B꜀⁺','B_c-мезон','bottom','openbottom','c b̄'),
    (553,'Υ(1S)','ипсилон 1S','bottom','bottomonium','b b̄'),
    (100553,'Υ(2S)','ипсилон 2S','bottom','bottomonium','b b̄'),
    (200553,'Υ(3S)','ипсилон 3S','bottom','bottomonium','b b̄'),
    (551,'ηb','эта-боттом','bottom','bottomonium','b b̄'),
    (2224,'Δ⁺⁺','дельта два-плюс','baryons','delta','uuu'),
    (2214,'Δ⁺','дельта-плюс','baryons','delta','uud'),
    (2114,'Δ⁰','дельта-ноль','baryons','delta','udd'),
    (1114,'Δ⁻','дельта-минус','baryons','delta','ddd'),
    (3224,'Σ(1385)⁺','возбуждённая сигма-плюс','baryons','sigma','uus'),
    (3214,'Σ(1385)⁰','возбуждённая сигма-ноль','baryons','sigma','uds'),
    (3114,'Σ(1385)⁻','возбуждённая сигма-минус','baryons','sigma','dds'),
    (3324,'Ξ(1530)⁰','возбуждённая кси-ноль','baryons','xi','uss'),
    (3314,'Ξ(1530)⁻','возбуждённая кси-минус','baryons','xi','dss'),
    (3124,'Λ(1520)⁰','возбуждённая лямбда','baryons','lambda','uds'),
    (12212,'N(1440)⁺','резонанс Ропера плюс','baryons','nucleon','uud'),
    (12112,'N(1440)⁰','резонанс Ропера ноль','baryons','nucleon','udd'),
    (4122,'Λ꜀⁺','очарованная лямбда','baryons','charmedbaryons','udc'),
    (4222,'Σ꜀⁺⁺','очарованная сигма два-плюс','baryons','charmedbaryons','uuc'),
    (4212,'Σ꜀⁺','очарованная сигма-плюс','baryons','charmedbaryons','udc'),
    (4112,'Σ꜀⁰','очарованная сигма-ноль','baryons','charmedbaryons','ddc'),
    (4232,'Ξ꜀⁺','очарованная кси-плюс','baryons','charmedbaryons','usc'),
    (4132,'Ξ꜀⁰','очарованная кси-ноль','baryons','charmedbaryons','dsc'),
    (4332,'Ω꜀⁰','очарованная омега','baryons','charmedbaryons','ssc'),
    (5122,'Λb⁰','боттом-лямбда','baryons','bottombaryons','udb'),
]

def summary(properties):
    for prop in properties:
        try:
            value = dict(prop.best_summary())
            return value, prop.pdgid
        except pdg.errors.PdgError:
            continue
    return None, None

def display(value):
    if not value:
        return 'В наборе не указано'
    text = value['display_value_text'].strip().replace('+-',' ± ').replace(' TO ',' … ').replace(' to ','–')
    exponent=re.search(r'E([+-]?\d+)$',text)
    if exponent:
        mantissa=text[:exponent.start()].strip()
        if not mantissa.startswith('('):mantissa='('+mantissa+')'
        power=str(int(exponent[1])).translate(str.maketrans('-0123456789','⁻⁰¹²³⁴⁵⁶⁷⁸⁹'))
        text=mantissa+' × 10'+power
    units = value.get('unit_text') or ''
    return (text+' '+units).strip()

def main():
    api=pdg.connect()
    particles=[]
    for code,symbol,ru,group,family,quarks in STATES:
        p=api.get_particle_by_mcid(code)
        mass,mass_id=summary(p.masses())
        # K_S and K_L share the neutral-kaon mass entry; their lifetimes remain distinct.
        if code in (310,130) and not mass:mass,mass_id=summary(api.get_particle_by_mcid(311).masses())
        life,life_id=summary(p.lifetimes())
        width,width_id=summary(p.widths())
        charge=int(p.charge)
        branches=[]
        for branch in p.exclusive_branching_fractions():
            try:
                b=dict(branch.best_summary())
                if b.get('value') is not None and b.get('limit_type') is None:
                    branches.append((b['value'],branch.description.split('-->',1)[-1].strip(),display(b),branch.pdgid))
            except pdg.errors.PdgError:
                continue
        branches=sorted(branches,reverse=True)[:3]
        item=dict(id='pdg'+str(code),pdg=code,symbol=symbol,name=p.name,ru=ru,group=group,family=family,r=26,
            mass=display(mass),charge=('+' if charge>0 else '−' if charge<0 else '')+str(abs(charge)),
            spin=p.quantum_J or '—',parity={'+':'+1','-':'−1'}.get(p.quantum_P,'—'),cparity={'+':'+1','-':'−1'}.get(p.quantum_C,'—'),
            quarks=quarks,lifetime=('τ = '+display(life)) if life else ('Γ = '+display(width)) if width else 'В наборе не указано',
            aliases=[p.name,ru,str(code)],decays=[[b[1],b[2]] for b in branches],
            source={'edition':'2024','particle':p.pdgid,'mass':mass_id,'lifetime':life_id,'width':width_id,'decays':[b[3] for b in branches]})
        if mass and mass.get('value') is not None:
            item['massValue']=mass['value']*({'GeV':1000,'keV':.001}.get(mass.get('unit_text'),1))
        item['lifetime']=item['lifetime'].replace('= <','<').replace('= >','>')
        if code in (310,130):item['compositionNote']='Формула дана в приближении без CP-нарушения.'
        particles.append(item)
    assert len(particles)==50 and len({p['pdg'] for p in particles})==50
    # Match complete PDG names only. Generic products (pi, N, hadrons, etc.) remain generic.
    names={p['name']:p['symbol'] for p in particles}
    names.update({'pi+':'π⁺','pi-':'π⁻','pi0':'π⁰','gamma':'γ','eta':'η','eta\'(958)':'η′','rho(770)0':'ρ⁰','omega(782)':'ω',
        'K+':'K⁺','K-':'K⁻','K0':'K⁰','Kbar0':'K̄⁰','D0':'D⁰','D+':'D⁺','D_s+':'Dₛ⁺','D_s()+':'Dₛ⁺',
        'J/psi(1S)':'J/ψ','e+':'e⁺','e-':'e⁻','mu+':'μ⁺','mu-':'μ⁻','p':'p','n':'n','Lambda':'Λ⁰','Lambda0':'Λ⁰'})
    for p in particles:
        for decay in p['decays']:
            tokens=decay[0].split()
            decay[0]=' '.join(names.get(token,token) for token in tokens)
    output='/* Additive PDG 2024 catalogue, generated by .github/scripts/build_particle_extension.py. CC BY 4.0. */\nwindow.PARTICLE_EXTENSION = '+json.dumps(particles,ensure_ascii=False,indent=2)+';\n'
    output+='''(() => {
  const data=window.PARTICLE_DATA;
  data.groups.splice(3,0,{id:'bottom',label:'Bottom / bottomonium',short:'Bottom',tone:'rose'});
  data.particles.push(...window.PARTICLE_EXTENSION);
  const symbolToId=new Map(data.particles.map(p=>[p.symbol,p.id])),newEdges=[];
  const add=(from,to,kind)=>{if(from!==to&&!newEdges.some(e=>e.from===from&&e.to===to&&e.kind===kind))newEdges.push({from,to,kind});};
  const anchors={lightmesons:'pip',strangemesons:'k0',opencharm:'d0',charmonium:'jpsi',openbottom:'pdg511',bottomonium:'pdg553',delta:'pdg2224',nucleon:'p',lambda:'lambda',sigma:'sig0',xi:'xi0',charmedbaryons:'pdg4122',bottombaryons:'pdg5122'};
  for(const p of window.PARTICLE_EXTENSION){
    if(anchors[p.family])add(p.id,anchors[p.family],'family');
    for(const flavor of new Set(p.quarks.replace(/\\bmixture\\b/g,'').match(/[udscbtū]/g)||[])){
      if(/^[udscbt]$/.test(flavor))add(flavor,p.id,'composition');
      else if(flavor==='ū')add('u',p.id,'composition');
    }
    // Decay edges are drawn only for complete, explicitly named products in the catalogue.
    for(const [channel] of p.decays){
      const kind=p.source.lifetime?'weak':/γ|e⁺|e⁻|μ⁺|μ⁻/.test(channel)?'em':'strong';
      for(const token of channel.split(/\\s+/)){const to=symbolToId.get(token);if(to)add(p.id,to,kind);}
    }
  }
  for(const from of ['k0','k0b'])for(const to of ['pdg310','pdg130'])add(from,to,'mixing');
  data.edges.push(...newEdges.map((e,i)=>({...e,id:'extra-e'+i})));
})();\n'''
    (ROOT/'docs/particles/extra-particles.js').write_text(output,encoding='utf-8')
    print('Generated 50 additional PDG 2024 states; original data is untouched.')

if __name__=='__main__':main()
