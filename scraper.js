const puppeteer = require('puppeteer');

async function scrapeMLProducts(categoryUrl, limit = 50) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Headers de navegador para evitar bloqueio
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });

  try {
    console.log(`🔍 Scraping produtos de: ${categoryUrl}`);
    await page.goto(categoryUrl, { waitUntil: 'networkidle2' });

    // Espera carregar produtos
    await page.waitForSelector('.ui-search-results__item', { timeout: 10000 });

    const products = await page.evaluate((lim) => {
      const items = document.querySelectorAll('.ui-search-results__item');
      const results = [];
      for (let i = 0; i < Math.min(items.length, lim); i++) {
        const item = items[i];
        const title = item.querySelector('.ui-search-item__title')?.textContent?.trim() || 'N/A';
        const price = item.querySelector('.andes-money-amount__fraction')?.textContent?.trim() || 'N/A';
        const sold = item.querySelector('[data-testid="sold-quantity"]')?.textContent?.trim() || '0 vendidos';
        const thumbnail = item.querySelector('img')?.src || '';
        const link = item.querySelector('a')?.href || '';

        results.push({
          title: title.substring(0, 100),
          price: parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
          sold_quantity: parseInt(sold.replace(/[^\d]/g, '')) || 0,
          thumbnail,
          link
        });
      }
      return results;
    }, limit);

    console.log(`✅ Scraping concluído: ${products.length} produtos`);
    return products;
  } catch (error) {
    console.error('❌ Erro no scraping:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeMLProducts };