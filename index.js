const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./auth');
const MercadoLivreAPI = require('./mercadolivre');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'seu_secret_key_aqui',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  res.json({ message: 'Servidor rodando!' });
});

app.get('/status', (req, res) => {
  res.json({ status: 'online' });
});

app.use('/auth', authRoutes);

app.get('/api/products', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    console.log('📦 Iniciando busca de produtos...');

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();
    console.log(`✅ Autenticado como: ${user.nickname}`);

    const allListings = [];
    const PAGES_TO_FETCH = 10;
    const ITEMS_PER_PAGE = 50;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      try {
        console.log(`📍 Buscando página ${page + 1}/${PAGES_TO_FETCH}...`);
        
        const listings = await ml.getMyListings(user.id, page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
        
        if (!listings || listings.length === 0) {
          console.log(`⚠️ Nenhum produto encontrado na página ${page + 1}`);
          break;
        }
        
        allListings.push(...listings);
        console.log(`✅ Página ${page + 1}: ${listings.length} produtos`);
        
      } catch (error) {
        console.error(`❌ Erro ao buscar página ${page + 1}:`, error.message);
        break;
      }
    }

    console.log(`📊 Total de produtos encontrados: ${allListings.length}`);

    const products = await Promise.all(
      allListings.map(async (listing) => {
        try {
          const details = await ml.getItemDetails(listing.id);
          return {
            id: details.id,
            title: details.title,
            price: details.price,
            sold_quantity: details.sold_quantity,
            available_quantity: details.available_quantity,
            category_id: details.category_id,
            rating: details.rating || 0
          };
        } catch (error) {
          console.error(`Erro ao buscar produto ${listing.id}`);
          return null;
        }
      })
    );

    const validProducts = products.filter(p => p !== null);

    res.json({
      user: user.nickname,
      total_products: allListings.length,
      products_fetched: validProducts.length,
      products: validProducts
    });

  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error.message);
    res.status(500).json({ error: 'Erro ao buscar produtos', message: error.message });
  }
});

app.get('/api/coupons', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    console.log('🎟️ Iniciando busca de cupons...');

    const allCoupons = [];
    const PAGES_TO_FETCH = 20;
    const COUPONS_PER_PAGE = 15;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      try {
        console.log(`📍 Buscando página ${page + 1}/${PAGES_TO_FETCH} de cupons...`);
        
        const coupons = generateMockCoupons(page, COUPONS_PER_PAGE);
        
        if (!coupons || coupons.length === 0) {
          console.log(`⚠️ Nenhum cupom encontrado na página ${page + 1}`);
          break;
        }
        
        allCoupons.push(...coupons);
        console.log(`✅ Página ${page + 1}: ${coupons.length} cupons`);
        
      } catch (error) {
        console.error(`❌ Erro ao buscar página ${page + 1}:`, error.message);
        break;
      }
    }

    console.log(`📊 Total de cupons encontrados: ${allCoupons.length}`);

    res.json({
      total_coupons: allCoupons.length,
      coupons: allCoupons
    });

  } catch (error) {
    console.error('❌ Erro ao buscar cupons:', error.message);
    res.status(500).json({ error: 'Erro ao buscar cupons', message: error.message });
  }
});

app.get('/api/best-product-for-coupon', async (req, res) => {
  const { token, marca } = req.query;

  if (!token || !marca) {
    return res.status(400).json({ error: 'Token ou marca não fornecidos' });
  }

  try {
    console.log(`🔍 Buscando melhor produto para: ${marca}`);

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();

    const allListings = [];
    const PAGES_TO_FETCH = 10;
    const ITEMS_PER_PAGE = 50;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      try {
        const listings = await ml.getMyListings(user.id, page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
        
        if (!listings || listings.length === 0) break;
        
        allListings.push(...listings);
        
      } catch (error) {
        break;
      }
    }

    const products = await Promise.all(
      allListings.map(async (listing) => {
        try {
          const details = await ml.getItemDetails(listing.id);
          return {
            id: details.id,
            title: details.title,
            price: details.price,
            sold_quantity: details.sold_quantity,
            available_quantity: details.available_quantity,
            category_id: details.category_id,
            rating: details.rating || 0
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validProducts = products.filter(p => p !== null);

    const bestProduct = selectBestProduct(validProducts);

    res.json({
      marca: marca,
      total_products_analyzed: validProducts.length,
      best_product: bestProduct
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar melhor produto', message: error.message });
  }
});

function selectBestProduct(products) {
  if (!products || products.length === 0) return null;

  const scoredProducts = products.map(product => {
    let score = 0;

    score += (product.rating / 5) * 30;

    const maxSold = Math.max(...products.map(p => p.sold_quantity));
    score += (product.sold_quantity / (maxSold || 1)) * 30;

    if (product.available_quantity > 0) {
      score += 20;
    }

    const minPrice = Math.min(...products.map(p => p.price));
    score += ((minPrice / (product.price || 1)) * 20);

    return {
      ...product,
      score: Math.round(score * 100) / 100
    };
  });

  return scoredProducts.sort((a, b) => b.score - a.score)[0];
}

function generateMockCoupons(page, itemsPerPage) {
  const marcas = ['Darklab', 'Vog Oficial', 'Sandrini', 'Crocs', 'Bixxis', 'Aheadsports', 'Ptw Pitoweylabs', 'Devintexcosmeticos'];
  const descontos = ['R$ 80 OFF', 'R$ 40 OFF', '10% OFF', '15% OFF', 'R$ 30 OFF', '5% OFF', 'R$ 50 OFF', '20% OFF'];
  
  const coupons = [];
  const startIndex = page * itemsPerPage;

  for (let i = 0; i < itemsPerPage; i++) {
    const index = (startIndex + i) % (marcas.length * descontos.length);
    
    coupons.push({
      id: startIndex + i + 1,
      desconto: descontos[index % descontos.length],
      marca: marcas[Math.floor(index / descontos.length) % marcas.length],
      vencimento: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      budget: 'R$ ' + (Math.random() * 1000000).toFixed(2)
    });
  }

  return coupons;
}

app.get('/dashboard', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token não fornecido');
  }

  res.sendFile(__dirname + '/dashboard.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});