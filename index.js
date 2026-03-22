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

// ROTA: Produtos reais via scraping (sem API bloqueada)
app.get('/api/products', async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    console.log('📦 Buscando produtos reais via scraping...');

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();
    console.log(`✅ Usuário: ${user.nickname}`);

    const categories = await ml.getCategories();
    console.log(`📂 Categorias para scraping: ${categories.length}`);

    const allProducts = [];
    const limitPorCat = 10;

    for (let cat of categories) {
      try {
        const response = await ml.searchPublicProducts('', cat.id, 0, limitPorCat);
        
        if (response.results && response.results.length > 0) {
          allProducts.push(...response.results);
          console.log(`✅ ${cat.id}: ${response.results.length} produtos reais (scraping)`);
        }
      } catch (error) {
        console.error(`❌ Categoria ${cat.id}:`, error.message);
      }
    }

    console.log(`📊 Total: ${allProducts.length} produtos reais do site`);

    if (allProducts.length === 0) {
      return res.json({
        user: user.nickname,
        total_products: 0,
        products: [],
        message: 'Nenhum produto encontrado (tente novamente)'
      });
    }

    res.json({
      user: user.nickname,
      total_products: allProducts.length,
      products_fetched: allProducts.length,
      products: allProducts.slice(0, 50),
      fonte_dados: 'Scraping Site ML (dados reais)'
    });

  } catch (error) {
    console.error('❌ Erro geral produtos:', error.message);
    res.status(500).json({ error: 'Erro ao buscar produtos', message: error.message });
  }
});

// ROTA: Buscar cupons
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

// ROTA: Melhor produto (busca pública sem token)
app.get('/api/best-product-for-coupon', async (req, res) => {
  const { token, marca } = req.query;

  if (!token || !marca) return res.status(400).json({ error: 'Token ou marca não fornecidos' });

  try {
    console.log(`🔍 Melhor produto para: ${marca} (busca pública sem token)`);

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();

    // Busca pública por marca (sem token)
    const response = await ml.searchPublicProducts(marca, '', 0, 20);
    
    if (!response.results || response.results.length === 0) {
      return res.json({
        marca,
        total_products_analyzed: 0,
        best_product: null,
        message: 'Nenhum produto para esta marca'
      });
    }

    const products = response.results.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      sold_quantity: p.sold_quantity || 0,
      available_quantity: p.available_quantity || 0,
      category_id: p.category_id,
      rating: p.rating || 0
    }));

    const bestProduct = selectBestProduct(products);  // Sua função

    res.json({
      marca,
      total_products_analyzed: products.length,
      best_product
    });

  } catch (error) {
    console.error('❌ Erro melhor produto:', error.message);
    res.status(500).json({ error: 'Erro ao buscar melhor produto', message: error.message });
  }
});

// ROTA: Relatório completo com produtos REAIS
app.get('/api/relatorio-completo', async (req, res) => {
  const { token, ordenar_por = 'score', filtro_desconto = 0 } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    console.log('📊 Gerando relatório completo com produtos REAIS...');

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();

    // Gerar cupons
    const allCoupons = [];
    const PAGES_TO_FETCH = 20;
    const COUPONS_PER_PAGE = 15;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      const coupons = generateMockCoupons(page, COUPONS_PER_PAGE);
      if (!coupons || coupons.length === 0) break;
      allCoupons.push(...coupons);
    }

    console.log(`📊 Total de cupons: ${allCoupons.length}`);

    // Buscar SEUS PRÓPRIOS produtos REAIS
    const allListings = [];
    const PAGES_TO_FETCH_PRODUCTS = 10;
    const ITEMS_PER_PAGE = 50;

    for (let page = 0; page < PAGES_TO_FETCH_PRODUCTS; page++) {
      try {
        const listings = await ml.getMyListings(user.id, page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
        if (!listings || listings.length === 0) break;
        allListings.push(...listings);
      } catch (error) {
        console.error(`Erro ao buscar página ${page + 1}:`, error.message);
        break;
      }
    }

    console.log(`📊 Total de seus produtos: ${allListings.length}`);

    if (allListings.length === 0) {
      return res.json({
        usuario: user.nickname,
        total_cupons: allCoupons.length,
        total_produtos: 0,
        cupons_filtrados: 0,
        relatorio: [],
        message: 'Você não tem produtos listados no Mercado Livre.'
      });
    }

    // Buscar detalhes dos produtos
    const products = await Promise.all(
      allListings.map(async (listing) => {
        try {
          const details = await ml.getItemDetails(listing.id);
          return {
            id: details.id,
            title: details.title,
            price: details.price,
            sold_quantity: details.sold_quantity || 0,
            available_quantity: details.available_quantity || 0,
            category_id: details.category_id,
            rating: details.rating || 0
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validProducts = products.filter(p => p !== null);

    console.log(`📊 Total de produtos válidos: ${validProducts.length}`);

    // Processar cada cupom e encontrar melhor produto
    const relatorio = allCoupons.map(cupom => {
      const bestProduct = selectBestProduct(validProducts);
      
      if (!bestProduct) {
        return null;
      }

      // Calcular potencial de ganho
      const descontoNumerico = parseInt(cupom.desconto.replace(/\D/g, ''));
      const potencialGanho = (bestProduct.price * descontoNumerico / 100) * bestProduct.sold_quantity;

      return {
        cupom_id: cupom.id,
        marca: cupom.marca,
        desconto: cupom.desconto,
        desconto_numerico: descontoNumerico,
        vencimento: cupom.vencimento,
        orcamento: parseFloat(cupom.budget.replace(/[^\d,]/g, '').replace(',', '.')),
        produto_id: bestProduct.id,
        produto_nome: bestProduct.title,
        produto_preco: bestProduct.price,
        produto_vendidos: bestProduct.sold_quantity,
        produto_disponivel: bestProduct.available_quantity,
        produto_rating: bestProduct.rating,
        score_viabilidade: bestProduct.score,
        potencial_ganho: Math.round(potencialGanho * 100) / 100
      };
    }).filter(item => item !== null);

    // Aplicar filtros
    let relatorioFiltrado = relatorio.filter(item => item.desconto_numerico >= filtro_desconto);

    // Aplicar ordenação
    if (ordenar_por === 'score') {
      relatorioFiltrado.sort((a, b) => b.score_viabilidade - a.score_viabilidade);
    } else if (ordenar_por === 'ganho') {
      relatorioFiltrado.sort((a, b) => b.potencial_ganho - a.potencial_ganho);
    } else if (ordenar_por === 'desconto') {
      relatorioFiltrado.sort((a, b) => b.desconto_numerico - a.desconto_numerico);
    } else if (ordenar_por === 'vendidos') {
      relatorioFiltrado.sort((a, b) => b.produto_vendidos - a.produto_vendidos);
    }

    console.log(`✅ Relatório gerado com ${relatorioFiltrado.length} itens`);

    res.json({
      usuario: user.nickname,
      total_cupons: allCoupons.length,
      total_produtos: validProducts.length,
      cupons_filtrados: relatorioFiltrado.length,
      relatorio: relatorioFiltrado
    });

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    res.status(500).json({ error: 'Erro ao gerar relatório', message: error.message });
  }
});

// ROTA: Exportar relatório em CSV (com produtos REAIS)
app.get('/api/relatorio-csv', async (req, res) => {
  const { token, ordenar_por = 'score', filtro_desconto = 0 } = req.query;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    console.log('📥 Exportando relatório em CSV...');

    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();

    // Gerar cupons
    const allCoupons = [];
    const PAGES_TO_FETCH = 20;
    const COUPONS_PER_PAGE = 15;

    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      const coupons = generateMockCoupons(page, COUPONS_PER_PAGE);
      if (!coupons || coupons.length === 0) break;
      allCoupons.push(...coupons);
    }

    // Buscar SEUS PRÓPRIOS produtos REAIS
    const allListings = [];
    const PAGES_TO_FETCH_PRODUCTS = 10;
    const ITEMS_PER_PAGE = 50;

    for (let page = 0; page < PAGES_TO_FETCH_PRODUCTS; page++) {
      try {
        const listings = await ml.getMyListings(user.id, page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
        if (!listings || listings.length === 0) break;
        allListings.push(...listings);
      } catch (error) {
        console.error(`Erro ao buscar página ${page + 1}:`, error.message);
        break;
      }
    }

    if (allListings.length === 0) {
      return res.status(400).json({ error: 'Você não tem produtos listados no Mercado Livre.' });
    }

    // Buscar detalhes dos produtos
    const products = await Promise.all(
      allListings.map(async (listing) => {
        try {
          const details = await ml.getItemDetails(listing.id);
          return {
            id: details.id,
            title: details.title,
            price: details.price,
            sold_quantity: details.sold_quantity || 0,
            available_quantity: details.available_quantity || 0,
            category_id: details.category_id,
            rating: details.rating || 0
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validProducts = products.filter(p => p !== null);

    // Processar cada cupom
    const relatorio = allCoupons.map(cupom => {
      const bestProduct = selectBestProduct(validProducts);
      
      if (!bestProduct) {
        return null;
      }

      const descontoNumerico = parseInt(cupom.desconto.replace(/\D/g, ''));
      const potencialGanho = (bestProduct.price * descontoNumerico / 100) * bestProduct.sold_quantity;

      return {
        cupom_id: cupom.id,
        marca: cupom.marca,
        desconto: cupom.desconto,
        desconto_numerico: descontoNumerico,
        vencimento: cupom.vencimento,
        orcamento: parseFloat(cupom.budget.replace(/[^\d,]/g, '').replace(',', '.')),
        produto_id: bestProduct.id,
        produto_nome: bestProduct.title,
        produto_preco: bestProduct.price,
        produto_vendidos: bestProduct.sold_quantity,
        produto_disponivel: bestProduct.available_quantity,
        produto_rating: bestProduct.rating,
        score_viabilidade: bestProduct.score,
        potencial_ganho: Math.round(potencialGanho * 100) / 100
      };
    }).filter(item => item !== null);

    // Aplicar filtros e ordenação
    let relatorioFiltrado = relatorio.filter(item => item.desconto_numerico >= filtro_desconto);

    if (ordenar_por === 'score') {
      relatorioFiltrado.sort((a, b) => b.score_viabilidade - a.score_viabilidade);
    } else if (ordenar_por === 'ganho') {
      relatorioFiltrado.sort((a, b) => b.potencial_ganho - a.potencial_ganho);
    } else if (ordenar_por === 'desconto') {
      relatorioFiltrado.sort((a, b) => b.desconto_numerico - a.desconto_numerico);
    } else if (ordenar_por === 'vendidos') {
      relatorioFiltrado.sort((a, b) => b.produto_vendidos - a.produto_vendidos);
    }

    // Gerar CSV
    const headers = ['ID Cupom', 'Marca', 'Desconto', 'Vencimento', 'Orçamento', 'Produto', 'Preço', 'Vendidos', 'Rating', 'Score', 'Potencial Ganho'];
    const rows = relatorioFiltrado.map(item => [
      item.cupom_id,
      item.marca,
      item.desconto,
      item.vencimento,
      'R$ ' + item.orcamento.toFixed(2),
      item.produto_nome,
      'R$ ' + item.produto_preco.toFixed(2),
      item.produto_vendidos,
      item.produto_rating,
      item.score_viabilidade,
      'R$ ' + item.potencial_ganho.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-cupons.csv"');
    res.send(csv);

  } catch (error) {
    console.error('❌ Erro ao exportar CSV:', error.message);
    res.status(500).json({ error: 'Erro ao exportar CSV', message: error.message });
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