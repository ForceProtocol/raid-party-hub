/**
 * PlayerToGame.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
	
		eventName: {
			type: 'string',
			required: true
		},
		
		eventDescription: {
			type: 'string',
			required: true
		},
		
		eventValue: {
			type: 'string'
		},
		
		player: {
			model: 'player'
		},
		
		game: {
			model: 'game'
		},
		
    },
	
};

