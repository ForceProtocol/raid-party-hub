/**
 * Products.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
	
		sessionId: {
            type: 'string',
            required: true
        },

        visitedLink: {
        	type: 'boolean',
        	defaultsTo: false
        },

        videoQuality: {
            type: 'string',
            defaultsTo: 'sd'
        },

        startDate: {
        	type: 'datetime'
        },

        endDate: {
        	type: 'datetime'
        },

        userAgent: {
            type: 'string',
            defaultsTo: ''
        },

		gameAdAsset: {
            model: 'gameadasset'
        },
    },
	
};

