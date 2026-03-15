// ============================================
// IMPORTAÇÕES
// ============================================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./auth');
const MercadoLivreAPI = require('./mercadolivre');

// ============================================
// CONFIGURAÇÃO DO EXPRESS
// ============================================
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'seu_secret_key_aqui',
  resave: false,
  saveUninitialized: true
}));

// ============================================
// ROTAS
// ============================================

// Rota inicial
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Plataforma de Análise ML rodando!',
    endpoints: {
      login: '/auth/login',
      status: '/status',
      products: '/api/products?token=SEU_TOKEN'
    }
  });
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({ 
    status: 'online',
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// Usar rotas de autenticação
app.use('/auth', authRoutes);

// ============================================
// ROTA: Buscar produtos do usuário
// ============================================
app.get('/api/products', async (req, res) => {
  const { token } = req.query;

  // Verificar se token foi fornecido
  if (!token) {
    return res.status(401).json({ 
      error: 'Token não fornecido',
      message: 'Acesse /auth/login primeiro'
    });
  }

  try {
    console.log('📦 Iniciando busca de produtos...');

    // Criar instância da API do Mercado Livre
    const ml = new MercadoLivreAPI(token);

    // Obter dados do usuário
    const user = await ml.getMe();
    console.log(`✅ Autenticado como: ${user.nickname}`);

    // Obter listagens do usuário
    const listings = await ml.getMyListings(user.id);

    // Buscar detalhes de cada produto (máximo 20 para não demorar)
    console.log(`📍 Buscando detalhes de ${Math.min(listings.length, 20)} produtos...`);
    
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
          console.error(`Erro ao buscar produto ${listing.id}`);
          return null;
        }
      })
    );

    // Filtrar produtos com erro
    const validProducts = products.filter(p => p !== null);

    // Responder com dados
    res.json({
      user: user.nickname,
      total_products: listings.length,
      products_fetched: validProducts.length,
      products: validProducts
    });

  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar produtos',
      message: error.message
    });
  }
});

// ============================================
// ROTA: Dashboard (página de teste)
// ============================================
app.get('/dashboard', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token não fornecido');
  }

  // HTML simples para testar
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard - Plataforma ML</title>
      <style>
        body { font-family: Arial; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        button { padding: 10px 20px; background: #3498db; color: white; border: none; cursor: pointer; }
        #products { margin-top: 20px; }
        .product { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 Bem-vindo ao Dashboard!</h1>
        <p>Token: <code>${token.substring(0, 20)}...</code></p>
        <button onclick="loadProducts()">Carregar Produtos</button>
        <div id="products"></div>
      </div>

      <script>
        async function loadProducts() {
          const response = await fetch('/api/products?token=${token}');
          const data = await response.json();
          
          let html = '<h2>Seus Produtos:</h2>';
          data.products.forEach(p => {
            html += \`
              <div class="product">
                <strong>\${p.title}</strong><br>
                Preço: R$ \${p.price.toFixed(2)}<br>
                Vendidos: \${p.sold_quantity}<br>
                Disponíveis: \${p.available_quantity}
              </div>
            \`;
          });
          
          document.getElementById('products').innerHTML = html;
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 SERVIDOR RODANDO COM SUCESSO!     ║
╠════════════════════════════════════════╣
║  URL: http://localhost:${PORT}              ║
║  Login: http://localhost:${PORT}/auth/login ║
║  Status: http://localhost:${PORT}/status    ║
╚════════════════════════════════════════╝
  `);
});