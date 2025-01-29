import NodeCache from 'node-cache';
import fetch from 'node-fetch';

export class PriceManager {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({ stdTTL: 60 }); // 60 seconds TTL
  }

  async getPrice(symbol: string): Promise<number | null> {
    const cached = this.cache.get<number>(symbol);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
      );
      const data = await response.json();
      const price = data[symbol]?.usd;
      
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
