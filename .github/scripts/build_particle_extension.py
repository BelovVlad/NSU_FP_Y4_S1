"""Build 151 additive states (200 total) from official pdg==0.1.4 (2024) data."""
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
    (10223,'h₁(1170)','h1-мезон 1170','light','lightresonances','смешанное изоскалярное состояние'),
    (10113,'b₁(1235)⁰','b1-мезон нейтральный','light','lightresonances','(uū − dd̄)/√2'),
    (10213,'b₁(1235)⁺','b1-мезон положительный','light','lightresonances','u d̄'),
    (20113,'a₁(1260)⁰','a1-мезон нейтральный','light','lightresonances','(uū − dd̄)/√2'),
    (20213,'a₁(1260)⁺','a1-мезон положительный','light','lightresonances','u d̄'),
    (20223,'f₁(1285)','f1-мезон 1285','light','lightresonances','смешанное изоскалярное состояние'),
    (100221,'η(1295)','эта-мезон 1295','light','lightresonances','смешанное изоскалярное состояние'),
    (100211,'π(1300)⁺','возбуждённый положительный пион','light','lightresonances','u d̄'),
    (215,'a₂(1320)⁺','положительный тензорный a2','light','lightresonances','u d̄'),
    (10221,'f₀(1370)','скалярный f0 1370','light','lightresonances','смешанное скалярное состояние'),
    (9020221,'η(1405)','эта-мезон 1405','light','lightresonances','смешанное изоскалярное состояние'),
    (10333,'h₁(1415)','h1-мезон 1415','light','lightresonances','смешанное изоскалярное состояние'),
    (20333,'f₁(1420)','f1-мезон 1420','light','lightresonances','смешанное изоскалярное состояние'),
    (10111,'a₀(1450)⁰','нейтральный скалярный a0 1450','light','lightresonances','(uū − dd̄)/√2'),
    (10211,'a₀(1450)⁺','положительный скалярный a0 1450','light','lightresonances','u d̄'),
    (100213,'ρ(1450)⁺','положительный ро-мезон 1450','light','lightresonances','u d̄'),
    (100331,'η(1475)','эта-мезон 1475','light','lightresonances','смешанное изоскалярное состояние'),
    (9030221,'f₀(1500)','скалярный f0 1500','light','lightresonances','смешанное скалярное состояние'),
    (335,'f₂′(1525)','тензорный f2 штрих','light','lightresonances','смешанное изоскалярное состояние'),
    (30113,'ρ(1700)⁰','нейтральный ро-мезон 1700','light','lightresonances','(uū − dd̄)/√2'),
    (9000311,'K₀*(700)⁰','скалярный каон 700','strange','strangeexcited','состав скалярного состояния не указан'),
    (10323,'K₁(1270)⁺','положительный аксиальный каон 1270','strange','strangeexcited','u s̄'),
    (20313,'K₁(1400)⁰','нейтральный аксиальный каон 1400','strange','strangeexcited','d s̄'),
    (20323,'K₁(1400)⁺','положительный аксиальный каон 1400','strange','strangeexcited','u s̄'),
    (100313,'K*(1410)⁰','нейтральный векторный каон 1410','strange','strangeexcited','d s̄'),
    (100323,'K*(1410)⁺','положительный векторный каон 1410','strange','strangeexcited','u s̄'),
    (10311,'K₀*(1430)⁰','нейтральный скалярный каон 1430','strange','strangeexcited','d s̄'),
    (10321,'K₀*(1430)⁺','положительный скалярный каон 1430','strange','strangeexcited','u s̄'),
    (325,'K₂*(1430)⁺','положительный тензорный каон 1430','strange','strangeexcited','u s̄'),
    (30313,'K*(1680)⁰','нейтральный векторный каон 1680','strange','strangeexcited','d s̄'),
    (30323,'K*(1680)⁺','положительный векторный каон 1680','strange','strangeexcited','u s̄'),
    (317,'K₃*(1780)⁰','нейтральный каон со спином 3','strange','strangeexcited','d s̄'),
    (10421,'D₀*(2300)⁰','нейтральный скалярный D','charm','opencharm','c ū'),
    (10411,'D₀*(2300)⁺','положительный скалярный D','charm','opencharm','c d̄'),
    (10423,'D₁(2420)⁰','нейтральный аксиальный D 2420','charm','opencharm','c ū'),
    (10413,'D₁(2420)⁺','положительный аксиальный D 2420','charm','opencharm','c d̄'),
    (20423,'D₁(2430)⁰','нейтральный аксиальный D 2430','charm','opencharm','c ū'),
    (425,'D₂*(2460)⁰','нейтральный тензорный D','charm','opencharm','c ū'),
    (415,'D₂*(2460)⁺','положительный тензорный D','charm','opencharm','c d̄'),
    (10431,'Dₛ₀*(2317)⁺','скалярный странный D','charm','opencharm','c s̄'),
    (20433,'Dₛ₁(2460)⁺','аксиальный странный D 2460','charm','opencharm','c s̄'),
    (10433,'Dₛ₁(2536)⁺','аксиальный странный D 2536','charm','opencharm','c s̄'),
    (10443,'hc(1P)','h-чарм 1P','charm','charmonium','c c̄'),
    (100441,'ηc(2S)','эта-чарм 2S','charm','charmonium','c c̄'),
    (30443,'ψ(3770)','пси 3770','charm','charmonium','c c̄'),
    (100445,'χc₂(3930)','хи-чарм 3930','charm','charmonium','c c̄'),
    (9000443,'ψ(4040)','пси 4040','charm','charmonium','c c̄'),
    (9010443,'ψ(4160)','пси 4160','charm','charmonium','c c̄'),
    (9020443,'ψ(4415)','пси 4415','charm','charmonium','c c̄'),
    (513,'B*⁰','нейтральный векторный B','bottom','openbottom','d b̄'),
    (523,'B*⁺','положительный векторный B','bottom','openbottom','u b̄'),
    (515,'B₂*(5747)⁰','нейтральный тензорный B','bottom','openbottom','d b̄'),
    (525,'B₂*(5747)⁺','положительный тензорный B','bottom','openbottom','u b̄'),
    (533,'Bₛ*⁰','векторный странный B','bottom','openbottom','s b̄'),
    (535,'Bₛ₂*(5840)⁰','тензорный странный B','bottom','openbottom','s b̄'),
    (10551,'χb₀(1P)','хи-боттом 0 1P','bottom','bottomonium','b b̄'),
    (20553,'χb₁(1P)','хи-боттом 1 1P','bottom','bottomonium','b b̄'),
    (10553,'hb(1P)','h-боттом 1P','bottom','bottomonium','b b̄'),
    (555,'χb₂(1P)','хи-боттом 2 1P','bottom','bottomonium','b b̄'),
    (100551,'ηb(2S)','эта-боттом 2S','bottom','bottomonium','b b̄'),
    (110551,'χb₀(2P)','хи-боттом 0 2P','bottom','bottomonium','b b̄'),
    (120553,'χb₁(2P)','хи-боттом 1 2P','bottom','bottomonium','b b̄'),
    (100555,'χb₂(2P)','хи-боттом 2 2P','bottom','bottomonium','b b̄'),
    (300553,'Υ(4S)','ипсилон 4S','bottom','bottomonium','b b̄'),
    (1214,'N(1520)⁰','нейтральный нуклон 1520','baryons','nucleon','udd'),
    (2124,'N(1520)⁺','положительный нуклон 1520','baryons','nucleon','uud'),
    (22112,'N(1535)⁰','нейтральный нуклон 1535','baryons','nucleon','udd'),
    (22212,'N(1535)⁺','положительный нуклон 1535','baryons','nucleon','uud'),
    (32112,'N(1650)⁰','нейтральный нуклон 1650','baryons','nucleon','udd'),
    (32212,'N(1650)⁺','положительный нуклон 1650','baryons','nucleon','uud'),
    (2116,'N(1675)⁰','нейтральный нуклон 1675','baryons','nucleon','udd'),
    (2216,'N(1675)⁺','положительный нуклон 1675','baryons','nucleon','uud'),
    (12116,'N(1680)⁰','нейтральный нуклон 1680','baryons','nucleon','udd'),
    (12216,'N(1680)⁺','положительный нуклон 1680','baryons','nucleon','uud'),
    (31114,'Δ(1600)⁻','дельта 1600 минус','baryons','delta','ddd'),
    (32114,'Δ(1600)⁰','дельта 1600 ноль','baryons','delta','udd'),
    (32214,'Δ(1600)⁺','дельта 1600 плюс','baryons','delta','uud'),
    (32224,'Δ(1600)⁺⁺','дельта 1600 два-плюс','baryons','delta','uuu'),
    (13122,'Λ(1405)⁰','лямбда 1405','baryons','lambda','uds'),
    (23122,'Λ(1600)⁰','лямбда 1600','baryons','lambda','uds'),
    (33122,'Λ(1670)⁰','лямбда 1670','baryons','lambda','uds'),
    (13124,'Λ(1690)⁰','лямбда 1690','baryons','lambda','uds'),
    (43122,'Λ(1800)⁰','лямбда 1800','baryons','lambda','uds'),
    (53122,'Λ(1810)⁰','лямбда 1810','baryons','lambda','uds'),
    (3126,'Λ(1820)⁰','лямбда 1820','baryons','lambda','uds'),
    (13112,'Σ(1660)⁻','сигма 1660 минус','baryons','sigma','dds'),
    (13212,'Σ(1660)⁰','сигма 1660 ноль','baryons','sigma','uds'),
    (13222,'Σ(1660)⁺','сигма 1660 плюс','baryons','sigma','uus'),
    (13114,'Σ(1670)⁻','сигма 1670 минус','baryons','sigma','dds'),
    (13214,'Σ(1670)⁰','сигма 1670 ноль','baryons','sigma','uds'),
    (13224,'Σ(1670)⁺','сигма 1670 плюс','baryons','sigma','uus'),
    (14122,'Λ꜀(2595)⁺','очарованная лямбда 2595','baryons','charmedbaryons','udc'),
    (104122,'Λ꜀(2625)⁺','очарованная лямбда 2625','baryons','charmedbaryons','udc'),
    (204126,'Λ꜀(2880)⁺','очарованная лямбда 2880','baryons','charmedbaryons','udc'),
    (4114,'Σ꜀*(2520)⁰','очарованная сигма 2520 ноль','baryons','charmedbaryons','ddc'),
    (4224,'Σ꜀*(2520)⁺⁺','очарованная сигма 2520 два-плюс','baryons','charmedbaryons','uuc'),
    (5112,'Σb⁻','боттом-сигма минус','baryons','bottombaryons','ddb'),
    (5222,'Σb⁺','боттом-сигма плюс','baryons','bottombaryons','uub'),
    (5114,'Σb*⁻','боттом-сигма звезда минус','baryons','bottombaryons','ddb'),
    (5224,'Σb*⁺','боттом-сигма звезда плюс','baryons','bottombaryons','uub'),
    (5332,'Ωb⁻','боттом-омега','baryons','bottombaryons','ssb'),
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
    assert len(particles)==151 and len({p['pdg'] for p in particles})==151
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
  const anchors={lightmesons:'pip',lightresonances:'pip',strangemesons:'k0',strangeexcited:'k0',opencharm:'d0',charmonium:'jpsi',openbottom:'pdg511',bottomonium:'pdg553',delta:'pdg2224',nucleon:'p',lambda:'lambda',sigma:'sig0',xi:'xi0',charmedbaryons:'pdg4122',bottombaryons:'pdg5122'};
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
    print('Generated 151 additional PDG 2024 states (200 total); original data is untouched.')

if __name__=='__main__':main()
