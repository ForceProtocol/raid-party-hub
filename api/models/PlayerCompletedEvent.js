/**
 * PlayerCompletedEvent.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		points: {
			type: 'integer',
			defaultsTo: 0
		},
		
		qualifiedEvent: {
			type: 'boolean',
			defaultsTo: false
		},
		
		wonEmailSent: {
			type: 'boolean',
			defaultsTo: false
		},
		
		player: {
			model: 'player'
		},
		
		rewardCampaignGameEvent: {
			model: 'rewardcampaigngameevent'
		},
		
    },
	
};

