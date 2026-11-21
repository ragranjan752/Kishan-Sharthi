const fs = require('fs');
const f = 'frontend/app.js';
let s = fs.readFileSync(f, 'utf8');
const NL = '\n';

s = s.replace("if (pageId === 'profile') initProfileForm();", '');

const fns = [
'function toggleProfileMenu(e){',
'  if(e)e.stopPropagation();',
"  const m=document.getElementById('profile-menu');if(!m)return;",
"  m.style.display=m.style.display==='none'?'block':'none';",
'  const u=currentUser||{};',
"  const nm=document.getElementById('pm-name');const em=document.getElementById('pm-email');const av=document.getElementById('pm-avatar');",
"  if(nm)nm.textContent=u.name||'Farmer';if(em)em.textContent=u.email||'—';",
"  const photo=u.profile_image_url||u.photoURL||u.photo_url;",
"  if(av){if(photo){av.innerHTML='<img src=\"'+photo+'\" style=\"width:100%;height:100%;border-radius:50%;object-fit:cover;\">'}else{av.textContent=(u.name||'K').charAt(0).toUpperCase()}}",
'}',
'function openProfileModal(){',
"  const m=document.getElementById('profile-menu');if(m)m.style.display='none';",
"  const mo=document.getElementById('profile-modal');if(mo)mo.style.display='flex';",
'  initProfileForm();',
'}',
'function closeProfileModal(){',
"  const mo=document.getElementById('profile-modal');if(mo)mo.style.display='none';",
'}',
"document.addEventListener('click',function(e){",
"  const m=document.getElementById('profile-menu');",
"  if(m&&m.style.display!=='none'&&!e.target.closest('#profile-menu')&&!e.target.closest('#topbar-avatar'))m.style.display='none';",
'});',
''
].join(NL);

s = s.replace('async function initProfileForm()', fns + 'async function initProfileForm()');

// sync topbar avatar in loginSuccess
const anchor = "avatarEl.textContent = (user.name || 'K').charAt(0).toUpperCase();";
const ai = s.indexOf(anchor);
if (ai !== -1) {
  const lineEnd = s.indexOf('\n', ai);
  const inject = "\n  const tbAv = document.getElementById('topbar-avatar');\n  if (tbAv) { if (photoUrl) tbAv.innerHTML = '<img src=\"' + photoUrl + '\" style=\"width:100%;height:100%;border-radius:50%;object-fit:cover;\">'; else tbAv.textContent = (user.name || 'K').charAt(0).toUpperCase(); }";
  s = s.slice(0, lineEnd) + inject + s.slice(lineEnd);
}
fs.writeFileSync(f, s);
console.log('js updated');
