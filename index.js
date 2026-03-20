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
    const ml = new MercadoLivreAPI(token);
    const user = await ml.getMe();
    const listings = await ml.getMyListings(user.id);
    
    const products = await Promise.all(
      listings.slice(0, 20).map(async (listing) => {
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

    res.json({
      user: user.nickname,
      total_products: listings.length,
      products_fetched: validProducts.length,
      products: validProducts
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos', message: error.message });
  }
});

// NOVA ROTA: Buscar produtos de um cupom e selecionar o melhor
app.get('/api/cupom-products', async (req, res) => {
  const { token, cupom_id, marca } = req.query;

  if (!token || !marca) {
    return res.status(400).json({ error: 'Token ou marca não fornecidos' });
  }

  try {
    const ml = new MercadoLivreAPI(token);
    
    // Buscar produtos da marca/cupom
    console.log(`🔍 Buscando produtos de: ${marca}`);
    
    // Simular busca de produtos (em produção, seria uma busca real na API)
    const mockProducts = [
      {
        id: 'MLB123',
        title: `Produto Premium de ${marca}`,
        price: 299.90,
        sold_quantity: 1250,
        available_quantity: 45,
        rating: 4.8
      },
      {
        id: 'MLB124',
        title: `Produto Padrão de ${marca}`,
        price: 149.90,
        sold_quantity: 850,
        available_quantity: 120,
        rating: 4.5
      },
      {
        id: 'MLB125',
        title: `Produto Econômico de ${marca}`,
        price: 79.90,
        sold_quantity: 2100,
        available_quantity: 300,
        rating: 4.3
      }
    ];

    // Selecionar o melhor produto
    const bestProduct = selectBestProduct(mockProducts);

    res.json({
      marca: marca,
      total_products: mockProducts.length,
      best_product: bestProduct,
      all_products: mockProducts
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produtos do cupom', message: error.message });
  }
});

// Função: Selecionar o melhor produto baseado em critérios
function selectBestProduct(products) {
  if (!products || products.length === 0) return null;

  // Calcular score para cada produto
  const scoredProducts = products.map(product => {
    let score = 0;

    // Rating (0-30 pontos)
    score += (product.rating / 5) * 30;

    // Quantidade vendida (0-30 pontos)
    const maxSold = Math.max(...products.map(p => p.sold_quantity));
    score += (product.sold_quantity / maxSold) * 30;

    // Disponibilidade (0-20 pontos)
    if (product.available_quantity > 0) {
      score += 20;
    }

    // Preço (0-20 pontos) - produtos mais baratos ganham mais pontos
    const minPrice = Math.min(...products.map(p => p.price));
    score += ((minPrice / product.price) * 20);

    return {
      ...product,
      score: Math.round(score * 100) / 100
    };
  });

  // Ordenar por score e retornar o melhor
  return scoredProducts.sort((a, b) => b.score - a.score)[0];
}

app.get('/dashboard', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token não fornecido');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #3498db; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #ddd; }
        .tab-button { padding: 10px 20px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 14px; font-weight: 600; color: #666; }
        .tab-button.active { color: #3498db; border-bottom-color: #3498db; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .product-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .product-price { font-size: 18px; font-weight: bold; color: #27ae60; }
        .coupon-card { background: white; border-left: 4px solid #f39c12; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .coupon-discount { font-size: 24px; font-weight: bold; color: #e74c3c; }
        .coupon-action { background: #3498db; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 5px; }
        .coupon-action:hover { background: #2980b9; }
        .best-product { background: #e6ffe6; border: 2px solid #27ae60; padding: 15px; border-radius: 5px; margin-top: 10px; }
        .best-product h4 { color: #27ae60; margin-bottom: 10px; }
        .score-badge { background: #27ae60; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        button { padding: 10px 20px; background: #27ae60; color: white; border: none; cursor: pointer; border-radius: 5px; }
        button:hover { background: #229954; }
        .error { background: #ffe6e6; color: #c0392b; padding: 15px; border-radius: 5px; }
        .loading { text-align: center; padding: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>Dashboard</h1>
            <p id="user-info">Carregando...</p>
          </div>
          <button onclick="logout()" style="background: #e74c3c;">Sair</button>
        </div>

        <div class="tabs">
          <button class="tab-button active" onclick="switchTab('produtos')">Produtos</button>
          <button class="tab-button" onclick="switchTab('cupons')">Cupons</button>
          <button class="tab-button" onclick="switchTab('metricas')">Métricas</button>
          <button class="tab-button" onclick="switchTab('ganhos')">Ganhos</button>
        </div>

        <div id="produtos" class="tab-content active">
          <div class="card">
            <h2>Seus Produtos</h2>
            <div id="produtos-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="cupons" class="tab-content">
          <div class="card">
            <h2>Cupons com Melhor Produto</h2>
            <div id="cupons-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="metricas" class="tab-content">
          <div class="card">
            <h2>Métricas</h2>
            <div id="metricas-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="ganhos" class="tab-content">
          <div class="card">
            <h2>Ganhos</h2>
            <div id="ganhos-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>
      </div>

      <script>
        const token = '${token}';

        function switchTab(name) {
          document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
          document.getElementById(name).classList.add('active');
          event.target.classList.add('active');
          loadTab(name);
        }

        async function loadTab(name) {
          if (name === 'produtos') loadProdutos();
          else if (name === 'cupons') loadCupons();
          else if (name === 'metricas') loadMetricas();
          else if (name === 'ganhos') loadGanhos();
        }

        async function loadProdutos() {
          const content = document.getElementById('produtos-content');
          try {
            const response = await fetch('/api/products?token=' + token);
            const data = await response.json();
            
            if (data.error) {
              content.innerHTML = '<div class="error">Erro: ' + data.error + '</div>';
              return;
            }
            
            if (!data.products || data.products.length === 0) {
              content.innerHTML = '<p>Nenhum produto encontrado</p>';
              return;
            }
            
            let html = '<div class="grid">';
            data.products.forEach(p => {
              html += '<div class="product-card"><h3>' + p.title + '</h3><div class="product-price">R$ ' + p.price.toFixed(2) + '</div><p>Vendidos: ' + p.sold_quantity + '</p><p>Disponíveis: ' + p.available_quantity + '</p></div>';
            });
            html += '</div>';
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = '<div class="error">Erro: ' + error.message + '</div>';
          }
        }

        async function loadCupons() {
          const content = document.getElementById('cupons-content');
          
          const cupons = [
            { id: 1, desconto: 'R$ 80 OFF', marca: 'Darklab', vencimento: '1 de abril', budget: 'R$ 864.320,96' },
            { id: 2, desconto: 'R$ 40 OFF', marca: 'Vog Oficial', vencimento: '17 de março', budget: 'R$ 967.660' },
            { id: 3, desconto: '10% OFF', marca: 'Sandrini', vencimento: '8 de abril', budget: 'R$ 60.612,82' },
            { id: 4, desconto: '15% OFF', marca: 'Crocs', vencimento: '1 de abril', budget: 'R$ 1.066.600' }
          ];
          
          let html = '';
          cupons.forEach(c => {
            html += '<div class="coupon-card"><div class="coupon-discount">' + c.desconto + '</div><h3>' + c.marca + '</h3><p>Vence em: ' + c.vencimento + '</p><p>Orçamento: ' + c.budget + '</p><button class="coupon-action" onclick="buscarMelhorProduto(\'' + c.marca + '\', ' + c.id + ')">Ver Melhor Produto</button><div id="resultado-' + c.id + '"></div></div>';
          });
          
          content.innerHTML = html;
        }

        async function buscarMelhorProduto(marca, cupomId) {
          const resultDiv = document.getElementById('resultado-' + cupomId);
          resultDiv.innerHTML = '<p style="text-align: center;">Buscando melhor produto...</p>';
          
          try {
            const response = await fetch('/api/cupom-products?token=' + token + '&marca=' + encodeURIComponent(marca) + '&cupom_id=' + cupomId);
            const data = await response.json();
            
            if (data.error) {
              resultDiv.innerHTML = '<div class="error">Erro: ' + data.error + '</div>';
              return;
            }
            
            const best = data.best_product;
            let html = '<div class="best-product"><h4>✅ Melhor Produto Selecionado</h4>';
            html += '<p><strong>' + best.title + '</strong></p>';
            html += '<p>Preço: <strong>R$ ' + best.price.toFixed(2) + '</strong></p>';
            html += '<p>Vendidos: ' + best.sold_quantity + ' | Disponíveis: ' + best.available_quantity + '</p>';
            html += '<p>Rating: ⭐ ' + best.rating + '</p>';
            html += '<p>Score de Viabilidade: <span class="score-badge">' + best.score + '/100</span></p>';
            html += '</div>';
            
            resultDiv.innerHTML = html;
          } catch (error) {
            resultDiv.innerHTML = '<div class="error">Erro: ' + error.message + '</div>';
          }
        }

        async function loadMetricas() {
          const content = document.getElementById('metricas-content');
          content.innerHTML = '<p>Cliques: 1250 | Pedidos: 87 | Taxa: 6.96%</p>';
        }

        async function loadGanhos() {
          const content = document.getElementById('ganhos-content');
          content.innerHTML = '<p>Total: R$ 21.345,50 | Mês: R$ 3.450,00 | Semana: R$ 890,50</p>';
        }

        function logout() {
          window.location.href = '/auth/login';
        }

        window.addEventListener('load', loadProdutos);
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});