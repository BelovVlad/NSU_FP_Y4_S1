// What makes this copy of the shared PDF reader belong to its site. The reader itself lives
// in NSU Y4 S1 (site/web/pdfjs); site/scripts/sync_reader.py copies it to the other sites,
// which keep their own reader-config.js, material-paths.js and the <head> of viewer.html.
export default {
  repo:{owner:'BelovVlad',name:'NSU_FP_Y4_S1',branch:'main'},
  defaultTitle:'PDF',
  titleSuffix:' · ФФ НГУ',
  backUrl:subject=>'../'+(subject?`#subject=${encodeURIComponent(subject)}`:''),
};
