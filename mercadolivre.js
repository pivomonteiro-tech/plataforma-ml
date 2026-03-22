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

  // Obter listagens do usuário
  async getMyListings(userId, offset = 0, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/users/${userId}/listings`, {
        params: {
          offset: offset,
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter listagens:', error.message);
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

  // Buscar produtos por categoria
  async searchProducts(categoryId, offset = 0, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/sites/MLB/search`, {
        params: {
          category: categoryId,
          offset: offset,
          limit: limit,
          sort: 'relevance'
        },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error.message);
      throw error;
    }
  }

  // Buscar produtos por termo
  async searchProductsByQuery(query, offset = 0, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/sites/MLB/search`, {
        params: {
          q: query,
          offset: offset,
          limit: limit,
          sort: 'relevance'
        },
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar produtos por query:', error.message);
      throw error;
    }
  }

  // Obter categorias
  async getCategories() {
    try {
      const response = await axios.get(`${this.baseURL}/sites/MLB/categories`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter categorias:', error.message);
      throw error;
    }
  }
}

module.exports = MercadoLivreAPI;