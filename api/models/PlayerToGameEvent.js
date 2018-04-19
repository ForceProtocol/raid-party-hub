/**
 * PlayerToGame.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		eventValue: {
			type: 'integer',
			defaultsTo: 0
		},
		
		player: {
			model: 'player'
		},
		
		gameEvent: {
			model: 'gameevent'
		},
		
    },
	
};

