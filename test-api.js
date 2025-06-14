const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('https://api.football-data.org/v4/teams/1', {
            headers: {
                'X-Auth-Token': 'bb11945109a74cab83f1c6bf0b1a7670'
            }
        });
        console.log('Resposta da API:', response.data);
    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
    }
}

testApi(); 