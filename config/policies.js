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
        getPlayerDashboard: 'tokenAuth',
        getGames: 'tokenAuth',
        getPlayerCode: 'tokenAuth',
        getRewards: 'tokenAuth',
        updatePassword: 'tokenAuth',
        getNotifications: 'tokenAuth',
        deleteNotification: 'tokenAuth',
        deviceData: 'tokenAuth',
        
    },

    WebPlayerController: {
        signupPlayer: true,
		loginPlayer: true,
        activatePlayer: true,
        resetPassword: true,
        validatePin: true,
        changePassword: true,
        sendEmailsToAirdropUsers: true,
        getPlayerDashboard: 'tokenAuth',
        getGames: 'tokenAuth',
        getPlayerCode: 'tokenAuth',
        getRewards: 'tokenAuth',
        updatePassword: 'tokenAuth',
        getNotifications: 'tokenAuth',
        deleteNotification: 'tokenAuth',
        deviceData: 'tokenAuth',
        trackRewardProgress: 'tokenAuth',
        getPlayerGames: 'tokenAuth',
        getPlayer: 'tokenAuth',
        getProducts: 'tokenAuth',
        getProduct: 'tokenAuth',
        confirmPlayerOrder: 'tokenAuth',
    },


    WebAdvertiserController: {
        signupUser: true,
        loginUser: true,
        activateUser: true,
        resetPassword: true,
        validatePin: true,
        changePassword: true,
        getGames: true,
        updatePassword: 'tokenAuth',
        getUser: 'tokenAuth',
        getNotifications: 'tokenAuth',
        deleteNotification: 'tokenAuth',
        getUserGames: 'tokenAuth',
        uploadAsset: 'tokenAuth',
        createCampaign: 'tokenAuth',
        getCampaigns: 'tokenAuth',
        deleteCampaign: 'tokenAuth',
        archiveCampaign: 'tokenAuth',
        activateCampaign: 'tokenAuth',
        downloadItem: true
    },


    DeveloperController: {
        '*': 'isDeveloper',
        signupDeveloper: true,
        activateDeveloper: true,
        loginDeveloper: true,
        resetPassword: true,
        changePassword: true,
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
