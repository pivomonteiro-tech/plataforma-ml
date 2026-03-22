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

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - Plataforma ML</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          color: #333;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }

        .header p {
          font-size: 14px;
          opacity: 0.9;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-logout {
          background: #e74c3c;
          color: white;
        }

        .btn-logout:hover {
          background: #c0392b;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #ddd;
          flex-wrap: wrap;
        }

        .tab-button {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: #666;
          transition: all 0.3s ease;
        }

        .tab-button:hover {
          color: #3498db;
        }

        .tab-button.active {
          color: #3498db;
          border-bottom-color: #3498db;
        }

        .tab-content {
          display: none;
          animation: fadeIn 0.3s ease;
        }

        .tab-content.active {
          display: block;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card h2 {
          font-size: 20px;
          margin-bottom: 15px;
          color: #2c3e50;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .product-card {
          background: white;
          border: 1px solid #ecf0f1;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .product-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transform: translateY(-4px);
        }

        .product-card h3 {
          font-size: 16px;
          margin-bottom: 10px;
          color: #2c3e50;
          line-height: 1.4;
        }

        .product-price {
          font-size: 18px;
          font-weight: bold;
          color: #27ae60;
          margin-bottom: 10px;
        }

        .product-stats {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #999;
          padding-top: 10px;
          border-top: 1px solid #ecf0f1;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .error {
          background: #ffe6e6;
          border: 1px solid #ffcccc;
          color: #c0392b;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>Dashboard</h1>
            <p id="user-info">Carregando informações do usuário...</p>
          </div>
          <div class="header-actions">
            <button class="btn-logout" onclick="logout()">Sair</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab-button active" onclick="switchTab('produtos')">Produtos</button>
          <button class="tab-button" onclick="switchTab('cupons')">Cupons</button>
          <button class="tab-button" onclick="switchTab('metricas')">Métricas</button>
          <button class="tab-button" onclick="switchTab('ganhos')">Ganhos</button>
        </div>

        <div id="produtos" class="tab-content active">
          <div class="card">
            <h2>Seus Produtos (10 páginas)</h2>
            <div id="produtos-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="cupons" class="tab-content">
          <div class="card">
            <h2>Cupons Disponíveis (20 páginas)</h2>
            <div id="cupons-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="metricas" class="tab-content">
          <div class="card">
            <h2>Suas Métricas</h2>
            <div id="metricas-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>

        <div id="ganhos" class="tab-content">
          <div class="card">
            <h2>Estimativa de Ganhos</h2>
            <div id="ganhos-content" class="loading"><p>Carregando...</p></div>
          </div>
        </div>
      </div>

      <script>
        const token = '${token}';

        function switchTab(tabName) {
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          document.getElementById(tabName).classList.add('active');
          event.target.classList.add('active');
          
          loadTabData(tabName);
        }

        async function loadTabData(tabName) {
          try {
            if (tabName === 'produtos') {
              await loadProdutos();
            } else if (tabName === 'cupons') {
              await loadCupons();
            } else if (tabName === 'metricas') {
              await loadMetricas();
            } else if (tabName === 'ganhos') {
              await loadGanhos();
            }
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
          }
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
              content.innerHTML = '<div class="empty-state"><p>Nenhum produto encontrado</p></div>';
              return;
            }
            
            let html = '<div class="grid">';
            data.products.forEach(product => {
              html += '<div class="product-card"><h3>' + product.title + '</h3><div class="product-price">R$ ' + product.price.toFixed(2) + '</div><div class="product-stats"><span>Vendidos: ' + product.sold_quantity + '</span><span>Disponíveis: ' + product.available_quantity + '</span></div></div>';
            });
            html += '</div>';
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = '<div class="error">Erro ao carregar produtos: ' + error.message + '</div>';
          }
        }

        async function loadCupons() {
          const content = document.getElementById('cupons-content');
          
          try {
            const response = await fetch('/api/coupons?token=' + token);
            const data = await response.json();
            
            if (data.error) {
              content.innerHTML = '<div class="error">Erro: ' + data.error + '</div>';
              return;
            }
            
            if (!data.coupons || data.coupons.length === 0) {
              content.innerHTML = '<div class="empty-state"><p>Nenhum cupom encontrado</p></div>';
              return;
            }
            
            let html = '';
            data.coupons.forEach(c => {
              html += '<div style="border-left: 4px solid #f39c12; padding: 15px; margin-bottom: 10px;"><strong>' + c.desconto + '</strong> - ' + c.marca + ' (Vence: ' + c.vencimento + ')</div>';
            });
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = '<div class="error">Erro ao carregar cupons: ' + error.message + '</div>';
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

        window.addEventListener('load', async () => {
          try {
            const response = await fetch('/api/products?token=' + token);
            const data = await response.json();
            
            if (data.user) {
              document.getElementById('user-info').textContent = 'Bem-vindo, ' + data.user + '! 👋';
            }
            
            await loadProdutos();
          } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
          }
        });
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