/**
 * Game.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'games',
    attributes: {
	
		title: {
            type: 'string',
			required: true
        },
		
		description: {
            type: 'text'
        },
		
		avatar: {
			type: 'string'
		},
		
		gameId: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuid.v4();
			}
        },
		
		publicKey: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuid.v4();
			}
        },
		
		privateKey: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuid.v4();
			}
        },
		
		developer: {
			model: 'developer'
		},
		
		players: {
			collection: 'player',
			via: 'game',
			through: 'playertogame'
		},
		
		rewards: {
			collection: 'playerrewards',
			via: 'game'
		},
		
    },
};

