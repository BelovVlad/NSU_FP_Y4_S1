// 24×24 stroke icons used by the reader toolbar.
const VIEWER_ICONS={
  back:'M19 12H5m6-6-6 6 6 6',previous:'m14 6-6 6 6 6',next:'m10 6 6 6-6 6',
  outline:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5',
  settings:'M4 7h4m4 0h8M4 17h8m4 0h4M8 4v6m4-6v6m0 4v6m4-6v6',
  expand:'M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5',
  close:'m6 6 12 12M6 18 18 6',plus:'M12 5v14M5 12h14',minus:'M5 12h14',
  pen:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5M4 15l5 5',
  fit:'M3 4v16M21 4v16M7 8l-4 4 4 4m10-8 4 4-4 4M3 12h18',
  file:'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 13h8M8 17h5'
};

export function renderViewerIcons(root=document){
  root.querySelectorAll('[data-viewer-icon]').forEach(el=>{
    el.innerHTML='<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+VIEWER_ICONS[el.dataset.viewerIcon]+'"/></svg>';
  });
}
