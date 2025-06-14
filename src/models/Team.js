const Database = require('../config/database');

/**
 * Color mapping between English and Portuguese
 */
const COLOR_MAPPINGS = {
    white: 'branco',
    black: 'preto',
    red: 'vermelho',
    blue: 'azul',
    yellow: 'amarelo',
    green: 'verde',
    orange: 'laranja',
    purple: 'roxo',
    pink: 'rosa',
    brown: 'marrom',
    grey: 'cinza',
    gray: 'cinza',
    gold: 'dourado',
    silver: 'prata',
    navy: 'azul marinho'
};

const REVERSE_COLOR_MAPPINGS = Object.fromEntries(
    Object.entries(COLOR_MAPPINGS).map(([en, pt]) => [pt, en])
);

/**
 * Translates colors from English to Portuguese
 * @param {string} colors - Colors string in English
 * @returns {string} Colors string in Portuguese
 */
function translateColors(colors) {
    if (!colors) return colors;
    return colors.split(/[\/]|,|\s*\/\s*/)
        .map(color => {
            const cleanColor = color.trim().toLowerCase();
            return COLOR_MAPPINGS[cleanColor] || color.trim();
        })
        .join(' / ');
}

/**
 * Translates a color from Portuguese to English
 * @param {string} colorPt - Color in Portuguese
 * @returns {string} Color in English
 */
function translateToEnglish(colorPt) {
    const cleanColor = colorPt.trim().toLowerCase();
    return REVERSE_COLOR_MAPPINGS[cleanColor] || colorPt;
}

/**
 * Team model for handling team-related database operations
 */
class Team {
    constructor() {
        this.database = new Database();
    }

    /**
     * Maps database row to Portuguese field names
     * @param {Object} row - Database row
     * @returns {Object|null} Mapped object or null
     */
    mapToPortuguese(row) {
        if (!row) return null;
        return {
            id: row.id,
            nome: row.name,
            nome_curto: row.short_name,
            sigla: row.tla,
            escudo: row.crest,
            estadio: row.venue,
            cores_clube: translateColors(row.club_colors),
            fundado: row.founded,
            endereco: row.address,
            site: row.website
        };
    }

    /**
     * Returns the mapping between Portuguese and English column names
     * @returns {Object} Column mapping
     */
    getColumnMap() {
        return {
            id: 'id',
            nome: 'name',
            nome_curto: 'short_name',
            sigla: 'tla',
            escudo: 'crest',
            estadio: 'venue',
            cores_clube: 'club_colors',
            fundado: 'founded',
            endereco: 'address',
            site: 'website'
        };
    }

    /**
     * Finds all teams with pagination and filtering
     * @param {Object} options - Query options
     * @param {number} options.page - Page number
     * @param {number} options.limit - Items per page
     * @param {string} options.sort - Sort field
     * @param {string} options.order - Sort order
     * @param {Object} options.filters - Filter criteria
     * @returns {Promise<Object>} Paginated results
     */
    async findAll({ page = 1, limit = 10, sort = 'nome', order = 'asc', filters = {} }) {
        const offset = (page - 1) * limit;
        const columnMap = this.getColumnMap();
        let query = `SELECT * FROM teams`;
        const queryParams = [];
        const whereConditions = [];

        // Build filter conditions
        if (Object.keys(filters).length > 0) {
            for (const [key, value] of Object.entries(filters)) {
                if (columnMap[key]) {
                    let filterValue = value;
                    if (key === 'cores_clube') {
                        filterValue = translateToEnglish(value);
                    }

                    if (typeof filterValue === 'string') {
                        if (filterValue.match(/^\d+$/) && (key === 'id' || key === 'fundado')) {
                            whereConditions.push(`${columnMap[key]} = $${queryParams.length + 1}`);
                            queryParams.push(Number(filterValue));
                        } else {
                            whereConditions.push(`${columnMap[key]} ILIKE $${queryParams.length + 1}`);
                            queryParams.push(`%${filterValue}%`);
                        }
                    }
                }
            }
        }

        // Add WHERE clause if needed
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Add sorting
        let sortColumn = columnMap[sort] || 'name';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY (CASE WHEN ${sortColumn} IS NULL OR ${sortColumn} = '' THEN 1 ELSE 0 END), ${sortColumn} ${sortOrder}`;
        
        // Add pagination
        query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        // Count total records
        const countQuery = `SELECT COUNT(*) as total FROM teams ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}`;

        try {
            const [results, countResult] = await Promise.all([
                this.database.query(query, queryParams),
                this.database.query(countQuery, queryParams.slice(0, -2))
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                dados: results.rows.map(this.mapToPortuguese),
                paginacao: {
                    total,
                    totalPaginas: totalPages,
                    paginaAtual: page,
                    limite: limit,
                    temProximaPagina: page < totalPages,
                    temPaginaAnterior: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Error fetching teams: ${error.message}`);
        }
    }

    /**
     * Finds a team by ID
     * @param {number|string} id - Team ID
     * @returns {Promise<Object|null>} Team data or null
     */
    async findById(id) {
        if (!id) {
            throw new Error('Team ID is required');
        }

        const query = `SELECT * FROM teams WHERE id = $1`;
        try {
            const result = await this.database.query(query, [id]);
            return this.mapToPortuguese(result.rows[0]);
        } catch (error) {
            throw new Error(`Error fetching team: ${error.message}`);
        }
    }
}

module.exports = Team;
