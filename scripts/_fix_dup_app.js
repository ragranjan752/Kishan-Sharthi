const fs = require('fs');
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';

const firstApp = s.indexOf('<div id="app">');
const secondComment = s.indexOf('MAIN APP', firstApp);
const commentStart = s.lastIndexOf('<!--', secondComment);

if (firstApp === -1 || commentStart <= firstApp) { console.log('bounds fail', firstApp, commentStart); process.exit(1); }

// Keep the second MAIN APP comment; delete everything from first <div id="app"> up to it
s = s.slice(0, firstApp) + s.slice(commentStart);
fs.writeFileSync(f, s);

const apps = (s.match(/<div id="app">/g) || []).length;
const auth = (s.match(/id="auth-screen"/g) || []).length;
const cp = (s.match(/id="complete-profile-screen"/g) || []).length;
const pages = (s.match(/class="page/g) || []).length;
console.log({ apps, auth, cp, pages });
