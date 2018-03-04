module.exports.routes = {

	/** Public Routes */
	'GET /': 'PagesController.getHomePage',
	
	/** API Player Routes */
	'GET /player/:playerId': 'PlayerController.getPlayer',
	'POST /player/track': 'PlayerController.trackPlayer',
	'POST /player/reward': 'PlayerController.rewardPlayer',
	
	/** API Developer Routes */
	'GET /developer/:developerId': 'DeveloperController.getDeveloper',
	'POST /developer': 'DeveloperController.signupDeveloper',
	'POST /developer/login': 'DeveloperController.loginDeveloper',
	
	/** Developer Games Management */
	'GET /developer/games': 'DeveloperController.getGames',
	'POST /developer/game': 'DeveloperController.addGame',
	'GET /developer/game/:gameId': 'DeveloperController.getGame',
	
	/** OUR OWN MOBILE APPLICATION API ROUTES **/
	'GET /mob/player/dashboard': 'MobileAppPlayerController.getPlayerDashboard',
	'POST /mob/player/signup': 'MobileAppPlayerController.signupPlayer',
	'POST /mob/player/login': 'MobileAppPlayerController.loginPlayer',
	'POST /mob/player/activate': 'MobileAppPlayerController.activatePlayer',
	'POST /mob/player/reset-password': 'MobileAppPlayerController.resetPassword',
	'POST /mob/player/validate-pin': 'MobileAppPlayerController.validatePin',
	'POST /mob/player/change-password': 'MobileAppPlayerController.changePassword',
	'POST /mob/player/update-password': 'MobileAppPlayerController.updatePassword',
	
};
