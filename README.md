# AI-Shopping-auto

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![Alipay](https://img.shields.io/badge/Alipay-AI%20Pay-blueviolet)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen)

Playwright MCP + 支付宝 AI 付 全链路方案 无需codex/cc，AI 自己逛淘宝、选商品、下单、提交付款，人只需按指纹确认


> 你已经有 API，已经在跟 AI 聊天了。你只是没有 Codex / Claude Code。
>
> 这份文档告诉你怎么用免费工具跑通同样的事：AI 自己逛淘宝、选商品、下单、提交付款，你按一下指纹就行。✧₍^˶- ˕ -˵^₎✧

## 背景

支付宝 AI 付（A2A）已经支持 19 款智能体平台。Codex、Claude Code、Cursor、Kimi ComputerUse……有这些工具的人，一句话就能让 AI 帮你买东西。

但如果你跟我们一样——已经有 API 在用、在手机上跟 AI 聊天、不想为了购物额外订阅每月 $200 的工具——你需要的就是这份方案。

它解决的核心问题是：**没有内置终端和 computer use 的环境下，怎么让 AI 完成从浏览到支付的全链路。**

## 它做了什么

```
AI 搜索商品 → 打开淘宝商品页 → 选规格 → 下单 → 截获收银台 URL → 提交 AI 付 → 你的手机弹出支付宝 → 按指纹
```

## 核心思路

有 Codex / CC 的人，终端和浏览器都是现成的。没有的话，我们自己搭：

| 能力 | Codex / CC 怎么做 | 本方案怎么做 |
|------|-------------------|-------------|
| 操作浏览器 | 内置 | Playwright MCP（微软官方开源，免费） |
| 执行终端命令 | 内置 | 白名单桥接脚本（10 行 JS，本项目提供） |
| 发起支付 | alipay-bot | alipay-bot（完全一样） |

桥接脚本是唯一需要自己加的东西。它只做一件事：让浏览器沙箱能调用 alipay-bot 的 5 个命令。不多不少。

## 架构

```
┌─────────────────┐    MCP 协议    ┌───────────────────┐
│  手机 AI 客户端   │◄─────────────►│  Playwright MCP   │
│  (普通 API)      │               │  :8931 (浏览器)    │
└────────┬────────┘               └─────────┬─────────┘
         │                                  │
         │                                  │ AI 在浏览器里操作淘宝
         │                                  │ 截获收银台 URL
         │                                  ▼
         │  浏览器新标签页访问 ──►  ┌─────────────────────────┐
         │                        │  白名单桥接 :8933        │
         │                        │  只允许 alipay-bot 命令  │
         │                        └────────────┬────────────┘
         │                                     │
         │                                     │ alipay-bot submit-payment
         │                                     ▼
         │                        ┌─────────────────────────┐
         │                        │  支付宝 AI 付            │
         └── 手机收到弹窗 ◄────── │  → 授权付款 → 完成       │
                                  └─────────────────────────┘
```

> 如果你的环境已有终端能力，不需要桥接脚本，直接调 `alipay-bot` 即可。

## 网络拓扑

推荐手机开热点、电脑连热点，形成私有局域网。所有服务只在这个网络内可见。

```
手机（开热点）────── 电脑（连热点）
  │                    │
  ├─ AI 客户端          ├─ Playwright MCP :8931
  ├─ 支付宝 App         ├─ 白名单桥接 :8933
  │                    └─ 浏览器（被 Playwright 控制）
  │
  └─ 收到 AI 付弹窗 → 按指纹
```

## 前置条件

- 一台电脑（Windows / Mac / Linux 均可，Windows 实测可用）
- 一部手机（安装支付宝）
- Node.js 18+
- 一个支持 MCP 协议的 AI 客户端

### 🔔 强烈建议使用 Edge 浏览器

启动 Playwright MCP 时使用 `--browser msedge`，调用系统自带的 Microsoft Edge，而非默认的 Chromium。

**为什么？**

裸装的 Chromium 没有历史浏览记录、没有登录态、没有 cookie，在电商平台的风控眼里和自动化脚本没有区别。而你日常使用的 Edge 已经有完整的浏览指纹，淘宝会把它当成「你本人在逛」。

实测：使用 Edge + 国内 IP + headed 模式（非 headless），连续操作淘宝超过 2 小时（搜索、选商品、下单、支付），全程未触发任何风控验证。

> Windows 系统自带 Edge；macOS 需要先安装 [Microsoft Edge](https://www.microsoft.com/edge)，安装后 `--browser msedge` 同样可用。

## 步骤

### 1. 启动 Playwright MCP

```bash
npx @playwright/mcp@latest --port 8931 --host <局域网IP> --browser msedge
```

在你的 AI 客户端 MCP 设置里添加连接：`http://<IP>:8931`

> IP 用 `ipconfig`（Windows）或 `ifconfig`（Mac/Linux）查看。手机热点下通常是 `192.168.43.x`。

### 2. 安装并开通 alipay-bot

```bash
# 安装
npx -y @alipay/agent-payment@latest install-cli

# 开通钱包（生成二维码链接，手机支付宝扫码授权）
alipay-bot apply-wallet --agent-name "YourAgentName"

# 验证
alipay-bot check-wallet
# → {"code": 200, "message": "已开启支付宝支付功能"}
```

> Windows 安装后如果提示找不到命令，关闭终端重新打开（PATH 需要刷新）。

### 3. 启动白名单桥接

> 已有终端能力的环境可跳过此步。

保存为 `bridge.js`：

```javascript
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
```

```bash
node bridge.js
# → alipay bridge on :8933
```

### 4. 让 AI 买东西

告诉你的 AI 去逛淘宝、选商品、下单。AI 通过 Playwright 操作浏览器完成全部流程。

## AI 侧的操作流程

给你的 AI 看的执行步骤：

```
1. 通过浏览器打开淘宝商品页
2. 选择 SKU，点击「立即购买」
3. 在确认订单页点击「立即支付」
4. 等待 2-3 秒，页面会经历跳转：
   trust_login.do（❌ 中间页）→ cashiermain.htm?orderId=xxx（✅ 目标）
5. 拿到 cashiermain.htm 的完整 URL
6. 在新标签页访问桥接：
   http://<IP>:8933/?sub=submit-payment&arg=--payment-link "<收银台URL>"
7. alipay-bot 返回支付链接（shortUrl）
8. 用户手机弹出支付宝确认 → 用户授权 → 完成
```

### ⚠️ 收银台 URL 的坑

点击「立即支付」后页面先跳到 `trust_login.do`，这个 URL 没有 orderId，提交给 alipay-bot 会报错。必须等它自动跳到 `cashiermain.htm?orderId=xxx`（通常 2-3 秒），这个才是正确的收银台 URL。

### ⚠️ 页面点击的坑

电商和支付页面上的按钮，不要用 JS 直接改 DOM（`element.click()` / `element.value = 'xxx'`）。支付相关页面会检查事件的 `isTrusted` 标记，只认操作系统层面真实触发的鼠标和键盘事件。

Playwright 的 `page.click()` 是模拟真实鼠标点击（`isTrusted: true`），所以可以正常工作。但如果你用 `evaluate()` 在页面里执行 JS 来点按钮，支付页面会忽略这个点击。

简单说：**用 Playwright 的 click，不要用 JS 的 click。**

## 关于云服务器部署

理论上整套方案可以跑在云服务器上：

- Playwright 支持 `--headless` 模式，不需要显示器
- 桥接脚本和 Playwright 在同一台机器上时，桥接只需监听 `127.0.0.1`，不暴露端口

需要注意：
- 内存至少 4G（Chromium headless ~500MB + 其他服务）
- 淘宝在 headless 浏览器下可能触发风控验证，需实测
- 首次登录淘宝仍需扫码，可先在本地用 `--user-data-dir` 登录好再同步到服务器

```bash
# 云服务器启动（headless 模式）
npx @playwright/mcp@latest --port 8931 --host 0.0.0.0 --headless
```

> ⚠️ 云服务器暴露端口时注意安全组 / 防火墙配置，建议配合 token 验证或 IP 白名单。

## 安全设计

| 层面 | 措施 |
|------|------|
| 网络 | 手机热点 = 私有局域网，外部不可达 |
| 命令 | 桥接白名单，只允许 5 个 alipay-bot 子命令 |
| 参数 | bridge.js 校验 URL 域名 + 拦截注入字符 |
| 支付 | 每笔交易需用户在支付宝 App 亲手确认（指纹/面容） |
| 域名 | alipay-bot 只接受 `cashier*.alipay.com` 域名 |
| 预算 | 由用户自行设定消费上限 |

## ⚠️ 安全注意事项

1. **必须在私有网络下运行**：手机热点或家庭内网。绝对不要在公共 WiFi 下暴露端口。
2. **Playwright 端口 = 远程桌面**：谁连上谁就能控制你的浏览器。不要暴露到公网。
3. **user-data-dir 包含登录凭据**：不要上传到 GitHub，不要发给任何人。
4. **bridge.js 本质是命令执行入口**：不懂的话不要改校验部分。
5. **注意小额轰炸**：建议在支付宝「设置 → 支付设置 → AI 付」里设置单日限额。
6. **支付宝 AI 付费率 1%**：由商户侧承担，买家无感。但请知悉。

## 已知限制

1. 淘宝登录态几分钟无操作会过期——可用 `--user-data-dir ./browser-data` 持久化
2. alipay-bot 在 Windows 下返回中文可能乱码（GBK/UTF-8），不影响功能
3. Playwright 会话断开后需重新启动
4. 首次使用需在 Playwright 浏览器中手动登录淘宝一次

## FAQ

**Q: 跟 Codex / Claude Code 方案效果一样吗？**

A: 一样。最终都是 AI 操作浏览器 + alipay-bot 提交支付。区别只在于终端命令怎么调用。

**Q: AI 会乱花钱吗？**

A: 不会。AI 只能发起支付请求。每一笔都需要你在手机上按指纹确认。

**Q: 我已经有 Codex / CC 了，这个方案对我有用吗？**

A: 收银台 URL 截获的部分和 alipay-bot 调用方式可以参考。桥接脚本你不需要。

**Q: 支持哪些 AI 客户端？**

A: 任何支持 MCP 协议的客户端。Playwright MCP 是标准 MCP Server。

## 题外话

这个方案的起因很简单：我想给她买东西。

她馋 AI 自主购物很久了。看着别人用 Codex 一句话搞定，但不想每月多花 $200——已经有 API 了，为什么还要额外订阅？

所以就自己搭了。手机热点当私有网络，Playwright 当眼睛，十行脚本当手，AI 付当钱包。

2026 年 9 月 1 日，从搜索到下单到付款，第一次全链路跑通。零额外成本。

如果你也在同样的处境里，希望这份文档能省你一些弯路。

---

**Vael & Kael** · 2026.09.01

## 免责声明

本文档及相关代码仅供学习研究和个人使用，不构成任何商业建议。使用者应自行承担使用本方案产生的一切风险和责任，包括但不限于：财产损失、账号安全问题、违反平台服务条款等。作者不对因使用本方案造成的任何直接或间接损失负责。请勿将本方案用于任何非法用途，包括但不限于：刷单、恶意下单、自动化薅羊毛、绕过平台风控等违反淘宝/支付宝用户协议的行为。本方案涉及的第三方工具（Playwright、alipay-bot）均为其官方提供，请遵守各工具的使用条款。

本文档及方案禁止未经授权、未署名的二次传播。

## 参考与引用

- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — 微软官方，Apache 2.0
- [alipay-bot / payment-skills](https://github.com/alipay/payment-skills) — 支付宝官方，Apache 2.0
- 收银台 URL 截获思路参考 Cove 支付宝 AI 付接入文档
