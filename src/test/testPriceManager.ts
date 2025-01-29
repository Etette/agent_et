import { PriceManager } from '../lib/PriceManager';

(async function testPriceManager() {
  const priceManager = new PriceManager();

  // Test with a valid symbol
  const symbol1 = 'bitcoin';
  const price1 = await priceManager.getPrice(symbol1);
  console.log(`Price for ${symbol1}:`, price1);

  // Test with another valid symbol
  const symbol2 = 'ethereum';
  const price2 = await priceManager.getPrice(symbol2);
  console.log(`Price for ${symbol2}:`, price2);

  const symbolx = 'lisk';
  const pricex = await priceManager.getPrice(symbolx);
  console.log(`Price for ${symbolx}:`, pricex);

  // Test with an invalid symbol
  const symbol3 = 'invalid-symbol';
  const price3 = await priceManager.getPrice(symbol3);
  console.log(`Price for ${symbol3}:`, price3);

  // Test if the cache works
  const cachedPrice1 = await priceManager.getPrice(symbol1); // Should return cached price
  console.log(`Cached price for ${symbol1}:`, cachedPrice1);

  // Confirm cache functionality
  if (price1 === cachedPrice1) {
    console.log('Cache works as expected!');
  } else {
    console.error('Cache did not work as expected!');
  }
})();
