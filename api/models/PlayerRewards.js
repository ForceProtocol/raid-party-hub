/**
 * PlayerRewards.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 

module.exports = {

    attributes: {
		
		reason: {
            type: 'string',
			required: true
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
		
		avatar: {
			type: 'text',
			defaultsTo: ''
		},
		
		link: {
            type: 'text',
			defaultsTo: ''
        },
		
		game: {
			model: 'game',
		},
		
		player: {
			model: 'player',
		},
		
	},
	
};

