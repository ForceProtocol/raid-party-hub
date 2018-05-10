module.exports.routes = {

	/** Public Routes */
	'GET /': 'PagesController.getHomePage',
	'POST /app/subscribe': 'PagesController.postSubscribe',
	'GET /players/count': 'PlayerController.getPlayerCount',
	'GET /games/active': 'GameController.getActiveGames',
	'GET /game/:gameId': 'GameController.getGame',
	
	/** Developer Login and Signups */
	'POST /app/developer': 'DeveloperController.signupDeveloper',
	'GET /app/developer/activate': 'DeveloperController.activateDeveloper',
	'POST /app/developer/login': 'DeveloperController.loginDeveloper',
	/** API Player Routes 
	'GET /player/:playerId': 'PlayerController.getPlayer',
	'POST /player/track': 'PlayerController.trackPlayer',
	'POST /player/reward': 'PlayerController.rewardPlayer',
	
	/** Developer Games Management */
	'GET /app/developer/games': 'DeveloperController.getGames',
	'GET /app/developer/game/:gameId': 'DeveloperController.getGame',
	'GET /app/developer/balance': 'DeveloperController.getBalance',
	'POST /app/developer/game': 'DeveloperController.addGame',
	'POST /app/developer/game/:gameId': 'DeveloperController.updateGame',
	'DELETE /app/developer/game/:gameId': 'DeveloperController.deleteGame',
	'POST /app/developer/reset-password': 'DeveloperController.resetPassword',
	'POST /app/developer/change-password': 'DeveloperController.changePassword',
	'POST /app/developer/update-password': 'DeveloperController.updatePassword',
	
	
	/** Player Routes */
	'POST /app/player': 'PlayerController.signupPlayer',
	
	
	/** SDK PLAYER ROUTES */
	'POST /sdk/player/track': 'PlayerController.trackPlayer',
	'POST /sdk/game/event': 'PlayerController.trackEvent',
	
	
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


	// Routes to send the notification to pre registerd users.
	'GET /airdrop-users-send-email': 'MobileAppPlayerController.sendEmailsToAirdropUsers',
	'GET /generate-player-code-send-email': 'MobileAppPlayerController.sendEmailsToPlayersWithoutCode',
	'GET /activate-players': 'MobileAppPlayerController.activatePlayers',
};
