import renamed from './renamed-materials.js?v=b94bf2d584';

// Maps a path from an old link to the file that exists now.
export function currentMaterialPath(path){
  if(!path)return path;
  if(Object.hasOwn(renamed.files,path)){
    return path.slice(0,path.lastIndexOf('/')+1)+renamed.files[path];
  }
  const parts=path.split('/');
  const kind=parts[1]?.match(/^\d+_(Лекции|Семинары|Месячные_задания)$/)?.[1];
  if(parts.length===3&&parts[2]==='final.pdf'&&kind&&renamed.finalPdfSubjects.includes(parts[0])){
    return `${parts[0]}/${parts[1]}/${parts[0]}_${kind}.pdf`;
  }
  return path;
}
