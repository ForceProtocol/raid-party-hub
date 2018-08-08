module.exports.routes = {

	/** Public Routes */
	'GET /': 'PagesController.getHomePage',
	'POST /app/subscribe': 'PagesController.postSubscribe',
	'GET /players/count': 'PlayerController.getPlayerCount',
	'GET /games/active': 'GameController.getActiveGames',
	'GET /game/:gameId': 'GameController.getGame',
	'GET /game/game-assets/:gameId': 'GameController.getGameAssets',
	'POST /web/contact' : 'PagesController.contact',


	/** Studio Auth */
	'POST /studio/signup': 'studioController.signupStudio',
	'POST /studio/activate': 'StudioController.activateStudio',
	'POST /studio/login': 'StudioController.loginStudio',
	'POST /studio/reset-password': 'StudioController.resetPassword',
	'POST /studio/change-password': 'StudioController.changePassword',
	'POST /studio/update-password': 'StudioController.updatePassword',
	'POST /studio/update-password': 'StudioController.updatePassword',
	'POST /studio/contact': 'StudioController.contact',
	
	/** Studio Objects */
	'GET /studio/games': 'StudioController.getGames',
	'GET /studio/game/:gameId': 'StudioController.getGame',
	'GET /studio/balance': 'StudioController.getBalance',
	'POST /studio/game': 'StudioController.addGame',
	'POST /studio/game/:gameId': 'StudioController.updateGame',
	'DELETE /studio/game/:gameId': 'StudioController.deleteGame',


	/** Player Routes */
	'POST /app/player': 'PlayerController.signupPlayer',


	/** SDK PLAYER ROUTES */
	'POST /sdk/player/track': 'PlayerController.trackPlayer',
	'POST /sdk/game/event': 'PlayerController.trackEvent',


	/** SDK DYNAMIC ADVERTISEMENT SOCKET ROUTES */
	'GET /sdk/advert/connect/:gameId/:gameAssetId': 'DynamicAdvertController.connectGame',
	'GET /sdk/advert/load/:gameId/:gameAssetId': 'DynamicAdvertController.getLiveAdverts',
	'GET /sdk/advert/connect/test': 'DynamicAdvertController.testConnectGame',
	'POST /sdk/advert/session-end/:gameId/:gameAdAssetId': 'DynamicAdvertController.sessionEnd',


	/** OUR OWN MOBILE APPLICATION API ROUTES **/
	'GET /mob/player/dashboard': 'MobileAppPlayerController.getPlayerDashboard',
	'GET /mob/player/code': 'MobileAppPlayerController.getPlayerCode',
	'GET /mob/player/games': 'MobileAppPlayerController.getGames',
	'GET /mob/player/rewards': 'MobileAppPlayerController.getRewards',
	'GET /mob/player/notifications': 'MobileAppPlayerController.getNotifications',
	'POST /mob/player/notification/delete': 'MobileAppPlayerController.deleteNotification',
	'POST /mob/player/signup': 'MobileAppPlayerController.signupPlayer',
	'POST /mob/player/login': 'MobileAppPlayerController.loginPlayer',
	'POST /mob/player/activate': 'MobileAppPlayerController.activatePlayer',
	'POST /mob/player/reset-password': 'MobileAppPlayerController.resetPassword',
	'POST /mob/player/validate-pin': 'MobileAppPlayerController.validatePin',
	'POST /mob/player/change-password': 'MobileAppPlayerController.changePassword',
	'POST /mob/player/update-password': 'MobileAppPlayerController.updatePassword',
	'POST /mob/player/device-data': 'MobileAppPlayerController.deviceData',

	/** OUR OWN WEB APPLICATION API ROUTES **/
	'GET /web/player': 'WebPlayerController.getPlayer',
	'GET /web/player/dashboard': 'WebPlayerController.getPlayerDashboard',
	'GET /web/player/code': 'WebPlayerController.getPlayerCode',
	'GET /web/player/games': 'WebPlayerController.getGames',
	'GET /web/player/rewards': 'WebPlayerController.getRewards',
	'GET /web/player/notifications': 'WebPlayerController.getNotifications',
	'GET /web/player/products': 'WebPlayerController.getProducts',
	'GET /web/player/product/:productId': 'WebPlayerController.getProduct',
	'POST /web/player/notification/delete': 'WebPlayerController.deleteNotification',
	'POST /web/player/signup': 'WebPlayerController.signupPlayer',
	'POST /web/player/login': 'WebPlayerController.loginPlayer',
	'POST /web/player/activate': 'WebPlayerController.activatePlayer',
	'POST /web/player/reset-password': 'WebPlayerController.resetPassword',
	'POST /web/player/validate-pin': 'WebPlayerController.validatePin',
	'POST /web/player/change-password': 'WebPlayerController.changePassword',
	'POST /web/player/update-password': 'WebPlayerController.updatePassword',
	'POST /web/player/device-data': 'WebPlayerController.deviceData',
	'POST /web/player/confirm-order': 'WebPlayerController.confirmPlayerOrder',
	'GET /player/trackProgress': 'WebPlayerController.trackRewardProgress',
	'GET /player/playerGames': 'WebPlayerController.getPlayerGames',


	/** OUR OWN WEB APPLICATION API ROUTES FOR ADVERTISERS **/
	'GET /web/advertiser': 'WebAdvertiserController.getUser',
	'GET /web/advertiser/games': 'WebAdvertiserController.getUserGames',
	'GET /web/advertiser-games': 'WebAdvertiserController.getGames',
	'GET /web/advertiser/campaigns': 'WebAdvertiserController.getCampaigns',
	'GET /web/advertiser/campaign/:gameAdAssetId': 'WebAdvertiserController.getCampaign',
	'GET /web/advertiser/download': 'WebAdvertiserController.downloadItem',
	'POST /web/advertiser/signup': 'WebAdvertiserController.signupUser',
	'POST /web/advertiser/login': 'WebAdvertiserController.loginUser',
	'POST /web/advertiser/activate': 'WebAdvertiserController.activateUser',
	'POST /web/advertiser/reset-password': 'WebAdvertiserController.resetPassword',
	'POST /web/advertiser/validate-pin': 'WebAdvertiserController.validatePin',
	'POST /web/advertiser/change-password': 'WebAdvertiserController.changePassword',
	'POST /web/advertiser/update-password': 'WebAdvertiserController.updatePassword',
	'POST /web/advertiser/upload/asset/:type': 'WebAdvertiserController.uploadAsset',
	'POST /web/advertiser/create-campaign': 'WebAdvertiserController.createCampaign',
	'POST /web/advertiser/update-campaign/:gameAdAssetId': 'WebAdvertiserController.updateCampaign',
	'POST /web/advertiser/campaign/archive': 'WebAdvertiserController.archiveCampaign',
	'POST /web/advertiser/campaign/delete': 'WebAdvertiserController.deleteCampaign',
	'POST /web/advertiser/campaign/activate': 'WebAdvertiserController.activateCampaign',
	'POST /web/advertiser/campaign/file/delete': 'WebAdvertiserController.deleteFile',
	

	// Routes to send the notification to pre registerd users.
	'GET /airdrop-users-send-email': 'MobileAppPlayerController.sendEmailsToAirdropUsers',
	'GET /generate-player-code-send-email': 'MobileAppPlayerController.sendEmailsToPlayersWithoutCode',
	'GET /activate-players': 'MobileAppPlayerController.activatePlayers',
};
