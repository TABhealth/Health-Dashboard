/* GitHub Pages + Supabase synchronisation for the existing dashboard. */
const SUPABASE_URL = 'https://fbloupbbyyfecgxognrt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0Xj_1clgM-B81eFwtZrbxg_y_4VwuTL';
const DASHBOARD_KEY = 'health-dashboard-v4';
const LOADED_KEY = 'supabase-dashboard-loaded';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let syncReady = false, pushTimer;

function authPanel(session) {
  const el = document.querySelector('#syncStatus');
  if (!el) return;
  el.innerHTML = session
    ? `Angemeldet · synchronisiert <button id="signOut">Abmelden</button>`
    : `<form id="authForm"><input name="email" type="email" placeholder="E-Mail" required><input name="password" type="password" placeholder="Passwort" required><button name="mode" value="signin">Anmelden</button><button name="mode" value="signup">Konto erstellen</button></form>`;
  document.querySelector('#signOut')?.addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  document.querySelector('#authForm')?.addEventListener('submit', async e => {
    e.preventDefault(); const f = new FormData(e.target), email=f.get('email'), password=f.get('password');
    const r = e.submitter.value === 'signup' ? await sb.auth.signUp({email,password}) : await sb.auth.signInWithPassword({email,password});
    if (r.error) alert(r.error.message); else location.reload();
  });
}
async function pull(user) {
  const {data,error} = await sb.from('dashboard_states').select('state,updated_at').eq('user_id',user.id).maybeSingle();
  if (error) throw error;
  if (data?.state) localStorage.setItem(DASHBOARD_KEY, JSON.stringify(data.state));
}
async function push(user, raw) {
  const state = JSON.parse(raw);
  const {error} = await sb.from('dashboard_states').upsert({user_id:user.id,state,updated_at:new Date().toISOString()});
  if (error) console.error('Supabase sync:', error.message);
}
(async () => {
  const {data:{session}} = await sb.auth.getSession(); authPanel(session);
  if (!session) return;
  try { if (sessionStorage.getItem(LOADED_KEY) !== 'yes') { await pull(session.user); sessionStorage.setItem(LOADED_KEY,'yes'); location.reload(); return; } syncReady = true; } catch (e) { console.error(e); syncReady = true; }
  const nativeSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key,value) => { nativeSet(key,value); if (key === DASHBOARD_KEY && syncReady) { clearTimeout(pushTimer); pushTimer=setTimeout(()=>push(session.user,value),600); } };
})();
