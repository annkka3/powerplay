// Encrypts the Spotlight 8 answer keys (tools/private/school/*.json, not published) into data/school.enc.json.
// The key comes from the family code in tools/private/family_code.txt (AES-GCM, key from PBKDF2-SHA256).
// Run: node tools/encrypt_school.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'tools/private/school');
const code = fs.readFileSync(path.join(root, 'tools/private/family_code.txt'), 'utf8').trim().toUpperCase();
const modules = [];
fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  [].concat(d).forEach(m => modules.push(m));
});
const ord = m => (typeof m.module === 'number' ? m.module : 100 + parseInt(String(m.module).replace(/\D/g, ''), 10));
modules.sort((a, b) => ord(a) - ord(b));
const plain = Buffer.from(JSON.stringify({ v: 1, modules }), 'utf8');
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), iter = 150000;
const key = crypto.pbkdf2Sync(code, salt, iter, 32, 'sha256');
const c = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);   // WebCrypto expects the tag at the end
fs.writeFileSync(path.join(root, 'data/school.enc.json'), JSON.stringify({ v: 1, iter, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') }));
const items = modules.reduce((s, m) => s + m.sections.reduce((a, x) => a + x.exercises.filter(e => e.check && e.items).reduce((b, e) => b + e.items.length, 0), 0), 0);
console.log('modules', modules.map(m => m.module).join(' '), '| checkable items', items, '| bytes', ct.length);
