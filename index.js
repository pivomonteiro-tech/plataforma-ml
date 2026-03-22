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

// Dados mock de produtos disponíveis para o usuário logado
const produtosDisponiveis = [
  { id: 1, title: 'Fone Bluetooth Premium', price: 89.90, sold_quantity: 1250, available_quantity: 45, rating: 4.8, category_id: 'MLA123' },
  { id: 2, title: 'Carregador Rápido USB-C', price: 49.90, sold_quantity: 850, available_quantity: 120, rating: 4.5, category_id: 'MLA124' },
  { id: 3, title: 'Cabo HDMI 2.0', price: 29.90, sold_quantity: 2100, available_quantity: 300, rating: 4.3, category_id: 'MLA125' },
  { id: 4, title: 'Adaptador Wireless', price: 59.90, sold_quantity: 650, available_quantity: 80, rating: 4.6, category_id: 'MLA126' },
  { id: 5, title: 'Protetor de Tela Vidro', price: 19.90, sold_quantity: 3200, available_quantity: 500, rating: 4.7, category_id: 'MLA127' },
  { id: 6, title: 'Capa Silicone Premium', price: 34.90, sold_quantity: 1800, available_quantity: 250, rating: 4.4, category_id: 'MLA128' },
  { id: 7, title: 'Bateria Externa 20000mAh', price: 79.90, sold_quantity: 920, available_quantity: 60, rating: 4.9, category_id: 'MLA129' },
  { id: 8, title: 'Suporte Celular Veicular', price: 44.90, sold_quantity: 1100, available_quantity: 150, rating: 4.5, category_id: 'MLA130' },
  { id: 9, title: 'Película Protetora Matte', price: 24.90, sold_quantity: 2500, available_quantity: 400, rating: 4.6, category_id: 'MLA131' },
  { id: 10, title: 'Ventilador USB Portátil', price: 39.90, sold_quantity: 780, available_quantity: 90, rating: 4.3, category_id: 'MLA132' },
  { id: 11, title: 'Teclado Bluetooth Wireless', price: 99.90, sold_quantity: 540, available_quantity: 35, rating: 4.7, category_id: 'MLA133' },
  { id: 12, title: 'Mouse Óptico USB', price: 29.90, sold_quantity: 1600, available_quantity: 200, rating: 4.4, category_id: 'MLA134' },
  { id: 13, title: 'Hub USB 3.0 7 Portas', price: 69.90, sold_quantity: 420, available_quantity: 50, rating: 4.8, category_id: 'MLA135' },
  { id: 14, title: 'Webcam Full HD 1080p', price: 129.90, sold_quantity: 380, available_quantity: 25, rating: 4.9, category_id: 'MLA136' },
  { id: 15, title: 'Microfone Condensador USB', price: 149.90, sold_quantity: 290, available_quantity: 20, rating: 4.6, category_id: 'MLA137' }
];

// ROTA: Buscar produtos disponíveis
app.get('/api/products', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    console.log('📦 Iniciando busca de produtos disponíveis...');
    console.log('Token:', token.substring(0, 30) + '...');

    // Simular autenticação
    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();
    console.log(`✅ Autenticado como: ${user.nickname}`);

    // Retornar produtos disponíveis no portal de filiados
    console.log(`📊 Total de produtos disponíveis: ${produtosDisponiveis.length}`);

    res.json({
      user: user.nickname,
      total_products: produtosDisponiveis.length,
      products_fetched: produtosDisponiveis.length,
      products: produtosDisponiveis
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

// ROTA: Buscar melhor produto para um cupom
app.get('/api/best-product-for-coupon', async (req, res) => {
  const { token, marca } = req.query;

  if (!token || !marca) {
    return res.status(400).json({ error: 'Token ou marca não fornecidos' });
  }

  try {
    console.log(`🔍 Buscando melhor produto para cupom: ${marca}`);

    // Simular autenticação
    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();

    // Usar produtos disponíveis
    const validProducts = produtosDisponiveis;

    console.log(`📊 Total de produtos para análise: ${validProducts.length}`);

    // Selecionar o melhor produto
    const bestProduct = selectBestProduct(validProducts);

    console.log(`✅ Melhor produto selecionado: ${bestProduct ? bestProduct.title : 'Nenhum'}`);

    res.json({
      marca: marca,
      total_products_analyzed: validProducts.length,
      best_product: bestProduct
    });

  } catch (error) {
    console.error('❌ Erro ao buscar melhor produto:', error.message);
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