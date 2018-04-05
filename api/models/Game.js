/**
 * Game.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt-nodejs');

module.exports = {
    tableName: 'games',
    attributes: {
	
		gameId: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuidv4();
			}
        },
		
		active: {
            type: 'boolean',
			defaultsTo: false
        },
		
		title: {
            type: 'string',
			required: true
        },
		
		rewardAvailable: {
            type: 'text',
			defaultsTo: '0.0'
        },
		
		description: {
            type: 'text',
			required: true
        },
		
		link: {
            type: 'text',
			required: true
        },
		
		platform: {
			type: 'string',
			enum: ['android', 'ios', 'pc', 'console']
		},
		
		avatar: {
			type: 'text',
			required: true
		},

		publicKey: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuidv4();
			}
        },
		
		privateKey: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuidv4();
			}
        },
		
		developer: {
			type: 'string',
		},
		
		players: {
			collection: 'player',
			via: 'game',
			through: 'playertogame'
		},
		
		playerToGameEvent: {
			collection: 'playertogameevent',
			via: 'game'
		},
		
		rewards: {
			collection: 'playerrewards',
			via: 'game'
		},
		
    },
	
	customToJSON: function () {
        return _.omit(this, ['publicKey', 'privateKey', 'gameId'])
    }
};

