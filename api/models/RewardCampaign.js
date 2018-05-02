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
		
		reason: {
			type: 'string',
			defaultsTo: ''
		},
		
		value: {
			type: 'string',
			defaultsTo: ''
		},
		
		currency: {
			type: 'string',
			defaultsTo: ''
		},
		
		maxQualifyingPlayers: {
			type: 'integer',
			defaultsTo: 0
		},
		
		maxWinningPlayers: {
			type: 'integer',
			defaultsTo: 0
		},
		
		rewardTypeId: {
			type: 'integer',
			defaultsTo: 1
		},
		
		lockoutPeriod: {
			type: 'integer',
			defaultsTo: 0
		},
		
		banners: {
			type: 'string',
			defaultsTo: ''
		},
		
		rules: {
			type: 'text',
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
		
		rewardCampaignGameEvents: {
			collection: 'rewardcampaigngameevent',
			via: 'rewardCampaign'
		},
		
		qualifiedPlayers: {
			collection: 'qualifiedplayers',
			via: 'rewardCampaign'
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

