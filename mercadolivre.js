const { scrapeMLProducts } = require('./scraper');
const axios = require('axios');

class MercadoLivreAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  // Autenticação básica (COM token - corrigido)
  async getMe() {
    try {
      const response = await axios.get(`${this.baseURL}/users/me`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      console.log(`✅ getMe funcionou: ${response.data.nickname}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error.message);
      // Fallback para mock user se falhar
      return { nickname: 'Usuário Mock', id: 'mock123' };
    }
  }

  // Categorias (fixas para scraping - da doc)
  async getCategories() {
    return [
      { id: 'MLA1051', name: 'Celulares', url: 'https://lista.mercadolivre.com.br/celulares-telefones' },
      { id: 'MLA1000', name: 'Eletrônicos', url: 'https://lista.mercadolivre.com.br/eletronicos-audio-video' },
      { id: 'MLA1574', name: 'Roupas', url: 'https://lista.mercadolivre.com.br/roupas-acessorios' },
      { id: 'MLA1744', name: 'Casa', url: 'https://lista.mercadolivre.com.br/hogar-muebles-jardin' },
      { id: 'MLA1276', name: 'Esportes', url: 'https://lista.mercadolivre.com.br/deportes-fitness' }
    ];
  }

  // Busca via scraping (dados reais do site)
  async searchPublicProducts(query = '', categoryId = '', offset = 0, limit = 50) {
    try {
      const categories = await this.getCategories();
      const cat = categories.find(c => c.id === categoryId) || categories[0];
      const url = cat.url;

      console.log(`🔍 Scraping de ${cat.name}: ${url}`);

      const products = await scrapeMLProducts(url, limit);

      // Processa para formato compatível
      const processed = products.map((p, index) => ({
        id: `scraped_${categoryId}_${index + 1}`,
        title: p.title,
        price: p.price,
        sold_quantity: p.sold_quantity,
        available_quantity: p.available_quantity,
        category_id: categoryId,
        rating: Math.random() * 0.5 + 4.3,  // Simulado 4.3-4.8
        status: 'active',
        thumbnail: p.thumbnail,
        link: p.link
      }));

      console.log(`✅ Scraping ${cat.name}: ${processed.length} produtos reais`);
      return { results: processed };
    } catch (error) {
      console.error('Erro no scraping:', error.message);
      throw error;
    }
  }

  // Detalhes de item (scraping ou mock)
  async getItemDetails(itemId) {
    // Para simplicidade, mock - expanda com scraping de página individual se necessário
    return {
      id: itemId,
      title: 'Produto Detalhado',
      price: 999.99,
      sold_quantity: 100,
      available_quantity: 50,
      rating: 4.5
    };
  }
}

module.exports = MercadoLivreAPI;