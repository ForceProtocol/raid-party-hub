/**
 * Products.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
	createdAt: false,
	updatedAt: false,
    attributes: {

    	countryCode: {
    		type: 'string',
    		required: true
    	},

		gameAdAsset: {
			model: 'gameadasset'
		},
		region: {
			model: 'regions'
		}

    },
	
};
