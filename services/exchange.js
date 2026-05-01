const ccxt = require('ccxt');
const { db } = require('../db/database');

// Supported exchanges and their ccxt class names
const SUPPORTED_EXCHANGES = {
  binance: { name: 'Binance', class: 'binance' },
  coinbase: { name: 'Coinbase', class: 'coinbase' },
  kraken: { name: 'Kraken', class: 'kraken' },
  kucoin: { name: 'KuCoin', class: 'kucoin' },
  bybit: { name: 'Bybit', class: 'bybit' },
};

// CoinGecko ID → Exchange trading symbol mapping
const COIN_SYMBOL_MAP = {
  bitcoin: 'BTC', ethereum: 'ETH', tether: 'USDT', binancecoin: 'BNB',
  ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', solana: 'SOL',
  polkadot: 'DOT', litecoin: 'LTC', chainlink: 'LINK', 'avalanche-2': 'AVAX',
  uniswap: 'UNI', stellar: 'XLM', 'matic-network': 'MATIC'
};

// Cache exchange instances per user
const exchangeCache = new Map();

/**
 * Get or create a ccxt exchange instance for a user
 */
function getExchange(userId) {
  // Check cache first
  if (exchangeCache.has(userId)) {
    return exchangeCache.get(userId);
  }

  const keys = db.prepare('SELECT * FROM exchange_keys WHERE user_id = ?').get(userId);
  if (!keys) {
    return null;
  }

  const exchangeConfig = SUPPORTED_EXCHANGES[keys.exchange_name];
  if (!exchangeConfig) {
    throw new Error(`Unsupported exchange: ${keys.exchange_name}`);
  }

  const ExchangeClass = ccxt[exchangeConfig.class];
  const exchange = new ExchangeClass({
    apiKey: keys.api_key,
    secret: keys.api_secret,
    enableRateLimit: true,
    options: { defaultType: 'spot' }
  });

  // Enable testnet/sandbox if configured
  if (keys.is_testnet) {
    exchange.setSandboxMode(true);
  }

  exchangeCache.set(userId, exchange);
  return exchange;
}

/**
 * Clear cached exchange instance (call when keys are updated)
 */
function clearExchangeCache(userId) {
  exchangeCache.delete(userId);
}

/**
 * Test exchange connection with provided keys
 */
async function testConnection(exchangeName, apiKey, apiSecret, isTestnet) {
  const exchangeConfig = SUPPORTED_EXCHANGES[exchangeName];
  if (!exchangeConfig) {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  const ExchangeClass = ccxt[exchangeConfig.class];
  const exchange = new ExchangeClass({
    apiKey, secret: apiSecret, enableRateLimit: true,
    options: { defaultType: 'spot' }
  });

  if (isTestnet) exchange.setSandboxMode(true);

  // Try fetching balance to verify keys work
  const balance = await exchange.fetchBalance();
  return { success: true, balance };
}

/**
 * Get real-time balance from exchange
 */
async function getBalance(userId) {
  const exchange = getExchange(userId);
  if (!exchange) return null;

  try {
    const balance = await exchange.fetchBalance();
    // Return non-zero balances
    const assets = {};
    for (const [currency, amounts] of Object.entries(balance.total || {})) {
      if (amounts > 0) {
        assets[currency] = {
          total: amounts,
          free: balance.free[currency] || 0,
          used: balance.used[currency] || 0
        };
      }
    }
    return assets;
  } catch (err) {
    console.error('Balance fetch error:', err.message);
    throw new Error(`Failed to fetch balance: ${err.message}`);
  }
}

/**
 * Place a market buy order on the exchange
 */
async function marketBuy(userId, coinId, amountUSD) {
  const exchange = getExchange(userId);
  if (!exchange) throw new Error('Exchange not connected. Please add your API keys in Settings.');

  const symbol = COIN_SYMBOL_MAP[coinId];
  if (!symbol) throw new Error(`Unsupported coin: ${coinId}`);

  const tradingPair = `${symbol}/USDT`;

  try {
    // Fetch current price to calculate quantity
    const ticker = await exchange.fetchTicker(tradingPair);
    const price = ticker.last || ticker.close;
    const quantity = amountUSD / price;

    // Place market buy order
    const order = await exchange.createMarketBuyOrder(tradingPair, quantity);

    return {
      orderId: order.id,
      symbol: symbol,
      side: 'buy',
      quantity: order.filled || quantity,
      price: order.average || price,
      total: order.cost || (quantity * price),
      status: order.status,
      exchange: exchange.id
    };
  } catch (err) {
    console.error('Market buy error:', err.message);
    if (err.message.includes('insufficient')) {
      throw new Error('Insufficient USDT balance on exchange. Please deposit funds on your exchange first.');
    }
    throw new Error(`Buy order failed: ${err.message}`);
  }
}

/**
 * Place a market sell order on the exchange
 */
async function marketSell(userId, coinId, quantity) {
  const exchange = getExchange(userId);
  if (!exchange) throw new Error('Exchange not connected. Please add your API keys in Settings.');

  const symbol = COIN_SYMBOL_MAP[coinId];
  if (!symbol) throw new Error(`Unsupported coin: ${coinId}`);

  const tradingPair = `${symbol}/USDT`;

  try {
    // Fetch current price
    const ticker = await exchange.fetchTicker(tradingPair);
    const price = ticker.last || ticker.close;

    // Place market sell order
    const order = await exchange.createMarketSellOrder(tradingPair, quantity);

    return {
      orderId: order.id,
      symbol: symbol,
      side: 'sell',
      quantity: order.filled || quantity,
      price: order.average || price,
      total: order.cost || (quantity * price),
      status: order.status,
      exchange: exchange.id
    };
  } catch (err) {
    console.error('Market sell error:', err.message);
    if (err.message.includes('insufficient')) {
      throw new Error(`Insufficient ${symbol} balance on exchange.`);
    }
    throw new Error(`Sell order failed: ${err.message}`);
  }
}

/**
 * Fetch open orders from exchange
 */
async function getOpenOrders(userId, coinId = null) {
  const exchange = getExchange(userId);
  if (!exchange) return [];

  try {
    let pair = undefined;
    if (coinId && COIN_SYMBOL_MAP[coinId]) {
      pair = `${COIN_SYMBOL_MAP[coinId]}/USDT`;
    }
    return await exchange.fetchOpenOrders(pair);
  } catch (err) {
    console.error('Open orders error:', err.message);
    return [];
  }
}

/**
 * Fetch recent trades from exchange
 */
async function getMyTrades(userId, coinId = null, limit = 50) {
  const exchange = getExchange(userId);
  if (!exchange) return [];

  try {
    let pair = undefined;
    if (coinId && COIN_SYMBOL_MAP[coinId]) {
      pair = `${COIN_SYMBOL_MAP[coinId]}/USDT`;
    }
    return await exchange.fetchMyTrades(pair, undefined, limit);
  } catch (err) {
    console.error('My trades error:', err.message);
    return [];
  }
}

module.exports = {
  SUPPORTED_EXCHANGES,
  COIN_SYMBOL_MAP,
  getExchange,
  clearExchangeCache,
  testConnection,
  getBalance,
  marketBuy,
  marketSell,
  getOpenOrders,
  getMyTrades
};
