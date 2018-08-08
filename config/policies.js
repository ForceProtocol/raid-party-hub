/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

    MobileAppPlayerController: {
        signupPlayer: true,
		loginPlayer: true,
        activatePlayer: true,
        resetPassword: true,
        validatePin: true,
        changePassword: true,
        sendEmailsToAirdropUsers: true,
        '*': 'playerAuth'
        
    },

    WebPlayerController: {
        signupPlayer: true,
		loginPlayer: true,
        activatePlayer: true,
        resetPassword: true,
        validatePin: true,
        changePassword: true,
        sendEmailsToAirdropUsers: true,
        '*': 'playerAuth'
    },


    WebAdvertiserController: {
        signupUser: true,
        loginUser: true,
        activateUser: true,
        resetPassword: true,
        validatePin: true,
        changePassword: true,
        getGames: true,
        downloadItem: true,
        '*': 'advertiserAuth'
    },


    StudioController: {
        signupStudio: true,
        activateStudio: true,
        loginStudio: true,
        resetPassword: true,
        changePassword: true,
        contact: true,
        '*': 'studioAuth',
    },

    GameController: {
        '*': true
    },

    PlayerController: {
        '*': true
    },
	
	PagesController: {
        '*': true
    }
};
