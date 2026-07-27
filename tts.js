/* DOT BLOCKS speech loader

   The blind-first P0 upgrade used to be injected here as a runtime source
   rewriter (fetch index.html → string-patch → document.write). That could
   never work: document.open() is a no-op while the parser is still active, so
   the rewrite appended a second copy of the whole document instead of
   replacing it. Its changes now live directly in index.html and the script is
   gone. Only the speech core is loaded from here. */
(function(){
  'use strict';
  document.write('<script src="./superdot-tts-core.js?v=20260728-1"><\/script>');
})();
