const axios = require('axios');

class MercadoLivreAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  // Obter dados do usuário (só para autenticação)
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

  // Buscar categorias públicas (sem token - da documentação /sites/MLB/categories)
  async getCategories(siteId = 'MLB') {
    try {
      const response = await axios.get(`${this.baseURL}/sites/${siteId}/categories`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter categorias:', error.message);
      throw error;
    }
  }

  // Buscar produtos públicos por categoria ou termo (sem token - da documentação /sites/MLB/search)
  async searchPublicProducts(query = '', categoryId = '', offset = 0, limit = 50) {
    try {
      let params = {
        offset: offset,
        limit: limit,
        sort: 'sold_quantity_desc'  // Ordenar por mais vendidos (útil para afiliados)
      };

      if (query) {
        params.q = query;
      }

      if (categoryId) {
        params.category = categoryId;
      }

      const response = await axios.get(`${this.baseURL}/sites/MLB/search`, {
        params: params
        // SEM token - endpoint público
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos públicos:', error.message);
      throw error;
    }
  }

  // Obter detalhes de um item (pode usar token se necessário, mas público também funciona)
  async getItemDetails(itemId) {
    try {
      const response = await axios.get(`${this.baseURL}/items/${itemId}`);
      // Sem token para detalhes públicos
      return response.data;
    } catch (error) {
      console.error('Erro ao obter detalhes do item:', error.message);
      throw error;
    }
  }
}

module.exports = MercadoLivreAPI;