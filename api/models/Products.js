/**
 * Products.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
	
		active: {
            type: 'boolean',
			defaultsTo: false
        },
		
		title: {
            type: 'string',
			required: true
        },
		
		description: {
            type: 'text',
			required: true
        },

        orderNote: {
            type: 'text',
            defaultsTo: '',
        },
		
		forcePrice: {
			type: 'text',
			defaultsTo: '',
        },
		
		usdPrice: {
			type: 'text',
			defaultsTo: '',
        },
		
		img: {
			type: 'text',
			defaultsTo: '',
        },
		
		qty: {
			type: 'integer',
			defaultsTo: 0,
        },
		
		platform: {
			type: 'string',
			enum: ['pc', 'android', 'ios', 'xbox', 'playstation']
        },

        category: {
			type: 'string',
			enum: ['games', 'merchandise']
        },

        orders: {
			collection: 'orders',
			via: 'product'
		},

		productDigitalKey: {
			collection: 'productdigitalkeys',
			via: 'product'
		},	
    },
	
};

