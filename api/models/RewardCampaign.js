/**
 * RewardCampaign.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
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
		
		jackpotValue: {
			type: 'string',
			defaultsTo: ''
		},
		
		jackpotCurrency: {
			type: 'string',
			defaultsTo: ''
		},
		
		jackpotText: {
			type: 'string',
			defaultsTo: ''
		},
		
		maxQualifyingPlayers: {
			type: 'integer',
			defaultsTo: ''
		},
		
		maxWinningPlayers: {
			type: 'integer',
			defaultsTo: ''
		},
		
		banners: {
			type: 'string',
			defaultsTo: ''
		},
		
		rewardProcessed: {
			type: 'boolean',
			defaultsTo: false
		},
		
		rewardProcessedDate: {
			type: 'datetime',
			defaultsTo: function() {
				return new Date()
			}
		},
		
		game: {
			model: 'game'
		},
		
		gameEvent: {
			collection: 'gameevent',
			via: 'rewardCampaign',
			through: 'rewardcampaigngameevent'
		},
		
		players: {
			collection: 'player',
			via: 'rewardCampaign',
			through: 'playerrewards'
		}
		
    },
	
};

