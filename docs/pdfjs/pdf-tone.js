// Tones are applied to the raster once per render instead of as CSS/SVG filters:
// a filtered multi-megapixel canvas is re-filtered on every scroll/pinch frame on
// phones, which caused the lag and the WebView out-of-memory crashes.
// Each stage is a 3x4 sRGB colour matrix, clamped after every stage like CSS filters.
const hueRotateMatrix=deg=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[
  .213+c*.787-s*.213,.715-c*.715-s*.715,.072-c*.072+s*.928,0,
  .213-c*.213+s*.143,.715+c*.285+s*.140,.072-c*.072-s*.283,0,
  .213-c*.213-s*.787,.715-c*.715+s*.715,.072+c*.928+s*.072,0]};
const saturateMatrix=s=>[.213+.787*s,.715-.715*s,.072-.072*s,0,.213-.213*s,.715+.285*s,.072-.072*s,0,.213-.213*s,.715-.715*s,.072+.928*s,0];
const diagMatrix=(r,g,b,offset=0)=>[r,0,0,offset,0,g,0,offset,0,0,b,offset];
const TONE_PIPELINES={
  // invert(.92) hue-rotate(180deg) brightness(.94) contrast(.92) saturate(.88)
  black:[diagMatrix(-.84,-.84,-.84,.92),hueRotateMatrix(180),diagMatrix(.94,.94,.94),diagMatrix(.92,.92,.92,.04),saturateMatrix(.88)],
  // Hue rotation keeps coloured figures recognisable; exact grayscale endpoints:
  // black -> #FFFFFF, white -> #293133 (colors.tex: pag/rbg); then contrast(.98) saturate(.94).
  mine:[hueRotateMatrix(180),diagMatrix(-.839216,-.807843,-.8,1),diagMatrix(.98,.98,.98,.01),saturateMatrix(.94)]
};
export const PDF_TONES=['black','orig','mine'];
const toneGrayTables=new Map();
function toneColor(stages,r,g,b){
  r/=255;g/=255;b/=255;
  for(const m of stages){
    const nr=m[0]*r+m[1]*g+m[2]*b+m[3],ng=m[4]*r+m[5]*g+m[6]*b+m[7],nb=m[8]*r+m[9]*g+m[10]*b+m[11];
    r=nr<0?0:nr>1?1:nr;g=ng<0?0:ng>1?1:ng;b=nb<0?0:nb>1?1:nb;
  }
  return (Math.round(r*255)<<16)|(Math.round(g*255)<<8)|Math.round(b*255);
}
export function applyToneToCanvas(target,tone){
  const stages=TONE_PIPELINES[tone];
  if(!stages||!target.width||!target.height)return;
  let gray=toneGrayTables.get(tone);
  if(!gray){gray=new Int32Array(256);for(let v=0;v<256;v++)gray[v]=toneColor(stages,v,v,v);toneGrayTables.set(tone,gray)}
  const context=target.getContext('2d');
  const image=context.getImageData(0,0,target.width,target.height),data=image.data;
  // Text pages are mostly gray: use the table; memoise the few colours of figures.
  const keys=new Int32Array(4096).fill(-1),values=new Int32Array(4096);
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    let v;
    if(r===g&&g===b)v=gray[r];
    else{
      const key=(r<<16)|(g<<8)|b,slot=Math.imul(key,-1640531535)>>>20;
      if(keys[slot]===key)v=values[slot];
      else{v=toneColor(stages,r,g,b);keys[slot]=key;values[slot]=v}
    }
    data[i]=v>>>16;data[i+1]=(v>>>8)&255;data[i+2]=v&255;
  }
  context.putImageData(image,0,0);
}
