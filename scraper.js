const puppeteer = require('puppeteer');

async function scrapeMLProducts(categoryUrl, limit = 50) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']  // Para Railway/Heroku
  });
  const page = await browser.newPage();

  // Headers de navegador para evitar bloqueio
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  });

  try {
    console.log(`🔍 Scraping produtos de: ${categoryUrl}`);
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Espera carregar produtos
    await page.waitForSelector('.ui-search-results__item', { timeout: 10000 });

    // Scroll para carregar mais itens (se necessário)
    await page.evaluate(async (lim) => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, limit);

    const products = await page.evaluate((lim) => {
      const items = document.querySelectorAll('.ui-search-results__item');
      const results = [];
      for (let i = 0; i < Math.min(items.length, lim); i++) {
        const item = items[i];
        const titleEl = item.querySelector('.ui-search-item__title');
        const priceEl = item.querySelector('.andes-money-amount__fraction');
        const soldEl = item.querySelector('[data-testid="sold-quantity"]') || item.querySelector('.ui-search-item__subtitle');
        const thumbnailEl = item.querySelector('img');
        const linkEl = item.querySelector('a');

        const title = titleEl ? titleEl.textContent.trim() : 'N/A';
        const priceStr = priceEl ? priceEl.textContent.trim() : '0';
        const soldStr = soldEl ? soldEl.textContent.trim() : '0 vendidos';
        const thumbnail = thumbnailEl ? thumbnailEl.src : '';
        const link = linkEl ? linkEl.href : '';

        // Parse preço (ex.: "R$ 1.299" -> 1299)
        const price = parseFloat(priceStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        // Parse vendidos (ex.: "1.200 vendidos" -> 1200)
        const sold_quantity = parseInt(soldStr.replace(/[^\d]/g, '')) || 0;

        results.push({
          title: title.substring(0, 100),
          price,
          sold_quantity,
          available_quantity: Math.floor(Math.random() * 500) + 50,  // Simulado
          thumbnail,
          link
        });
      }
      return results;
    }, limit);

    console.log(`✅ Scraping concluído: ${products.length} produtos reais`);
    return products;
  } catch (error) {
    console.error('❌ Erro no scraping:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeMLProducts };