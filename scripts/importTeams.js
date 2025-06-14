require('dotenv').config();
const FootballService = require('../src/services/footballService');

async function main() {
    console.log('🏈 FOOTBALL API DATA IMPORTER');
    console.log('='.repeat(60));
    
    // Verificar configurações
    if (!process.env.FOOTBALL_API_KEY) {
        console.error('❌ FOOTBALL_API_KEY não configurada no arquivo .env');
        console.log('💡 Obtenha sua chave em: https://www.football-data.org/client/register');
        process.exit(1);
    }

    if (!process.env.DB_PASSWORD) {
        console.error('❌ DB_PASSWORD não configurada no arquivo .env');
        process.exit(1);
    }

    console.log('🔧 Configurações:');
    console.log(`   📡 API URL: ${process.env.FOOTBALL_API_URL}`);
    console.log(`   🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   📦 Batch Size: ${process.env.BATCH_SIZE || 50}`);
    console.log(`   ⏱️  Delay: ${process.env.DELAY_BETWEEN_REQUESTS || 2000}ms`);
    console.log('='.repeat(60));

    const footballService = new FootballService();

    try {
        const startTime = Date.now();
        
        // Executar importação
        await footballService.fetchAndSaveTeams();
        
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('='.repeat(40));
        console.log(`⏱️  Tempo total: ${duration} segundos`);
        console.log('✅ Importação concluída com sucesso!');
        
    } catch (error) {
        console.error('\n❌ ERRO DURANTE A IMPORTAÇÃO:');
        console.error(error.message);
        
        if (error.response?.status === 403) {
            console.log('\n💡 DICA: Verifique se sua API key está correta e ativa');
        } else if (error.response?.status === 429) {
            console.log('\n💡 DICA: Rate limit excedido. Tente novamente em alguns minutos');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 DICA: Verifique se o PostgreSQL está rodando e as configurações do banco estão corretas');
        }
        
        process.exit(1);
    }
}

// Executar script
main().catch(console.error);