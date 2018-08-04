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

        approved: {
            type: 'boolean',
            defaultsTo: false
        },

        archived: {
            type: 'boolean',
            defaultsTo: false
        },
		
		width: {
            type: 'float', 
            defaultsTo: 0
        },

        height: {
            type: 'float', 
            defaultsTo: 0
        },

        impressions: {
            type: 'integer',
            defaultsTo: 0
        },

        maxBid: {
            type: 'float',
            defaultsTo: 0
        },

        dailyBudget: {
            type: 'float',
            defaultsTo: 0
        },

        link: {
        	type: 'string',
        	defaultsTo: ''
        },

        resourceUrlHd: {
        	type: 'string',
        	defaultsTo: ''
        },

        resourceUrlSd: {
        	type: 'string',
        	defaultsTo: ''
        },

     	resourceUrlImg: {
        	type: 'string',
        	defaultsTo: ''
        },

        timeRanges: {
        	type: 'string',
        	defaultsTo: ''
        },

        daysOfWeek: {
        	type: 'string',
        	defaultsTo: ''
        },

        startDate: {
        	type: 'datetime'
        },

        endDate: {
        	type: 'datetime'
        },

		gameAdSessions: {
			collection: 'gameadsession',
			via: 'gameAdAsset'
		},

		gameAsset: {
			model: 'gameasset'
		},

		game: {
			model: 'game'
		},

        advertiser: {
            model: 'advertiser'
        },
    },
	
};

