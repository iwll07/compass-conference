// Redirect the retired Cloudflare Workers hostname to the site's own domain.
// Runs before any other logic in this file on purpose. A Supabase magic-link
// token arrives in the URL FRAGMENT, so path, query and hash must survive the
// hop byte-for-byte -- hence the concatenation rather than a bare origin swap.
// `replace` (not `assign`) keeps the old URL out of history, so Back from the
// new page does not land here and bounce again. The `else` keeps the rest of
// this script from touching the DOM during a navigation that has already begun.
// Deliberately NOT a Worker script / `run_worker_first`: a Worker sits in front
// of every request and can interfere with the `_headers` CSP.
if (location.hostname === "compass.bsnu.workers.dev") {
  location.replace("https://compassbsnu.page" + location.pathname + location.search + location.hash);
} else {
  document.documentElement.classList.add('js');try{var t=localStorage.getItem('compass-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}
}

