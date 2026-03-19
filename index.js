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
// ROTA: Dashboard Completo com Múltiplas Abas
// ============================================
app.get('/dashboard', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token não fornecido');
  }

  res.send(`
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #f5f5f5;
          color: #333;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Header */
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

        .btn-primary {
          background: #27ae60;
          color: white;
        }

        .btn-primary:hover {
          background: #229954;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .btn-logout {
          background: #e74c3c;
          color: white;
        }

        .btn-logout:hover {
          background: #c0392b;
        }

        /* Tabs */
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

        /* Tab Content */
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

        /* Cards */
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

        /* Grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Product Card */
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

        .product-info {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
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

        /* Coupon Card */
        .coupon-card {
          background: white;
          border-left: 4px solid #f39c12;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .coupon-info h3 {
          font-size: 16px;
          margin-bottom: 5px;
          color: #2c3e50;
        }

        .coupon-discount {
          font-size: 24px;
          font-weight: bold;
          color: #e74c3c;
          margin-bottom: 5px;
        }

        .coupon-expiry {
          font-size: 12px;
          color: #999;
        }

        .coupon-action {
          background: #3498db;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
        }

        .coupon-action:hover {
          background: #2980b9;
        }

        /* Metrics */
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .metric-box {
          background: white;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metric-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }

        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #3498db;
        }

        /* Loading */
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Error */
        .error {
          background: #ffe6e6;
          border: 1px solid #ffcccc;
          color: #c0392b;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        /* Success */
        .success {
          background: #e6ffe6;
          border: 1px solid #ccffcc;
          color: #27ae60;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .empty-state svg {
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
          opacity: 0.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div>
            <h1>🎉 Dashboard de Afiliado</h1>
            <p id="user-info">Carregando informações do usuário...</p>
          </div>
          <div class="header-actions">
            <button class="btn-primary" onclick="refreshData()">🔄 Atualizar</button>
            <button class="btn-logout" onclick="logout()">Sair</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-button active" onclick="switchTab('produtos')">📦 Produtos</button>
          <button class="tab-button" onclick="switchTab('cupons')">🎟️ Cupons</button>
          <button class="tab-button" onclick="switchTab('metricas')">📊 Métricas</button>
          <button class="tab-button" onclick="switchTab('ganhos')">💰 Ganhos</button>
        </div>

        <!-- Tab: Produtos -->
        <div id="produtos" class="tab-content active">
          <div class="card">
            <h2>Seus Produtos</h2>
            <div id="produtos-content" class="loading">
              <div class="spinner"></div>
              <p>Carregando produtos...</p>
            </div>
          </div>
        </div>

        <!-- Tab: Cupons -->
        <div id="cupons" class="tab-content">
          <div class="card">
            <h2>Cupons Disponíveis</h2>
            <div id="cupons-content" class="loading">
              <div class="spinner"></div>
              <p>Carregando cupons...</p>
            </div>
          </div>
        </div>

        <!-- Tab: Métricas -->
        <div id="metricas" class="tab-content">
          <div class="card">
            <h2>Suas Métricas</h2>
            <div id="metricas-content" class="loading">
              <div class="spinner"></div>
              <p>Carregando métricas...</p>
            </div>
          </div>
        </div>

        <!-- Tab: Ganhos -->
        <div id="ganhos" class="tab-content">
          <div class="card">
            <h2>Estimativa de Ganhos</h2>
            <div id="ganhos-content" class="loading">
              <div class="spinner"></div>
              <p>Carregando ganhos...</p>
            </div>
          </div>
        </div>
      </div>

      <script>
        const token = '${token}';
        let userData = null;

        // Função: Trocar de aba
        function switchTab(tabName) {
          // Esconder todas as abas
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Remover classe active de todos os botões
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Mostrar aba selecionada
          document.getElementById(tabName).classList.add('active');
          
          // Adicionar classe active ao botão clicado
          event.target.classList.add('active');
          
          // Carregar dados da aba
          loadTabData(tabName);
        }

        // Função: Carregar dados da aba
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

        // Função: Carregar Produtos
        async function loadProdutos() {
          const content = document.getElementById('produtos-content');
          
          try {
            const response = await fetch(\`/api/products?token=\${token}\`);
            const data = await response.json();
            
            if (data.error) {
              content.innerHTML = \`<div class="error">❌ Erro: \${data.error}</div>\`;
              return;
            }
            
            if (!data.products || data.products.length === 0) {
              content.innerHTML = '<div class="empty-state"><p>Nenhum produto encontrado</p></div>';
              return;
            }
            
            let html = '<div class="grid">';
            data.products.forEach(product => {
              html += \`
                <div class="product-card">
                  <h3>\${product.title}</h3>
                  <div class="product-price">R$ \${product.price.toFixed(2)}</div>
                  <div class="product-info">
                    <strong>Categoria:</strong> \${product.category_id || 'N/A'}
                  </div>
                  <div class="product-stats">
                    <span>📊 Vendidos: \${product.sold_quantity}</span>
                    <span>📦 Disponíveis: \${product.available_quantity}</span>
                  </div>
                  <div class="product-stats">
                    <span>⭐ Rating: \${product.rating || 'N/A'}</span>
                  </div>
                </div>
              \`;
            });
            html += '</div>';
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = \`<div class="error">❌ Erro ao carregar produtos: \${error.message}</div>\`;
          }
        }

        // Função: Carregar Cupons (Mock - API do ML não fornece cupons para afiliados)
        async function loadCupons() {
          const content = document.getElementById('cupons-content');
          
          try {
            // Dados de exemplo (em produção, viria da API)
            const cupons = [
              {
                id: 1,
                desconto: 'R$ 80 OFF',
                marca: 'Darklab',
                vencimento: '1 de abril',
                budget: 'R$ 864.320,96'
              },
              {
                id: 2,
                desconto: 'R$ 40 OFF',
                marca: 'Vog Oficial',
                vencimento: '17 de março',
                budget: 'R$ 967.660'
              },
              {
                id: 3,
                desconto: '10% OFF',
                marca: 'Sandrini Menswear',
                vencimento: '8 de abril',
                budget: 'R$ 60.612,82'
              },
              {
                id: 4,
                desconto: '15% OFF',
                marca: 'Crocs Brasil',
                vencimento: '1 de abril',
                budget: 'R$ 1.066.600'
              }
            ];
            
            let html = '';
            cupons.forEach(cupom => {
              html += \`
                <div class="coupon-card">
                  <div class="coupon-info">
                    <div class="coupon-discount">\${cupom.desconto}</div>
                    <h3>\${cupom.marca}</h3>
                    <div class="coupon-expiry">Vence em: \${cupom.vencimento}</div>
                    <div class="coupon-expiry">Orçamento: \${cupom.budget}</div>
                  </div>
                  <button class="coupon-action" onclick="gerarCodigo(\${cupom.id})">Gerar Código</button>
                </div>
              \`;
            });
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = \`<div class="error">❌ Erro ao carregar cupons: \${error.message}</div>\`;
          }
        }

        // Função: Carregar Métricas
        async function loadMetricas() {
          const content = document.getElementById('metricas-content');
          
          try {
            // Dados de exemplo (em produção, viria da API)
            const metricas = {
              cliques: 1250,
              pedidos: 87,
              taxa_conversao: '6.96%',
              ticket_medio: 'R$ 245,50'
            };
            
            let html = \`
              <div class="metrics">
                <div class="metric-box">
                  <div class="metric-label">Cliques</div>
                  <div class="metric-value">\${metricas.cliques.toLocaleString('pt-BR')}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Pedidos</div>
                  <div class="metric-value">\${metricas.pedidos}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Taxa de Conversão</div>
                  <div class="metric-value">\${metricas.taxa_conversao}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Ticket Médio</div>
                  <div class="metric-value">\${metricas.ticket_medio}</div>
                </div>
              </div>
            \`;
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = \`<div class="error">❌ Erro ao carregar métricas: \${error.message}</div>\`;
          }
        }

        // Função: Carregar Ganhos
        async function loadGanhos() {
          const content = document.getElementById('ganhos-content');
          
          try {
            // Dados de exemplo (em produção, viria da API)
            const ganhos = {
              total_estimado: 'R$ 21.345,50',
              mes_atual: 'R$ 3.450,00',
              semana_atual: 'R$ 890,50',
              comissao_media: '5%'
            };
            
            let html = \`
              <div class="metrics">
                <div class="metric-box">
                  <div class="metric-label">Total Estimado</div>
                  <div class="metric-value" style="color: #27ae60;">\${ganhos.total_estimado}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Mês Atual</div>
                  <div class="metric-value" style="color: #27ae60;">\${ganhos.mes_atual}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Semana Atual</div>
                  <div class="metric-value" style="color: #27ae60;">\${ganhos.semana_atual}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Comissão Média</div>
                  <div class="metric-value">\${ganhos.comissao_media}</div>
                </div>
              </div>
            \`;
            
            content.innerHTML = html;
          } catch (error) {
            content.innerHTML = \`<div class="error">❌ Erro ao carregar ganhos: \${error.message}</div>\`;
          }
        }

        // Função: Gerar Código de Cupom
        function gerarCodigo(cupomId) {
          alert('Código gerado para o cupom ' + cupomId + '!');
          // Em produção, fazer requisição para gerar código
        }

        // Função: Atualizar Dados
        function refreshData() {
          loadTabData('produtos');
          alert('Dados atualizados!');
        }

        // Função: Logout
        function logout() {
          // Limpar cookies
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          
          // Redirecionar para login
          window.location.href = '/auth/login';
        }

        // Carregar dados iniciais
        window.addEventListener('load', async () => {
          try {
            // Carregar informações do usuário
            const response = await fetch(\`/api/products?token=\${token}\`);
            const data = await response.json();
            
            if (data.user) {
              document.getElementById('user-info').textContent = \`Bem-vindo, \${data.user}! 👋\`;
            }
            
            // Carregar produtos
            await loadProdutos();
          } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
          }
        });
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