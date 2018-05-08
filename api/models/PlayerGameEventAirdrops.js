/**
 * PlayerGameEventAirdrops.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
				
		paid: {
			type: 'boolean',
			defaultsTo: false
		},
		
		player: {
			model: 'player'
		},
		
		game: {
			model: 'game'
		},
		
    },
	
};

