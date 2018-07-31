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
		
		width: {
            type: 'integer',
            defaultsTo: 0
        },

        height: {
            type: 'integer',
            defaultsTo: 0
        },

        title: {
            type: 'string',
            defaultsTo: ''
        },

        description: {
            type: 'text',
            defaultsTo: ''
        },

        screenshot: {
            type: 'string',
            defaultsTo: ''
        },

        sample: {
            type: 'string',
            defaultsTo: ''
        },

        type: {
            type: 'string',
            enum: ['screen', 'texture'],
            defaultsTo: 'screen'
        },

        gameAdAsset: {
            collection: 'gameadasset',
            via: 'gameAsset'
        },

		game: {
			model: 'game'
		},	
    },
	
};

