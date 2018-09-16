/**
 * PlayerToGameAdSession.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
	
		playerId: {
			type: 'string',
			unique: true,
			required: true,
            primaryKey: true,
		},

		ip: {
            type: 'string',
            defaultsTo: ""
        },

        countryCode: {
            type: 'string',
            required: true,
            defaultsTo: ""
        },

        regionCode: {
            type: 'string',
            required: true,
            defaultsTo: ""
        },

        regionName: {
            type: 'string',
            required: true,
            defaultsTo: ""
        },

        city: {
            type: 'string',
            required: true,
            defaultsTo: ""
        },

        longitude: {
            type: 'string',
            defaultsTo: ''
        },

        latitude: {
            type: 'string',
            defaultsTo: ''
        },
		
		gameAdSession: {
			collection: 'gameadsession',
			via: 'player'
		},
		
    },
	
};

