/**
 * RewardCampaign.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		valueMin: {
			type: 'integer',
			defaultsTo: 0
		},
		
		valueMax: {
			type: 'integer',
			defaultsTo: 0
		},
		
		equalTo: {
			type: 'integer',
			defaultsTo: 0
		},
		
		points: {
			type: 'integer',
			defaultsTo: 0
		},
		
		rewardCampaign: {
			model: 'rewardcampaign'
		},
		
		gameEvent: {
			model: 'gameevent'
		},
		
		playerCompletedEvents: {
			collection: 'playercompletedevent',
			via: 'rewardCampaignGameEvent'
		},
		
    },
	
};

