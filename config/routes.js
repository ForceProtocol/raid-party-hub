module.exports.routes = {

	/** Public Routes */
	'GET /': 'PagesController.getHomePage',
	
	
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
	'POST /app/developer/activate': 'DeveloperController.activateDeveloper',
	'POST /app/developer/reset-password': 'DeveloperController.resetPassword',
	'POST /app/developer/change-password': 'DeveloperController.changePassword',
	'POST /app/developer/update-password': 'DeveloperController.updatePassword',
	
	
	/** API Player Routes */
	'GET /sdk/player/:playerId': 'PlayerController.getPlayer',
	'POST /sdk/player/track/device': 'PlayerController.trackPlayerDevice',
	'POST /sdk/player/track/email': 'PlayerController.trackPlayerEmail',
	'POST /sdk/player/reward/device': 'PlayerController.rewardPlayerDevice',
	'POST /sdk/player/reward/email': 'PlayerController.rewardPlayerEmail',
	
	
	/** OUR OWN MOBILE APPLICATION API ROUTES **/
	'GET /mob/player/dashboard': 'MobileAppPlayerController.getPlayerDashboard',
	'GET /mob/player/games': 'MobileAppPlayerController.getGames',
	'GET /mob/player/rewards': 'MobileAppPlayerController.getRewards',
	'GET /mob/player/game/code': 'MobileAppPlayerController.getPlayerGameCode',
	'POST /mob/player/signup': 'MobileAppPlayerController.signupPlayer',
	'POST /mob/player/login': 'MobileAppPlayerController.loginPlayer',
	'POST /mob/player/activate': 'MobileAppPlayerController.activatePlayer',
	'POST /mob/player/reset-password': 'MobileAppPlayerController.resetPassword',
	'POST /mob/player/validate-pin': 'MobileAppPlayerController.validatePin',
	'POST /mob/player/change-password': 'MobileAppPlayerController.changePassword',
	'POST /mob/player/update-password': 'MobileAppPlayerController.updatePassword',
	
};
