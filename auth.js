const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// ============================================
// ROTA 1: Iniciar login
// ============================================
router.get('/login', (req, res) => {
  try {
    // Construir URL de autenticação CORRIGIDA
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${process.env.ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.ML_REDIRECT_URI)}`;
    
    console.log('🔐 Redirecionando para login do Mercado Livre...');
    console.log('URL:', authUrl);
    
    // Redirecionar o usuário para o Mercado Livre
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Erro ao redirecionar:', error.message);
    res.status(500).json({ error: 'Erro ao iniciar login' });
  }
});

// ============================================
// ROTA 2: Callback (Mercado Livre retorna aqui)
// ============================================
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  // Verificar se houve erro
  if (error) {
    console.error('❌ Erro de autenticação:', error);
    return res.status(400).send(`Erro: ${error}`);
  }

  // Verificar se recebeu o código
  if (!code) {
    console.error('❌ Código de autorização não recebido');
    return res.status(400).send('Código de autorização não recebido');
  }

  try {
    console.log('🔐 Trocando código por token...');
    console.log('Código recebido:', code.substring(0, 20) + '...');

    // Fazer requisição para trocar código por token
    const response = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ML_REDIRECT_URI
      }
    );

    // Extrair dados da resposta
    const { access_token, refresh_token, expires_in } = response.data;

    console.log('✅ Token obtido com sucesso!');
    console.log(`⏰ Expira em: ${expires_in} segundos (${Math.round(expires_in / 3600)} horas)`);

    // Armazenar token em sessão
    req.session = req.session || {};
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;

    // Redirecionar para dashboard com token na URL
    res.redirect(`/dashboard?token=${access_token}`);

  } catch (error) {
    console.error('❌ Erro ao trocar código por token:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    console.error('Mensagem:', error.message);
    
    res.status(500).send(`
      <h1>❌ Erro na Autenticação</h1>
      <p>Erro: ${error.response?.data?.message || error.message}</p>
      <p><a href="/auth/login">Tentar novamente</a></p>
    `);
  }
});

// ============================================
// ROTA 3: Logout
// ============================================
router.get('/logout', (req, res) => {
  console.log('🚪 Usuário desconectado');
  req.session = null;
  res.redirect('/');
});

module.exports = router;