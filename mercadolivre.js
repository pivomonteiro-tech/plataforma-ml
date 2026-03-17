const axios = require('axios');

// Criar uma classe para organizar as funções
class MercadoLivreAPI {
  // Construtor: recebe o token de acesso
  constructor(accessToken) {
    // Criar um cliente HTTP com configurações padrão
    this.client = axios.create({
      baseURL: 'https://api.mercadolivre.com',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }

  // Função 1: Obter dados do usuário autenticado
  async getMe() {
    try {
      console.log('📍 Buscando dados do usuário...');
      const response = await this.client.get('/users/me');
      console.log('✅ Usuário encontrado:', response.data.nickname);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter usuário:', error.message);
      throw error;
    }
  }

  // Função 2: Obter seus produtos listados
  async getMyListings(userId) {
    try {
      console.log(`📍 Buscando produtos do usuário ${userId}...`);
      const response = await this.client.get(`/users/${userId}/listings`);
      console.log(`✅ ${response.data.length} produtos encontrados`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao obter listagens:', error.message);
      throw error;
    }
  }

  // Função 3: Obter detalhes de um produto específico
  async getItemDetails(itemId) {
    try {
      console.log(`📍 Buscando detalhes do produto ${itemId}...`);
      const response = await this.client.get(`/items/${itemId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao obter item ${itemId}:`, error.message);
      throw error;
    }
  }

  // Função 4: Buscar produtos similares (concorrentes)
  async searchCompetitors(query, limit = 10) {
    try {
      console.log(`📍 Buscando concorrentes para: "${query}"...`);
      const response = await this.client.get('/sites/MLB/search', {
        params: {
          q: query,
          limit: limit
        }
      });
      console.log(`✅ ${response.data.results.length} concorrentes encontrados`);
      return response.data.results;
    } catch (error) {
      console.error('❌ Erro ao buscar concorrentes:', error.message);
      return [];
    }
  }
}

// Exportar a classe para usar em outros arquivos
module.exports = MercadoLivreAPI;