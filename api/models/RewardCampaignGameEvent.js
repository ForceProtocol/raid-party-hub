/**
 * RewardCampaign.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		valueMin: {
			type: 'string',
			defaultsTo: ''
		},
		
		valueMax: {
			type: 'string',
			defaultsTo: ''
		},
		
		greaterThan: {
			type: 'string',
			defaultsTo: ''
		},
		
		lessThan: {
			type: 'string',
			defaultsTo: ''
		},
		
		equalTo: {
			type: 'string',
			defaultsTo: ''
		},
		
		points: {
			type: 'integer',
			defaultsTo: 1
		},
		
		rewardCampaign: {
			model: 'rewardcampaign'
		},
		
		gameEvent: {
			model: 'gameevent'
		},
		
    },
	
};

