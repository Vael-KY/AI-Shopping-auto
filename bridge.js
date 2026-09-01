const http = require('http');
const { execSync } = require('child_process');

const ALLOW = [
  'check-wallet',
  'submit-payment',
  'query-payment-status',
  'apply-wallet',
  'bind-wallet'
];

// 安全校验：submit-payment 的 URL 必须是支付宝收银台域名
function validateArg(sub, arg) {
  if (sub === 'submit-payment') {
    const match = arg.match(/https:\/\/cashier[\w]*\.alipay\.com\/[^\s"']*/);
    if (!match) return false;
  }
  // 拦截常见注入字符
  if (/[;&|`$(){}]/.test(arg.replace(/https?:\/\/[^\s"']*/g, ''))) return false;
  return true;
}

http.createServer((q, r) => {
  const u = new URL(q.url, 'http://localhost');
  const sub = u.searchParams.get('sub');
  const arg = u.searchParams.get('arg') || '';
  if (!ALLOW.includes(sub)) { r.end('blocked: unknown command'); return; }
  if (!validateArg(sub, arg)) { r.end('blocked: invalid argument'); return; }
  try {
    const o = execSync(
      'alipay-bot ' + sub + ' ' + arg,
      { encoding: 'utf-8', timeout: 30000 }
    );
    r.end(o);
  } catch (e) {
    r.end(e.stderr || e.message);
  }
}).listen(8933, '<局域网IP>', () => console.log('alipay bridge on :8933'));
