/**
 * PlayerTransactions.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 

module.exports = {

    attributes: {
		
		description: {
            type: 'string'
        },
		
        force: {
            type: 'integer'
        },
		
		type: {
			type: 'string',
			enum: ['withdraw', 'deposit']
		},
		
		player: {
			model: 'player',
		},
		
	},
	
};

