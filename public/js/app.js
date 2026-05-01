// ===== STATE =====
let currentUser = null;
let marketData = [];
let watchlist = [];
let currentTradeCoin = null;
let currentTradeType = 'buy';
let exchangeConnected = false;

// ===== HELPERS =====
const $ = id => document.getElementById(id);
const fmt = (n, d = 2) => {
  if (n === null || n === undefined) return '$0.00';
  if (n === 0) return '$0.00';
  if (Math.abs(n) >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return '$' + n.toFixed(6);
};
const fmtPct = n => { const v = n || 0; return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; };
const fmtCap = n => {
  if (!n && n !== 0) return '—';
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString();
};

function showToast(msg, type = 'info') {
  const c = $('toastContainer'), t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(100px)'; setTimeout(()=>t.remove(),300); }, 3500);
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers:{'Content-Type':'application/json'}, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===== AUTH =====
let isLoginForm = true;
function toggleAuthForm() {
  isLoginForm = !isLoginForm;
  $('loginForm').style.display = isLoginForm ? 'block' : 'none';
  $('registerForm').style.display = isLoginForm ? 'none' : 'block';
  $('authSwitch').innerHTML = isLoginForm
    ? `Don't have an account? <a onclick="toggleAuthForm()">Sign Up</a>`
    : `Already have an account? <a onclick="toggleAuthForm()">Sign In</a>`;
  $('authError').classList.remove('show');
}
function showAuthError(msg) { $('authError').textContent = msg; $('authError').classList.add('show'); }

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('loginUsername').value.trim(), password = $('loginPassword').value;
  if (!username || !password) return showAuthError('Please fill in all fields.');
  try { const d = await api('/api/auth/login',{method:'POST',body:{username,password}}); currentUser=d.user; enterApp(); }
  catch(err) { showAuthError(err.message); }
});

$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName=$('regFullName').value.trim(), username=$('regUsername').value.trim(), email=$('regEmail').value.trim(), password=$('regPassword').value;
  if (!fullName||!username||!email||!password) return showAuthError('Please fill in all fields.');
  if (password.length<6) return showAuthError('Password must be at least 6 characters.');
  try { const d = await api('/api/auth/register',{method:'POST',body:{fullName,username,email,password}}); currentUser=d.user; enterApp(); showToast('Account created! 🎉','success'); }
  catch(err) { showAuthError(err.message); }
});

async function checkSession() {
  try { const d = await api('/api/auth/me'); currentUser=d.user; enterApp(); } catch {}
}
async function logout() { await api('/api/auth/logout',{method:'POST'}); currentUser=null; $('authScreen').style.display=''; $('appScreen').style.display='none'; }

function enterApp() {
  $('authScreen').style.display='none'; $('appScreen').style.display='block';
  $('userName').textContent = currentUser.fullName||currentUser.username;
  $('userEmail').textContent = currentUser.email;
  $('userAvatar').textContent = (currentUser.fullName||currentUser.username).charAt(0).toUpperCase();
  checkExchangeStatus();
  navigateTo('dashboard');
}

// ===== EXCHANGE STATUS =====
async function checkExchangeStatus() {
  try {
    const d = await api('/api/exchange/config');
    exchangeConnected = d.connected;
    $('exchangeBanner').style.display = d.connected ? 'none' : 'block';
  } catch { exchangeConnected = false; $('exchangeBanner').style.display = 'block'; }
}

// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));
  $(`page-${page}`).classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('show');
  if(page==='dashboard') loadDashboard();
  else if(page==='market') loadMarket();
  else if(page==='portfolio') loadPortfolio();
  else if(page==='wallet') loadWallet();
  else if(page==='transactions') loadTransactions();
  else if(page==='settings') loadSettings();
}
function toggleSidebar() { $('sidebar').classList.toggle('open'); $('sidebarOverlay').classList.toggle('show'); }

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [mkt,pf,wl] = await Promise.all([api('/api/market/prices'),api('/api/portfolio/summary'),api('/api/portfolio/watchlist')]);
    marketData=mkt.coins; watchlist=wl.watchlist;
    const totalInvested = pf.holdings.reduce((s,h)=>s+h.quantity*h.avg_buy_price,0);
    let totalCurrent = 0;
    pf.holdings.forEach(h=>{ const c=marketData.find(c=>c.id===h.coin_id); if(c) totalCurrent+=h.quantity*c.current_price; });
    const pnl=totalCurrent-totalInvested, pnlPct=totalInvested>0?(pnl/totalInvested*100):0;
    $('dashStats').innerHTML = `
      <div class="stat-card"><div class="label">💰 USDT Balance</div><div class="value">${fmt(pf.fiatBalance)}</div></div>
      <div class="stat-card"><div class="label">📊 Portfolio Value</div><div class="value">${fmt(totalCurrent)}</div></div>
      <div class="stat-card"><div class="label">📈 Total P&L</div><div class="value ${pnl>=0?'positive':'negative'}">${fmt(Math.abs(pnl))}</div><div class="change ${pnl>=0?'positive':'negative'}">${fmtPct(pnlPct)}</div></div>
      <div class="stat-card"><div class="label">🔄 Total Trades</div><div class="value">${pf.totalTransactions}</div></div>`;
    const movers=[...marketData].sort((a,b)=>Math.abs(b.price_change_percentage_24h)-Math.abs(a.price_change_percentage_24h)).slice(0,5);
    $('dashTopMovers').innerHTML = movers.map(c=>`<tr>
      <td><div class="coin-cell"><img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'"><div><div class="coin-name">${c.name}</div><div class="coin-symbol">${c.symbol}</div></div></div></td>
      <td style="font-weight:600">${fmt(c.current_price)}</td>
      <td class="${c.price_change_percentage_24h>=0?'positive':'negative'}" style="font-weight:600">${fmtPct(c.price_change_percentage_24h)}</td>
      <td><canvas class="sparkline-canvas" data-prices='${JSON.stringify((c.sparkline_in_7d?.price||[]).slice(-24))}'></canvas></td>
      <td><button class="btn btn-xs btn-primary" onclick='openTrade(${JSON.stringify({id:c.id,name:c.name,symbol:c.symbol,price:c.current_price,image:c.image})})'>Trade</button></td>
    </tr>`).join('');
    $('lastUpdated').textContent='Updated: '+new Date().toLocaleTimeString();
    drawSparklines();
  } catch(err) { console.error(err); }
}

// ===== MARKET =====
async function loadMarket() {
  try {
    const [mkt,wl]=await Promise.all([api('/api/market/prices'),api('/api/portfolio/watchlist')]);
    marketData=mkt.coins; watchlist=wl.watchlist; renderMarketTable(marketData);
  } catch(err) { console.error(err); }
}
function renderMarketTable(coins) {
  $('marketTableBody').innerHTML = coins.map((c,i)=>`<tr>
    <td>${i+1}</td>
    <td><div class="coin-cell"><img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'"><div><div class="coin-name">${c.name}</div><div class="coin-symbol">${c.symbol}</div></div></div></td>
    <td style="font-weight:600">${fmt(c.current_price)}</td>
    <td class="${(c.price_change_percentage_1h_in_currency||0)>=0?'positive':'negative'}">${fmtPct(c.price_change_percentage_1h_in_currency)}</td>
    <td class="${(c.price_change_percentage_24h||0)>=0?'positive':'negative'}">${fmtPct(c.price_change_percentage_24h)}</td>
    <td class="${(c.price_change_percentage_7d_in_currency||0)>=0?'positive':'negative'}">${fmtPct(c.price_change_percentage_7d_in_currency)}</td>
    <td>${fmtCap(c.market_cap)}</td><td>${fmtCap(c.total_volume)}</td>
    <td><canvas class="sparkline-canvas" data-prices='${JSON.stringify((c.sparkline_in_7d?.price||[]).slice(-48))}'></canvas></td>
    <td><button class="btn btn-xs btn-primary" onclick='openTrade(${JSON.stringify({id:c.id,name:c.name,symbol:c.symbol,price:c.current_price,image:c.image})})'>Trade</button></td>
  </tr>`).join('');
  drawSparklines();
}
function filterMarket() { const q=$('marketSearch').value.toLowerCase(); renderMarketTable(marketData.filter(c=>c.name.toLowerCase().includes(q)||c.symbol.toLowerCase().includes(q))); }

// ===== PORTFOLIO =====
async function loadPortfolio() {
  try {
    const [pf,mkt]=await Promise.all([api('/api/portfolio/summary'),api('/api/market/prices')]);
    marketData=mkt.coins;
    let totalInvested=0,totalCurrent=0;
    const enriched = pf.holdings.map(h=>{
      const coin=marketData.find(c=>c.id===h.coin_id);
      const cp=coin?coin.current_price:h.avg_buy_price;
      const inv=h.quantity*h.avg_buy_price, cur=h.quantity*cp;
      totalInvested+=inv; totalCurrent+=cur;
      return {...h,currentPrice:cp,invested:inv,current:cur,pnl:cur-inv,pnlPct:inv>0?((cur-inv)/inv*100):0,image:coin?.image};
    });
    const pnl=totalCurrent-totalInvested;
    $('portfolioStats').innerHTML = `
      <div class="stat-card"><div class="label">💼 Total Invested</div><div class="value">${fmt(totalInvested)}</div></div>
      <div class="stat-card"><div class="label">📊 Current Value</div><div class="value">${fmt(totalCurrent)}</div></div>
      <div class="stat-card"><div class="label">📈 Unrealized P&L</div><div class="value ${pnl>=0?'positive':'negative'}">${pnl>=0?'+':''}${fmt(Math.abs(pnl))}</div></div>
      <div class="stat-card"><div class="label">🪙 Assets Held</div><div class="value">${pf.holdings.length}</div></div>`;
    if(!enriched.length) { $('holdingsList').innerHTML=`<div class="empty-state"><h3>No Holdings Yet</h3><p>Connect your exchange and start trading!</p></div>`; }
    else { $('holdingsList').innerHTML = enriched.map(h=>`<div class="holding-card">
      <div class="coin-cell"><img src="${h.image||''}" alt="${h.coin_name}" style="width:36px;height:36px;border-radius:50%" onerror="this.style.display='none'"><div><div class="coin-name">${h.coin_name}</div><div class="coin-symbol">${h.coin_symbol} · ${h.quantity.toFixed(6)}</div></div></div>
      <div style="text-align:right"><div style="font-weight:600">${fmt(h.current)}</div><div class="${h.pnl>=0?'positive':'negative'}" style="font-size:13px">${h.pnl>=0?'+':''}${fmt(Math.abs(h.pnl))} (${fmtPct(h.pnlPct)})</div></div>
    </div>`).join(''); }
    // Show exchange balance if connected
    if(pf.exchangeBalance) {
      const assets = Object.entries(pf.exchangeBalance).slice(0,8);
      if(assets.length) {
        $('exchangeBalanceCard').style.display='block';
        $('exchangeBalanceCard').innerHTML = `<div class="data-card"><div class="data-card-header"><h3>💱 Exchange Balances</h3></div>
          ${assets.map(([k,v])=>`<div class="balance-item"><span class="asset-name">${k}</span><span class="asset-amount">${v.total.toFixed(8)}</span></div>`).join('')}</div>`;
      }
    } else { $('exchangeBalanceCard').style.display='none'; }
  } catch(err) { console.error(err); }
}

async function syncPortfolio() {
  try { showToast('Syncing from exchange...','info'); await api('/api/portfolio/sync',{method:'POST'}); showToast('Portfolio synced! ✅','success'); loadPortfolio(); }
  catch(err) { showToast(err.message,'error'); }
}

// ===== WALLET =====
async function loadWallet() {
  try {
    const [txns, exchBal] = await Promise.all([api('/api/wallet/transactions'), api('/api/exchange/balance').catch(()=>({connected:false}))]);
    // Show USDT balance from exchange
    let usdtBal = 0;
    if(exchBal.connected && exchBal.assets) {
      if(exchBal.assets.USDT) usdtBal = exchBal.assets.USDT.free || 0;
      // Show all exchange balances
      const assets = Object.entries(exchBal.assets);
      if(assets.length) {
        $('exchangeBalancesList').innerHTML = assets.map(([k,v])=>`<div class="balance-item">
          <div><span class="asset-name">${k}</span></div>
          <div class="asset-amount"><div>${v.total.toFixed(8)}</div><div style="font-size:11px;color:var(--text-muted)">Free: ${v.free.toFixed(8)}</div></div>
        </div>`).join('');
      } else { $('exchangeBalancesList').innerHTML = '<div class="empty-state"><p>No assets on exchange</p></div>'; }
    } else {
      $('exchangeBalancesList').innerHTML = '<div class="empty-state"><h3>Exchange Not Connected</h3><p>Connect your exchange in Settings to see real balances</p></div>';
    }
    $('walletBalance').textContent = fmt(usdtBal);
    const buys = txns.transactions.filter(t=>t.type==='buy').reduce((s,t)=>s+t.total_amount,0);
    const sells = txns.transactions.filter(t=>t.type==='sell').reduce((s,t)=>s+t.total_amount,0);
    $('totalDeposits').textContent = fmt(buys);
    $('totalWithdrawals').textContent = fmt(sells);
  } catch(err) { console.error(err); }
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
  try {
    const d = await api('/api/wallet/transactions');
    if(!d.transactions.length) { $('txnTableBody').innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No transactions yet</td></tr>`; return; }
    $('txnTableBody').innerHTML = d.transactions.map(t=>`<tr>
      <td><span class="badge badge-${t.type==='buy'?'green':'red'}">${t.type.toUpperCase()}</span></td>
      <td>${t.coin_symbol||'—'}</td>
      <td>${t.quantity?t.quantity.toFixed(6):'—'}</td>
      <td>${t.price_per_unit?fmt(t.price_per_unit):'—'}</td>
      <td style="font-weight:600">${fmt(t.total_amount)}</td>
      <td><span class="badge badge-blue">${t.exchange_name||'local'}</span></td>
      <td style="color:var(--text-muted)">${new Date(t.created_at).toLocaleString()}</td>
    </tr>`).join('');
  } catch(err) { console.error(err); }
}

// ===== SETTINGS =====
async function loadSettings() {
  try {
    const d = await api('/api/exchange/config');
    // Populate exchange dropdown
    const sel = $('exchangeSelect');
    sel.innerHTML = '<option value="">Select an exchange...</option>' + d.exchanges.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
    if(d.connected) {
      exchangeConnected = true;
      $('connectionStatus').innerHTML = `<span class="badge badge-green"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px"></span> Connected</span>`;
      $('exchangeConnectedInfo').style.display = 'block';
      $('exchangeConnectedInfo').innerHTML = `
        <div class="exchange-connected-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div><span class="status-dot"></span><strong>${d.exchangeName}</strong> ${d.isTestnet?'<span class="badge badge-yellow">TESTNET</span>':''}</div>
            <button class="btn btn-xs btn-danger" onclick="disconnectExchange()">Disconnect</button>
          </div>
          <div style="font-size:13px;color:var(--text-muted)">API Key: ${d.apiKeyPreview}</div>
          <div style="font-size:13px;color:var(--text-muted)">Connected: ${new Date(d.connectedAt).toLocaleString()}</div>
        </div>`;
      $('exchangeConnectForm').style.display = 'none';
    } else {
      exchangeConnected = false;
      $('connectionStatus').innerHTML = '<span class="badge badge-red">Disconnected</span>';
      $('exchangeConnectedInfo').style.display = 'none';
      $('exchangeConnectForm').style.display = 'block';
    }
  } catch(err) { console.error(err); }
}

async function connectExchange() {
  const exchangeName=$('exchangeSelect').value, apiKey=$('apiKeyInput').value.trim(), apiSecret=$('apiSecretInput').value.trim(), isTestnet=$('testnetToggle').checked;
  if(!exchangeName||!apiKey||!apiSecret) return showToast('Fill all fields','error');
  const btn = $('connectBtn'); btn.disabled=true; btn.textContent='Connecting...';
  try {
    await api('/api/exchange/connect',{method:'POST',body:{exchangeName,apiKey,apiSecret,isTestnet}});
    showToast('Exchange connected! 🎉','success');
    checkExchangeStatus(); loadSettings();
  } catch(err) { showToast(err.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Connect Exchange'; }
}

async function disconnectExchange() {
  if(!confirm('Disconnect your exchange? You won\'t be able to trade until you reconnect.')) return;
  try { await api('/api/exchange/disconnect',{method:'POST'}); showToast('Exchange disconnected','info'); checkExchangeStatus(); loadSettings(); }
  catch(err) { showToast(err.message,'error'); }
}

// ===== TRADE MODAL =====
function openTrade(coin) {
  if(!exchangeConnected) { showToast('Connect your exchange in Settings first','error'); navigateTo('settings'); return; }
  currentTradeCoin=coin; currentTradeType='buy';
  $('tradeModalTitle').textContent=`Trade ${coin.name}`;
  $('tradeAmount').value=''; $('tradePreview').innerHTML='';
  $('tradeInfo').innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-input);border-radius:var(--radius-sm)">
    <img src="${coin.image||''}" style="width:32px;height:32px;border-radius:50%" onerror="this.style.display='none'">
    <div><div style="font-weight:600">${coin.name} <span style="color:var(--text-muted)">${coin.symbol.toUpperCase()}</span></div>
    <div style="font-size:18px;font-weight:700">${fmt(coin.price)}</div></div></div>`;
  document.querySelectorAll('#tradeModal .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  $('tradeSubmitBtn').textContent='Buy '+coin.symbol.toUpperCase();
  $('tradeSubmitBtn').className='btn btn-success'; $('tradeSubmitBtn').style.width='100%';
  $('tradeModal').classList.add('show');
}
function closeTradeModal() { $('tradeModal').classList.remove('show'); }
function setTradeType(type,btn) {
  currentTradeType=type;
  document.querySelectorAll('#tradeModal .tab-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  $('tradeSubmitBtn').textContent=`${type==='buy'?'Buy':'Sell'} ${currentTradeCoin.symbol.toUpperCase()}`;
  $('tradeSubmitBtn').className=type==='buy'?'btn btn-success':'btn btn-danger';
  $('tradeSubmitBtn').style.width='100%'; updateTradePreview();
}
function updateTradePreview() {
  const a=parseFloat($('tradeAmount').value);
  if(!a||a<=0||!currentTradeCoin) { $('tradePreview').innerHTML='<span style="color:var(--text-muted)">Enter an amount to see preview</span>'; return; }
  const qty=a/currentTradeCoin.price;
  $('tradePreview').innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Quantity</span><strong>${qty.toFixed(8)} ${currentTradeCoin.symbol.toUpperCase()}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Price per unit</span><strong>${fmt(currentTradeCoin.price)}</strong></div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;margin-top:4px"><span>Total</span><strong>${fmt(a)}</strong></div>`;
}
async function executeTrade() {
  const amount=parseFloat($('tradeAmount').value);
  if(!amount||amount<=0) return showToast('Enter a valid amount','error');
  const qty=amount/currentTradeCoin.price;
  const btn=$('tradeSubmitBtn'); btn.disabled=true; btn.textContent='Executing...';
  try {
    if(currentTradeType==='buy') {
      const r = await api('/api/trade/buy',{method:'POST',body:{coinId:currentTradeCoin.id,coinName:currentTradeCoin.name,coinSymbol:currentTradeCoin.symbol,quantity:qty,pricePerUnit:currentTradeCoin.price,amountUSD:amount}});
      showToast(`Bought ${r.order.quantity.toFixed(6)} ${currentTradeCoin.symbol.toUpperCase()} @ ${fmt(r.order.price)} 🎉`,'success');
    } else {
      const r = await api('/api/trade/sell',{method:'POST',body:{coinId:currentTradeCoin.id,coinSymbol:currentTradeCoin.symbol,quantity:qty,pricePerUnit:currentTradeCoin.price}});
      showToast(`Sold ${r.order.quantity.toFixed(6)} ${currentTradeCoin.symbol.toUpperCase()} @ ${fmt(r.order.price)}`,'success');
    }
    closeTradeModal();
    navigateTo(document.querySelector('.nav-item.active')?.dataset.page||'dashboard');
  } catch(err) { showToast(err.message,'error'); }
  finally { btn.disabled=false; btn.textContent=`${currentTradeType==='buy'?'Buy':'Sell'} ${currentTradeCoin.symbol.toUpperCase()}`; }
}

function closeModal(id) { $(id).classList.remove('show'); }

// ===== SPARKLINES =====
function drawSparklines() {
  document.querySelectorAll('.sparkline-canvas').forEach(canvas => {
    try {
      const prices=JSON.parse(canvas.dataset.prices||'[]'); if(!prices.length) return;
      const ctx=canvas.getContext('2d');
      canvas.width=canvas.offsetWidth*2; canvas.height=canvas.offsetHeight*2; ctx.scale(2,2);
      const dw=canvas.offsetWidth, dh=canvas.offsetHeight;
      const min=Math.min(...prices), max=Math.max(...prices), range=max-min||1;
      const isUp=prices[prices.length-1]>=prices[0];
      ctx.strokeStyle=isUp?'#10b981':'#ef4444'; ctx.lineWidth=1.5; ctx.beginPath();
      prices.forEach((p,i)=>{ const x=(i/(prices.length-1))*dw, y=dh-((p-min)/range)*(dh-4)-2; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.stroke();
      const grad=ctx.createLinearGradient(0,0,0,dh);
      grad.addColorStop(0,isUp?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)');
      grad.addColorStop(1,'transparent');
      ctx.lineTo(dw,dh); ctx.lineTo(0,dh); ctx.fillStyle=grad; ctx.fill();
    } catch(e) {}
  });
}

// ===== AUTO-REFRESH =====
setInterval(async()=>{
  try { const m=await api('/api/market/prices'); marketData=m.coins;
    const p=document.querySelector('.nav-item.active')?.dataset.page;
    if(p==='dashboard') loadDashboard(); if(p==='market') renderMarketTable(marketData);
  } catch{}
},60000);

// ===== INIT =====
checkSession();
