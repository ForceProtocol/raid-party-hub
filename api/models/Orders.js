/**
 * Orders.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
	
        note: {
            type: 'text',
            defaultsTo: '',
        },
		
		totalForce: {
			type: 'text',
			defaultsTo: '',
        },
		
		qty: {
			type: 'integer',
			defaultsTo: 0,
        },

        product: {
			model: 'products'
		},
		
		player: {
			model: 'player'
		},

		orderDigitalKey: {
			collection: 'orderdigitalkey',
			via: 'order'
		},
	
    },
	
};

