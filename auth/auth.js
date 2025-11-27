/* ==========================================================
   301.st AUTH MODULE (Webstudio-ready)
   - quiet, safe, no console spam
   - email/password login & signup
   - Google OAuth PKCE flow (/oauth/google/start → /auth/success)
   - Turnstile support
   - multi-form + popup auto-bind
   - normalized /me response (user + accounts + active_account_id)
   - correct UI state (name → email → id)
   - app bootstrap: restores session via refresh-cookie
   ========================================================== */

if (window.__auth301Ready) {
  // guard
} else {
  window.__auth301Ready = true;

  const API_ROOT = 'https://api.301.st/auth';
  const EP = {
    register: '/register',
    login: '/login',
    verify: '/verify',
    me: '/me',
    refresh: '/refresh',
    logout: '/logout',
    googleStart: '/oauth/google/start'
  };

  const DEBUG = false;

  const qs  = (s,r=document)=>r.querySelector(s);
  const qsa = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const json = async (r)=>{ try { return await r.json(); } catch { return null; } };
  const log = (...a)=>{ if(DEBUG) console.log('[AUTH]',...a); };

  const setWSVar = (n,v)=>{
    try{ if(typeof window.webstudioSetVariable==="function") window.webstudioSetVariable(n,v); }
    catch{}
  };
  const bumpFetchBuster = ()=> setWSVar("authFetchBuster", String(Date.now()));

  function setFormState(form, state, msg='') {
    if (!form) return;
    form.dataset.state = state;
    let box = form.querySelector('[data-status]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-status','');
      box.style.marginTop='8px';
      form.appendChild(box);
    }
    box.textContent = msg;
    box.dataset.type = state;
    box.hidden = !msg;
  }

  function addEventListenerOnce(node, ev, fn) {
    if (node && !node.hasAttribute('data-bind-'+ev)) {
      node.addEventListener(ev, fn, true);
      node.setAttribute('data-bind-'+ev,'1');
    }
  }

  async function safeFetch(url, opt={}) {
    try {
      const r = await fetch(url,opt);
      const d = await json(r);
      return { ok:r.ok, status:r.status, statusText:r.statusText, data:d };
    } catch {
      return { ok:false, status:0, statusText:'NetworkError', data:null };
    }
  }

  let currentToken = '';
  let hasSession = false;

  const getToken = ()=>currentToken;
  const setToken = (t='')=>{
    currentToken = t;
    setWSVar('authBearer', t ? `Bearer ${t}` : '');
    bumpFetchBuster();
    window.dispatchEvent(new CustomEvent('auth:token',{detail:{token:t}}));
  };

  function getTurnstileToken(form){
    const h = qs('input[name="turnstile_token"]',form);
    if (h?.value) return h.value.trim();

    const cfLocal = qs('[name="cf-turnstile-response"]',form);
    if (cfLocal?.value) return cfLocal.value.trim();

    const cfGlobal = qs('[name="cf-turnstile-response"]',document);
    if (cfGlobal?.value) return cfGlobal.value.trim();

    try {
      const t = window.turnstile?.getResponse?.();
      if (t) return t.trim();
    } catch {}

    return '';
  }
  function resetTurnstile(){
    try { window.turnstile?.reset?.(); } catch {}
  }

  async function sendJSON(url,body={},opt={auth:false}) {
    const headers = {'Content-Type':'application/json'};
    if (opt.auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    return safeFetch(url,{
      method:'POST',credentials:'include',headers,
      body:JSON.stringify(body)
    });
  }

  async function getJSON(url,opt={auth:false}) {
    const headers = {'Content-Type':'application/json'};
    if (opt.auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    return safeFetch(url,{
      method:'GET',credentials:'include',headers
    });
  }

  function normalizeMe(data){
    if (!data) return null;

    if (data.user && typeof data.user === 'object') {
      return {
        ...data.user,
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        active_account_id: data.active_account_id || null
      };
    }
    if (data.email || data.id) return data;
    return null;
  }

  async function tryRefresh(){
    if (!hasSession) return false;
    if (document.hidden) return false;

    const r = await safeFetch(API_ROOT+EP.refresh,{
      method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'}
    });

    if (!r.ok || !r.data?.access_token) return false;
    setToken(r.data.access_token);
    return true;
  }

  async function fetchMe(){
    try {
      if (!hasSession && !getToken()) return null;

      let r = await getJSON(API_ROOT+EP.me,{auth:true});
      if (r.status===401 && await tryRefresh()) {
        r = await getJSON(API_ROOT+EP.me,{auth:true});
      }

      if (!r.ok) return null;
      return normalizeMe(r.data);
    } catch {
      return null;
    }
  }

  function applyAuthState(user){
    const isIn = !!user;
    document.documentElement.dataset.authState = isIn?'in':'out';

    setWSVar('authUserEmail', user?.email || '');
    setWSVar('authUserName',  user?.name  || user?.email || '');

    qsa('[data-onlogin="show"]').forEach(el=>el.style.display=isIn?'':'none');
    qsa('[data-onlogin="hide"]').forEach(el=>el.style.display=isIn?'none':'');

    window.dispatchEvent(new CustomEvent('auth:state',{detail:{user,isIn}}));
  }

  async function refreshAuthUI(){
    const user = await fetchMe();
    applyAuthState(user);
    return user;
  }

  const handleSignUp = async (e)=>{
    e.preventDefault();
    const form = e.currentTarget;
    setFormState(form,'loading','');

    const email = (qs('#signup-email')||qs('[name="email"]',form))?.value?.trim();
    const password = (qs('#signup-password')||qs('[name="password"]',form))?.value;

    if (!email || !password) return setFormState(form,'error','Enter email & password');

    const turnstile_token = getTurnstileToken(form);
    if (!turnstile_token) {
      setFormState(form,'error','Turnstile required');
      resetTurnstile();
      return;
    }

    const r = await sendJSON(API_ROOT+EP.register,{email,password,turnstile_token});
    resetTurnstile();

    if (!r.ok) return setFormState(form,'error', r.data?.message || r.data?.error || 'Registration error');

    if (r.data?.access_token) {
      hasSession=true;
      setToken(r.data.access_token);
      if (r.data?.user?.email) localStorage.setItem('__webstudio__auth_email',r.data.user.email);
      await refreshAuthUI();
      return setFormState(form,'success','Account created. You are logged in.');
    }

    if (r.data?.status==='pending') return setFormState(form,'pending','Check your email to verify your account.');
    if (r.data?.status==='code_required') return setFormState(form,'pending','Enter verification code.');

    return setFormState(form,'success','Registration started. Follow the instructions.');
  };

  const handleSignIn = async (e)=>{
    e.preventDefault();
    const form = e.currentTarget;
    setFormState(form,'loading','');

    const email = (qs('#signin-email')||qs('[name="email"]',form))?.value?.trim();
    const password = (qs('#signin-password')||qs('[name="password"]',form))?.value;

    if (!email || !password) return setFormState(form,'error','Enter email & password');

    const turnstile_token = getTurnstileToken(form);
    if (!turnstile_token) {
      setFormState(form,'error','Turnstile required');
      resetTurnstile();
      return;
    }

    const r = await sendJSON(API_ROOT+EP.login,{email,password,turnstile_token});
    resetTurnstile();

    if (!r.ok) return setFormState(form,'error', r.data?.message || r.data?.error || 'Sign-in error');

    if (r.data?.access_token) {
      hasSession=true;
      setToken(r.data.access_token);
      if (r.data?.user?.email) localStorage.setItem('__webstudio__auth_email',r.data.user.email);
      await refreshAuthUI();
      return setFormState(form,'success','Logged in.');
    }

    return setFormState(form,'error','No access token received.');
  };

  const handleSignOut = async (e)=>{
    e?.preventDefault?.();
    await safeFetch(API_ROOT+EP.logout,{
      method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'}
    });
    hasSession=false;
    setToken('');
    localStorage.removeItem('__webstudio__auth_email');
    applyAuthState(null);
  };

  const handleVerify = async (e)=>{
    e?.preventDefault?.();
    const form = e?.currentTarget;
    setFormState(form,'loading','');
    const code = qs('[name="code"]', form)?.value?.trim();
    const email = qs('[name="email"]', form)?.value?.trim();
    if (!code || !email) return setFormState(form,'error','Enter verification code and email');
    const r = await sendJSON(API_ROOT+EP.verify,{ code, email });
    if (!r.ok) return setFormState(form,'error', r.data?.message || 'Verification error');
    return setFormState(form,'success','Verified. You can sign in now.');
  };

  function startGoogleOAuth(e){
    e?.preventDefault?.();
    location.href = API_ROOT + EP.googleStart;
  }

  async function handleOAuthSuccessPage(){
    if (!location.pathname.includes('/auth/success')) return;

    const token = new URL(location.href).searchParams.get('token');
    if (!token) {
      document.body.innerHTML = `
        <div style="padding:40px;font-size:22px;">
          OAuth success page missing token.<br><br>
          <a href="/">Back</a>
        </div>`;
      return;
    }

    hasSession=true;
    setToken(token);
    await refreshAuthUI();
    location.href = location.origin + '/account';
  }

  const onAuthStateChanged = (cb)=>{
    (async()=>{ cb(await fetchMe()); })();
    window.addEventListener('auth:state', e=> cb(e.detail.user));
  };

  function bindAllAuthNodes(root=document){
    qsa('form[data-auth="register"], #form-signup-form, #auth-register-form',root)
      .forEach(f=>addEventListenerOnce(f,'submit',handleSignUp));

    qsa('form[data-auth="login"], #form-signin-form, #auth-login-form',root)
      .forEach(f=>addEventListenerOnce(f,'submit',handleSignIn));

    qsa('form[data-auth="verify"], #auth-verify-form',root)
      .forEach(f=>addEventListenerOnce(f,'submit',handleVerify));

    qsa('#signout-button, #auth-logout-btn, [data-auth="logout"]',root)
      .forEach(b=>addEventListenerOnce(b,'click',handleSignOut));

    qsa('[data-auth="google"], [data-google-login]',root)
      .forEach(b=>addEventListenerOnce(b,'click',startGoogleOAuth));
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    bindAllAuthNodes(document);

    const savedEmail = localStorage.getItem('__webstudio__auth_email') || '';
    if (savedEmail) {
      setWSVar('authUserEmail',savedEmail);
      setWSVar('authUserName', savedEmail);
    }

    handleOAuthSuccessPage();

    // ✅ APP BOOTSTRAP: restore by refresh-cookie
    if (location.hostname === 'app.301.st') {
      hasSession = true;
      await tryRefresh();
      await refreshAuthUI();
      return;
    }

    applyAuthState(null);
  });

  const mo = new MutationObserver(muts=>{
    for (const m of muts) {
      m.addedNodes?.forEach(n=>{
        if (n.nodeType===1) bindAllAuthNodes(n);
      });
    }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});

  // ✅ display name/email/id
  onAuthStateChanged((user)=>{
    const isIn = !!user;
    qsa('[data-onlogin="show"]').forEach(el=>el.style.display=isIn?'':'none');
    qsa('[data-onlogin="hide"]').forEach(el=>el.style.display=isIn?'none':'');
    const disp = qs('#SessionDisplay');
    if (!disp) return;

    if (!user) { disp.textContent=''; return; }

    const label = user.name?.trim() || user.email?.trim() || `User #${user.id}`;
    disp.textContent = label;
  });

  window.auth301Logout = handleSignOut;
}
