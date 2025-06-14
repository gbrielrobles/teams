require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('../src/config/database');

async function main() {
    console.log('🔄 Iniciando migração do banco de dados');
    console.log('='.repeat(60));

    // Verificar configurações
    if (!process.env.DB_PASSWORD) {
        console.error('❌ DB_PASSWORD não configurada no arquivo .env');
        process.exit(1);
    }

    const database = new Database();

    try {
        // Testar conexão
        const connected = await database.testConnection();
        if (!connected) {
            throw new Error('Não foi possível conectar ao banco de dados');
        }

        console.log('✅ Conexão com PostgreSQL bem-sucedida');

        // Ler arquivo de migração
        const migrationPath = path.join(__dirname, '../src/database/migrations/001_create_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Executar migração
        console.log('📝 Executando migração...');
        await database.query(migrationSQL);

        console.log('✅ Migração concluída com sucesso!');

    } catch (error) {
        console.error('\n❌ ERRO DURANTE A MIGRAÇÃO:');
        console.error(error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 DICA: Verifique se o PostgreSQL está rodando e as configurações do banco estão corretas');
        }
        
        process.exit(1);
    } finally {
        await database.close();
    }
}

// Executar script
main().catch(console.error);