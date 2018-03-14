/**
 * PlayerRewards.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 

module.exports = {

    attributes: {
		
		reason: {
            type: 'string'
        },
		
        force: {
            type: 'string'
        },
		
		game: {
			model: 'game',
		},
		
		player: {
			model: 'player',
		},
		
	},
	
};

