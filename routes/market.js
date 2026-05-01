const express = require('express');
const router = express.Router();

const SUPPORTED_COINS = [
  'bitcoin','ethereum','tether','binancecoin','ripple','cardano','dogecoin',
  'solana','polkadot','litecoin','chainlink','avalanche-2','uniswap','stellar','matic-network'
];

let marketCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60000;

const FALLBACK = [
  {id:'bitcoin',symbol:'btc',name:'Bitcoin',image:'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',current_price:67500,market_cap:1320000000000,total_volume:28000000000,price_change_percentage_24h:2.5,price_change_percentage_1h_in_currency:0.3,price_change_percentage_7d_in_currency:5.2,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>65000+Math.sin(i/10)*2500)}},
  {id:'ethereum',symbol:'eth',name:'Ethereum',image:'https://assets.coingecko.com/coins/images/279/large/ethereum.png',current_price:3450,market_cap:415000000000,total_volume:15000000000,price_change_percentage_24h:1.8,price_change_percentage_1h_in_currency:-0.2,price_change_percentage_7d_in_currency:3.1,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>3200+Math.sin(i/12)*250)}},
  {id:'tether',symbol:'usdt',name:'Tether',image:'https://assets.coingecko.com/coins/images/325/large/Tether.png',current_price:1.0,market_cap:110000000000,total_volume:45000000000,price_change_percentage_24h:0.01,price_change_percentage_1h_in_currency:0,price_change_percentage_7d_in_currency:0.02,sparkline_in_7d:{price:Array.from({length:168},()=>1+(Math.random()-0.5)*0.002)}},
  {id:'binancecoin',symbol:'bnb',name:'BNB',image:'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',current_price:595,market_cap:89000000000,total_volume:1500000000,price_change_percentage_24h:0.8,price_change_percentage_1h_in_currency:0.1,price_change_percentage_7d_in_currency:2.3,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>580+Math.sin(i/15)*20)}},
  {id:'ripple',symbol:'xrp',name:'XRP',image:'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',current_price:0.52,market_cap:28000000000,total_volume:1200000000,price_change_percentage_24h:-1.2,price_change_percentage_1h_in_currency:0.4,price_change_percentage_7d_in_currency:-2.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>0.50+Math.sin(i/8)*0.04)}},
  {id:'cardano',symbol:'ada',name:'Cardano',image:'https://assets.coingecko.com/coins/images/975/large/cardano.png',current_price:0.45,market_cap:16000000000,total_volume:400000000,price_change_percentage_24h:3.1,price_change_percentage_1h_in_currency:0.6,price_change_percentage_7d_in_currency:8.2,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>0.42+Math.sin(i/10)*0.04)}},
  {id:'dogecoin',symbol:'doge',name:'Dogecoin',image:'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',current_price:0.082,market_cap:11500000000,total_volume:500000000,price_change_percentage_24h:-0.5,price_change_percentage_1h_in_currency:-0.1,price_change_percentage_7d_in_currency:1.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>0.08+Math.sin(i/7)*0.005)}},
  {id:'solana',symbol:'sol',name:'Solana',image:'https://assets.coingecko.com/coins/images/4128/large/solana.png',current_price:145,market_cap:63000000000,total_volume:2500000000,price_change_percentage_24h:4.2,price_change_percentage_1h_in_currency:1.0,price_change_percentage_7d_in_currency:12.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>135+Math.sin(i/9)*15)}},
  {id:'polkadot',symbol:'dot',name:'Polkadot',image:'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',current_price:7.25,market_cap:9500000000,total_volume:250000000,price_change_percentage_24h:1.5,price_change_percentage_1h_in_currency:0.3,price_change_percentage_7d_in_currency:4.1,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>6.8+Math.sin(i/11)*0.6)}},
  {id:'litecoin',symbol:'ltc',name:'Litecoin',image:'https://assets.coingecko.com/coins/images/2/large/litecoin.png',current_price:72,market_cap:5300000000,total_volume:350000000,price_change_percentage_24h:0.9,price_change_percentage_1h_in_currency:-0.3,price_change_percentage_7d_in_currency:2.8,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>70+Math.sin(i/13)*4)}},
  {id:'chainlink',symbol:'link',name:'Chainlink',image:'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',current_price:14.5,market_cap:8500000000,total_volume:600000000,price_change_percentage_24h:2.1,price_change_percentage_1h_in_currency:0.5,price_change_percentage_7d_in_currency:6.7,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>13.5+Math.sin(i/10)*1.5)}},
  {id:'avalanche-2',symbol:'avax',name:'Avalanche',image:'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',current_price:35.8,market_cap:13000000000,total_volume:450000000,price_change_percentage_24h:3.5,price_change_percentage_1h_in_currency:0.8,price_change_percentage_7d_in_currency:9.3,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>33+Math.sin(i/8)*4)}},
  {id:'uniswap',symbol:'uni',name:'Uniswap',image:'https://assets.coingecko.com/coins/images/12504/large/uni.jpg',current_price:7.8,market_cap:5900000000,total_volume:180000000,price_change_percentage_24h:1.2,price_change_percentage_1h_in_currency:-0.4,price_change_percentage_7d_in_currency:3.5,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>7.2+Math.sin(i/12)*0.8)}},
  {id:'stellar',symbol:'xlm',name:'Stellar',image:'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png',current_price:0.115,market_cap:3300000000,total_volume:100000000,price_change_percentage_24h:-0.7,price_change_percentage_1h_in_currency:0.2,price_change_percentage_7d_in_currency:1.9,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>0.11+Math.sin(i/14)*0.008)}},
  {id:'matic-network',symbol:'matic',name:'Polygon',image:'https://assets.coingecko.com/coins/images/4713/large/polygon.png',current_price:0.72,market_cap:6700000000,total_volume:300000000,price_change_percentage_24h:2.8,price_change_percentage_1h_in_currency:0.7,price_change_percentage_7d_in_currency:7.1,sparkline_in_7d:{price:Array.from({length:168},(_,i)=>0.68+Math.sin(i/10)*0.06)}}
];

async function fetchMarketData() {
  const now = Date.now();
  if (marketCache.data && (now - marketCache.timestamp) < CACHE_DURATION) return marketCache.data;
  try {
    const ids = SUPPORTED_COINS.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=15&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    marketCache = { data, timestamp: now };
    return data;
  } catch (err) {
    console.error('Market fetch error:', err.message);
    if (marketCache.data) return marketCache.data;
    return FALLBACK;
  }
}

router.get('/prices', async (req, res) => {
  try { res.json({ coins: await fetchMarketData() }); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch market data.' }); }
});

router.get('/coin/:id', async (req, res) => {
  try {
    const data = await fetchMarketData();
    const coin = data.find(c => c.id === req.params.id);
    if (!coin) return res.status(404).json({ error: 'Coin not found.' });
    res.json({ coin });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch coin data.' }); }
});

module.exports = router;
