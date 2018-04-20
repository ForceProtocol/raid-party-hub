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
		
		qualifiedEmailSent: {
			type: 'boolean',
			defaultsTo: false
		},
		
		wonEmailSent: {
			type: 'boolean',
			defaultsTo: false
		},
		
		isWinner: {
			type: 'boolean',
			defaultsTo: false
		},
		
		players: {
			model: 'player'
		},
		
		game: {
			model: 'game'
		},
		
		rewardCampaign: {
			model: 'rewardcampaign'
		},
		
    },
	
};

