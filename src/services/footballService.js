// src/services/footballService.js
const axios = require('axios');
const Database = require('../config/database');

class FootballService {
    constructor() {
        this.apiUrl = process.env.FOOTBALL_API_URL || 'https://api.football-data.org/v4';
        this.apiKey = process.env.FOOTBALL_API_KEY;
        this.headers = {
            'X-Auth-Token': this.apiKey
        };
        this.database = new Database();
        this.batchSize = parseInt(process.env.BATCH_SIZE) || 50;
        this.delayBetweenRequests = parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 2000;
    }

    // Salvar time no banco
    async saveTeam(team) {
        if (!team || !team.id) return;
        
        const query = `
            INSERT INTO teams (id, name, short_name, tla, crest, address, website, founded, club_colors, venue)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                short_name = EXCLUDED.short_name,
                tla = EXCLUDED.tla,
                crest = EXCLUDED.crest,
                address = EXCLUDED.address,
                website = EXCLUDED.website,
                founded = EXCLUDED.founded,
                club_colors = EXCLUDED.club_colors,
                venue = EXCLUDED.venue,
                updated_at = CURRENT_TIMESTAMP
        `;
        
        await this.database.query(query, [
            team.id,
            team.name,
            team.shortName,
            team.tla,
            team.crest,
            team.address,
            team.website,
            team.founded,
            team.clubColors,
            team.venue
        ]);
    }

    // Função principal para buscar e salvar dados
    async fetchAndSaveData() {
        try {
            // Testar conexão com o banco
            const connected = await this.database.testConnection();
            if (!connected) {
                throw new Error('Não foi possível conectar ao banco de dados');
            }

            console.log('🏈 Iniciando importação de dados do Football API');
            console.log('='.repeat(60));

            // Buscar competições
            console.log('📡 Buscando competições...');
            const competitions = await this.getCompetitions();
            
            if (!competitions.competitions || competitions.competitions.length === 0) {
                throw new Error('Nenhuma competição encontrada');
            }

            console.log(`📋 Encontradas ${competitions.competitions.length} competições`);

            // Processar cada competição
            for (const competition of competitions.competitions) {
                try {
                    console.log(`\n🔄 Processando competição: ${competition.name}`);
                    
                    // Salvar área da competição
                    if (competition.area) {
                        await this.saveArea(competition.area);
                    }

                    // Salvar competição
                    await this.saveCompetition(competition);

                    // Buscar times da competição
                    console.log(`📡 Buscando times da competição ${competition.name}...`);
                    const teamsData = await this.getTeamsByCompetition(competition.id);
                    
                    if (teamsData.teams && teamsData.teams.length > 0) {
                        console.log(`📋 Encontrados ${teamsData.teams.length} times`);
                        
                        // Processar cada time
                        for (const team of teamsData.teams) {
                            try {
                                // Salvar time
                                await this.saveTeam(team);

                                console.log(`✅ Time ${team.name} processado com sucesso`);
                            } catch (error) {
                                console.error(`❌ Erro ao processar time ${team.name}:`, error.message);
                            }

                            // Delay para respeitar rate limit
                            await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
                        }
                    }

                    console.log(`✅ Competição ${competition.name} processada com sucesso`);
                } catch (error) {
                    console.error(`❌ Erro ao processar competição ${competition.name}:`, error.message);
                }

                // Delay entre competições
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
            }

            console.log('\n📊 ESTATÍSTICAS FINAIS:');
            console.log('='.repeat(40));
            
            try {
                const stats = await this.getStats();
                console.log(`🏟️  Times: ${stats.teams}`);
                console.log(`🌍 Áreas: ${stats.areas}`);
                console.log(`🏆 Competições: ${stats.competitions}`);
            } catch (error) {
                console.log('❌ Erro ao buscar estatísticas finais');
            }

            console.log('='.repeat(40));
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
            
            throw error;
        } finally {
            await this.database.close();
        }
    }

    // Método para buscar estatísticas do banco
    async getStats() {
        try {
            const queries = [
                'SELECT COUNT(*) as total FROM teams',
            
            ];

            const results = await Promise.all(
                queries.map(query => this.database.query(query))
            );

            return {
                teams: parseInt(results[0].rows[0].total),
            };
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error.message);
            throw error;
        }
    }

    async getAllTeams(offset = 0, limit = 100) {
        try {
            const response = await axios.get(`${this.apiUrl}/teams`, {
                headers: this.headers,
                params: { offset, limit }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao buscar times:', error.response?.data || error.message);
            throw error;
        }
    }

    async fetchAndSaveTeams() {
        try {
            const connected = await this.database.testConnection();
            if (!connected) throw new Error('Não foi possível conectar ao banco de dados');
            console.log('🏈 Iniciando importação de times do Football API');
            let offset = 0;
            const limit = this.batchSize;
            let hasMoreData = true;
            let totalProcessed = 0;
            let totalErrors = 0;
            while (hasMoreData) {
                console.log(`📡 Buscando times... Offset: ${offset}, Limit: ${limit}`);
                try {
                    const response = await this.getAllTeams(offset, limit);
                    const teams = response.teams;
                    if (!teams || teams.length === 0) {
                        hasMoreData = false;
                        break;
                    }
                    for (const team of teams) {
                        try {
                            await this.saveTeam(team);
                            totalProcessed++;
                            console.log(`✅ Time ${team.name} salvo com sucesso`);
                        } catch (error) {
                            totalErrors++;
                            console.error(`❌ Erro ao processar time ${team.name}:`, error.message);
                        }
                        await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
                    }
                    offset += limit;
                    if (teams.length < limit) hasMoreData = false;
                } catch (error) {
                    totalErrors++;
                    console.error('❌ Erro ao buscar página:', error.message);
                    await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests * 3));
                }
            }
            console.log('='.repeat(60));
            console.log(`🎉 Importação concluída!`);
            console.log(`✅ Times processados: ${totalProcessed}`);
            console.log(`❌ Erros: ${totalErrors}`);
        } catch (error) {
            console.error('❌ Erro durante a importação:', error.message);
            throw error;
        } finally {
            await this.database.close();
        }
    }
}

module.exports = FootballService;