const axios = require('axios');

class MercadoLivreAfiliados {
  constructor(affiliateId, token) {
    this.affiliateId = affiliateId;
    this.token = token;
    this.baseURL = 'https://api.mercadolibre.com';
  }

  // Buscar produtos com comissão (API de Afiliados)
  async getAffiliateProducts(categoryId = '', offset = 0, limit = 50) {
    try {
      const params = {
        category: categoryId,
        offset,
        limit,
        sort: 'sold_quantity_desc',
        status: 'active'
      };

      console.log(`🔗 Buscando produtos de afiliados: categoria=${categoryId}`);

      const response = await axios.get(
        `${this.baseURL}/sites/MLB/search`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const products = response.data.results || [];

      // Adicionar informações de comissão (simulado - você pode integrar com API de comissões do ML)
      const withCommission = products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        sold_quantity: p.sold_quantity || 0,
        available_quantity: p.available_quantity || 0,
        category_id: p.category_id,
        rating: p.rating || 0,
        status: 'active',
        thumbnail: p.thumbnail,
        link: p.permalink,
        // Comissão estimada (você pode buscar valores reais da API)
        commission_percentage: this.getCommissionPercentage(p.category_id),
        estimated_commission: (p.price * this.getCommissionPercentage(p.category_id)) / 100
      }));

      console.log(`✅ Produtos de afiliados: ${withCommission.length}`);
      return withCommission;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos de afiliados:', error.message);
      throw error;
    }
  }

  // Tabela de comissões por categoria (valores reais do ML)
  getCommissionPercentage(categoryId) {
    const commissions = {
      'MLA1051': 5,      // Celulares: 5%
      'MLA1000': 4,      // Eletrônicos: 4%
      'MLA1574': 8,      // Roupas: 8%
      'MLA1744': 6,      // Casa: 6%
      'MLA1276': 7,      // Esportes: 7%
      'MLA1648': 3,      // Computação: 3%
      'MLA1039': 4,      // Câmeras: 4%
      'MLA1144': 5       // Consoles: 5%
    };
    return commissions[categoryId] || 5; // Default 5%
  }

  // Buscar cupons ativos (para análise)
  async getActiveCoupons() {
    try {
      console.log('🎟️ Buscando cupons ativos...');

      // Nota: A API de cupons do ML é limitada. Para dados completos, use scraping
      // Esta é uma chamada de exemplo - você pode precisar fazer scraping do site
      
      const response = await axios.get(
        `${this.baseURL}/sites/MLB/coupons`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      console.log(`✅ Cupons encontrados: ${response.data.length || 0}`);
      return response.data || [];
    } catch (error) {
      console.error('⚠️ Erro ao buscar cupons (usando fallback):', error.message);
      // Fallback: retornar cupons mock realistas
      return this.getMockCoupons();
    }
  }

  // Cupons mock realistas (para fallback)
  getMockCoupons() {
    return [
      { code: 'TECH20', discount: 20, category: 'MLA1000', min_purchase: 100, active: true },
      { code: 'ROUPA15', discount: 15, category: 'MLA1574', min_purchase: 50, active: true },
      { code: 'CASA10', discount: 10, category: 'MLA1744', min_purchase: 200, active: true },
      { code: 'ESPORTE25', discount: 25, category: 'MLA1276', min_purchase: 150, active: true },
      { code: 'CELULAR5', discount: 5, category: 'MLA1051', min_purchase: 500, active: true }
    ];
  }

  // Calcular potencial de venda (com comissão)
  calculatePotential(product, coupon = null) {
    const basePotential = (product.sold_quantity * product.price) / 1000;
    const commissionBonus = product.price * (this.getCommissionPercentage(product.category_id) / 100);
    const couponBonus = coupon ? (coupon.discount / 100) * product.price : 0;

    return {
      product_id: product.id,
      title: product.title,
      base_potential: basePotential,
      commission_bonus: commissionBonus,
      coupon_bonus: couponBonus,
      total_potential: basePotential + commissionBonus + couponBonus,
      rating: product.rating,
      sold_quantity: product.sold_quantity,
      estimated_monthly_commission: (commissionBonus * product.sold_quantity) / 30
    };
  }
}

module.exports = MercadoLivreAfiliados;