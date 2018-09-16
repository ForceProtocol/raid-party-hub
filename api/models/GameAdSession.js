/**
 * GameAdSession.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {

        sessionTime: {
            type: 'integer',
            defaultsTo: 0
        },

        spent: {
            type: 'boolean',
            defaultsTo: false
        },

		gameAdAsset: {
            model: 'gameadasset'
        },

        player: {
            model: 'playertogameadsession'
        },

        game: {
            model: 'game'
        },
    },
	
};