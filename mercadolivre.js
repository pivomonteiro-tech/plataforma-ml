const axios = require('axios');

class MercadoLivreAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  // Obter dados do usuário (só para autenticação básica)
  async getMe() {
    try {
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error.message);
      throw error;
    }
  }

  // Obter categorias públicas (da documentação: /sites/MLB/categories - SEM token)
  async getCategories(siteId = 'MLB') {
    try {
      const response = await axios.get(`${this.baseURL}/sites/${siteId}/categories`);
      console.log(`✅ Categorias públicas obtidas: ${response.data.length}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter categorias públicas:', error.message);
      throw error;
    }
  }

  // Buscar produtos públicos (da documentação: /sites/MLB/search - SEM token)
  async searchPublicProducts(query = '', categoryId = '', offset = 0, limit = 50) {
    try {
      let params = {
        offset: offset,
        limit: limit,
        sort: 'sold_quantity_desc'  // Mais vendidos (útil para afiliados)
      };

      if (query) {
        params.q = query;
      }

      if (categoryId) {
        params.category = categoryId;
      }

      console.log(`🔍 Buscando produtos públicos: categoria=${categoryId}, limit=${limit}`);
      
      const response = await axios.get(`${this.baseURL}/sites/MLB/search`, {
        params: params
        // SEM Authorization - endpoint público
      });

      console.log(`✅ Busca pública: ${response.data.results ? response.data.results.length : 0} produtos encontrados`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos públicos:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      throw error;
    }
  }

  // Detalhes de item (público, sem token)
  async getItemDetails(itemId) {
    try {
      const response = await axios.get(`${this.baseURL}/items/${itemId}`);
      // SEM token
      return response.data;
    } catch (error) {
      console.error('Erro ao obter detalhes do item:', error.message);
      throw error;
    }
  }
}

module.exports = MercadoLivreAPI;