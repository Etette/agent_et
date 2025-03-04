import NodeCache from 'node-cache';
import axios from 'axios';

export class PriceManager {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({ stdTTL: 60 }); // 60 seconds TTL
  }

  async getPrice(symbol: string): Promise<number | null> {
    const cached = this.cache.get<number>(symbol);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
      );
      // const data = await response.json();
      const price = response.data[symbol]?.usd;
      // response.data[token.symbol].usd;
      
      if (price) {
        this.cache.set(symbol, price);
        return price;
      }
      
      return null;
    } catch (error) {
      console.error('Price fetch error:', error);
      return null;
    }
  }
}

// import axios from 'axios';
// import NodeCache from 'node-cache';
// import {SupportedToken, TokenConfig, TokenPriceInfo, CoinGeckoResponse } from './utils/types';


// export class PriceManager {
//   private cache: NodeCache;
//   private readonly API_BASE_URL = 'https://api.coingecko.com/api/v3';
//   private readonly COIN_ID_MAP: Record<SupportedToken, string> = {
//     LSK_S: 'sepolia',
//     USDT: 'tether',
//     LSK: 'lisk'
//   };
  
//   constructor(cacheTTL: number = 60) {
//     this.cache = new NodeCache({ 
//       stdTTL: cacheTTL,
//       checkperiod: cacheTTL * 0.2
//     });

//     // Initialize axios defaults
//     axios.defaults.baseURL = this.API_BASE_URL;
//     axios.defaults.timeout = 5000;
//     axios.defaults.headers.common['Accept'] = 'application/json';
//   }

//   private getCoinId(symbol: string): string {
//     const upperSymbol = symbol.toUpperCase() as SupportedToken;
//     const coinId = this.COIN_ID_MAP[upperSymbol];
    
//     if (!coinId) {
//       throw new Error(`Unsupported token symbol: ${symbol}`);
//     }
    
//     return coinId;
//   }

//   private formatPriceResponse(price: number): TokenPriceInfo {
//     return {
//       price,
//       lastUpdated: Date.now()
//     };
//   }

//   async getPrice(symbol: string): Promise<number | null> {
//     try {
//       // Check cache first
//       const cached = this.cache.get<TokenPriceInfo>(symbol);
//       if (cached) {
//         return cached.price;
//       }

//       const coinId = this.getCoinId(symbol);
      
//       const { data } = await axios.get<CoinGeckoResponse>('/simple/price', {
//         params: {
//           ids: coinId,
//           vs_currencies: 'usd'
//         }
//       });

//       const price = data[coinId]?.usd;
      
//       if (price) {
//         const priceInfo = this.formatPriceResponse(price);
//         this.cache.set(symbol, priceInfo);
//         return price;
//       }
      
//       return null;
//     } catch (error) {
//       if (axios.isAxiosError(error)) {
//         if (error.response?.status === 429) {
//           console.error('Rate limit exceeded on CoinGecko API');
//           // Return cached data if available, even if expired
//           const expired = this.cache.get<TokenPriceInfo>(symbol, true);
//           if (expired) {
//             console.log('Returning expired price data');
//             return expired.price;
//           }
//         }
//         console.error(`API error (${error.response?.status}):`, error.message);
//       } else {
//         console.error('Price fetch error:', error);
//       }
//       return null;
//     }
//   }

//   async getBatchPrices(symbols: string[]): Promise<Record<string, number | null>> {
//     try {
//       const coinIds = symbols.map(this.getCoinId.bind(this));
      
//       const { data } = await axios.get<CoinGeckoResponse>('/simple/price', {
//         params: {
//           ids: coinIds.join(','),
//           vs_currencies: 'usd'
//         }
//       });

//       const results: Record<string, number | null> = {};
      
//       symbols.forEach((symbol, index) => {
//         const coinId = coinIds[index];
//         const price = data[coinId]?.usd ?? null;
        
//         if (price) {
//           const priceInfo = this.formatPriceResponse(price);
//           this.cache.set(symbol, priceInfo);
//         }
        
//         results[symbol] = price;
//       });

//       return results;
//     } catch (error) {
//       console.error('Batch price fetch error:', error);
      
//       // Fallback to cached prices
//       return symbols.reduce((acc, symbol) => {
//         const cached = this.cache.get<TokenPriceInfo>(symbol, true);
//         acc[symbol] = cached?.price ?? null;
//         return acc;
//       }, {} as Record<string, number | null>);
//     }
//   }

//   async getPriceHistory(symbol: string, days: number = 7): Promise<{
//     prices: Array<[number, number]>;
//     error?: string;
//   }> {
//     try {
//       const coinId = this.getCoinId(symbol);
      
//       const { data } = await axios.get(`/coins/${coinId}/market_chart`, {
//         params: {
//           vs_currency: 'usd',
//           days: days,
//           interval: 'daily'
//         }
//       });

//       return { prices: data.prices };
//     } catch (error) {
//       console.error('Price history fetch error:', error);
//       return {
//         prices: [],
//         error: 'Failed to fetch price history'
//       };
//     }
//   }

//   clearCache(symbol?: string) {
//     if (symbol) {
//       this.cache.del(symbol);
//     } else {
//       this.cache.flushAll();
//     }
//   }
// }