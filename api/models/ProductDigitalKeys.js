/**
 * ProductDigitalKeys.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {

    	key: {
            type: 'text',
			required: true,
    	},

    	used: {
    		type: 'boolean',
    		defaultsTo: false
    	},

    	product: {
    		model: 'products'
    	},

        orderDigitalKey: {
			collection: 'orderdigitalkey',
			via: 'productDigitalKey'
		},	
    },
	
};