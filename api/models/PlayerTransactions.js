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
		
        amount: {
            type: 'string',
			required: true
        },
		
		currency: {
			type: 'string',
			defaultsTo: 'FORCE',
			required: true
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

