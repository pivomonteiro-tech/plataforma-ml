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
        .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .product-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .product-price { font-size: 18px; font-weight: bold; color: #27ae60; }
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
            <h2>Cupons</h2>
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
            { desconto: 'R$ 80 OFF', marca: 'Darklab', vencimento: '1 de abril' },
            { desconto: 'R$ 40 OFF', marca: 'Vog Oficial', vencimento: '17 de março' },
            { desconto: '10% OFF', marca: 'Sandrini', vencimento: '8 de abril' },
            { desconto: '15% OFF', marca: 'Crocs', vencimento: '1 de abril' }
          ];
          let html = '';
          cupons.forEach(c => {
            html += '<div style="border-left: 4px solid #f39c12; padding: 15px; margin-bottom: 10px;"><strong>' + c.desconto + '</strong> - ' + c.marca + ' (Vence: ' + c.vencimento + ')</div>';
          });
          content.innerHTML = html;
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