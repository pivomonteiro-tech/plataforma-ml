const axios = require('axios');

class MercadoLivreAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  // Obter dados do usuário autenticado
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

  // Obter itens de venda do usuário (endpoint CORRETO)
  async getMyListings(userId, offset = 0, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/users/${userId}/items/search`, {
        params: {
          offset: offset,
          limit: limit,
          status: 'active'  // Apenas itens ativos/vigentes
        },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Erro ao obter itens de venda:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      throw error;
    }
  }

  // Obter detalhes de um item
  async getItemDetails(itemId) {
    try {
      const response = await axios.get(`${this.baseURL}/items/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter detalhes do item:', error.message);
      throw error;
    }
  }

  // Buscar produtos públicos (sem autenticação - API pública)
  async searchPublicProducts(query = '', categoryId = '', offset = 0, limit = 50) {
    try {
      let params = {
        offset: offset,
        limit: limit,
        sort: 'sold_quantity_desc'  // Ordenar por mais vendidos
      };

      if (query) {
        params.q = query;
      }

      if (categoryId) {
        params.category = categoryId;
      }

      const response = await axios.get(`${this.baseURL}/sites/MLB/search`, {
        params: params
        // NÃO usa token - API pública
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos públicos:', error.message);
      throw error;
    }
  }
}

module.exports = MercadoLivreAPI;