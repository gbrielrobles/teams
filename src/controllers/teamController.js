const Team = require('../models/Team');

/**
 * Controller for handling team-related operations
 */
class TeamController {
    /**
     * List all teams with pagination and filtering
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async index(req, res) {
        try {
            const { page, limit, sort, order, ...filters } = req.query;
            
            // Validate and parse query parameters
            const parsedPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || 10;
            
            if (parsedPage < 1 || parsedLimit < 1) {
                return res.status(400).json({ 
                    error: 'Invalid pagination parameters. Page and limit must be positive numbers.' 
                });
            }

            const team = new Team();
            const result = await team.findAll({
                page: parsedPage,
                limit: parsedLimit,
                sort: sort || 'name',
                order: order || 'asc',
                filters
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                error: 'Internal server error while fetching teams',
                details: error.message 
            });
        }
    }

    /**
     * Get a specific team by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async show(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ 
                    error: 'Team ID is required' 
                });
            }

            const team = new Team();
            const result = await team.findById(id);
            
            if (!result) {
                return res.status(404).json({ 
                    error: 'Team not found' 
                });
            }
            
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                error: 'Internal server error while fetching team',
                details: error.message 
            });
        }
    }
}

module.exports = new TeamController();
