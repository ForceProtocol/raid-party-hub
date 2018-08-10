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

        archived: {
            type: 'boolean',
			defaultsTo: false
        },

        dynamicAdsEnabled: {
            type: 'boolean',
			defaultsTo: false
        },

        dynamicAdsDescription: {
            type: 'text',
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
		
		rules: {
			type: 'text',
			defaultsTo: ''
		},
		
		jackpot: {
			type: 'text',
			defaultsTo: '',
        },
		
		startDate: {
			type: 'datetime',
			defaultsTo: function() {
				return new Date()
			}
		},
		
		endDate: {
			type: 'datetime',
			defaultsTo: function() {
				return new Date()
			}
		},
		
		bannerContent: {
			type: 'text',
			defaultsTo: '',
        },
		
		featured: {
			type: 'boolean',
			defaultsTo: false
		},
		
		avatar: {
			type: 'text',
			required: true
		},

		monthlyImpressions: {
			type: 'integer',
			defaultsTo: 0
		},

		monthlyActiveUsers: {
			type: 'integer',
			defaultsTo: 0
		},

		regions: {
			type: 'string',
			defaultsTo: ""
		},

		male: {
			type: 'integer',
			defaultsTo: 0
		},

		female: {
			type: 'integer',
			defaultsTo: 0
		},

		age: {
			type: 'string',
			defaultsTo: ""
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
		
		studio: {
			model: 'studio'
		},
		
		players: {
			collection: 'player',
			via: 'game',
			through: 'playertogame'
		},
		
		gameEvent: {
			collection: 'gameevent',
			via: 'game'
		},
		
		gamePlatforms: {
			collection: 'gameplatforms',
			via: 'game'
		},
		
		rewardCampaign: {
			collection: 'rewardcampaign',
			via: 'game'
		},
		
		rewards: {
			collection: 'playerrewards',
			via: 'game'
		},
		
		qualifiedPlayers: {
			collection: 'qualifiedplayers',
			via: 'game'
		},
		
		playerGameEventAirdrops: {
			collection: 'playergameeventairdrops',
			via: 'game'
		},

		gameAdAsset: {
			collection: 'gameadasset',
			via: 'game'
		},

		gameAsset: {
			collection: 'gameasset',
			via: 'game'
		},
		
    },
	
	customToJSON: function () {
        return _.omit(this, ['publicKey', 'privateKey', 'gameId'])
    }
};

