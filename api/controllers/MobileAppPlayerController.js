/**
 * MobileAppPlayerController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const BigNumber = require('bignumber.js'), moment = require('moment');
 
module.exports = {
	
	
	/**
	* Sign Up New Player
	*/
	async signupPlayer(req, res) {
	
		let email = req.param("email"),
				password = req.param("password"),
				deviceType = req.param("device_type"),
				deviceId = req.param("device_id"),
				longitude = req.param("lon"),
				latitude = req.param("lat"),
				locale = req.param("locale");
				
        try {
					
			// Validate sent params
			if(!deviceType || !email || !password || !deviceId){
				throw new CustomError(sails.__("You did not provide all signup details required."), {status: 400});
			}
			
			let existingPlayerDevice = await Player.findOne({email: email});

			// Player already exists
            if(existingPlayerDevice){
				throw new CustomError(sails.__("This email is already registered with another account. Please login to your account using the following email: ") + existingPlayerDevice.email, {status: 400});
            }
			
			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			
			// Create new player account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let player = await Player.create({
				email: email,
				password: password,
				deviceType: deviceType,
				deviceId: deviceId,
				pin: pin,
				accountStatus: 1,
				forceBalance: '0',
				latitude: latitude, 
				longitude: longitude
			});
			
			// Create the users wallet
			//WalletService.createUserWallet(player.id).catch(err=>{sails.log.error('On signup, failed to create player wallet: ', err)});
			
			let msg = `Welcome to RaidParty!<br />
				Your account has been created and is now awaiting your activation. Please enter the 6 digit PIN below into the PIN activation screen in the RaidParty mobile app.<br /><br />
				<strong>${pin}</strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;
			
			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
                fromEmail: 'support@raidparty.io',
                fromName: 'Success Team',
                toEmail: player.email,
                toName: player.email,
                subject: 'Welcome to RaidParty! Activate your account to start earning rewards',
                body: msg
            });
			
			if(!locale){
				locale = 'en';
			}
			
			/** Add to normal subscriber list **/
			MailchimpService.addSubscriber("bb2455ea6e", email, "", "", "pending", locale).then(function (addResponse) {
			}).catch(function (err) {
				sails.log.debug("new subscriber not added due to error: ", err);
			});
			
			return res.ok({
                msg: 'Please check your email inbox for a 6 digit pin and enter below to activate your account',
                success: true,
            });

        } catch(err) {
            return util.errorResponse(err, res);
        }
	},
	

	
	/**
	* Login Player
	*/
	async loginPlayer(req, res) {
		try {
            let email = req.param("email"),
				password = req.param("password");
				
			// Validate sent params
			if(!email || !password){
				throw new CustomError('You did not provide all login details required.', {status: 400});
			}

            let player = await Player.findOne({email: email});
			
			// Player does not exist
            if(!player){
				throw new CustomError('That account does not exist, please check the details you entered', {status: 401,err_code:"not_found"});
            }
			
			// Player is activated - try to login
			if(player.accountStatus == 2){
				// Check password matches
				let isValidPassword = await Player.validatePassword(password,player.password);
				
				// Invalid password entered
				if(!isValidPassword){
					sails.log.debug("MobileAppPlayerController.loginPlayer: invalid password given by player.");
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
				}
				
				const rsp = {
					player: player,
					success:true,
					token: jwToken.issue({
					  user: player.toJSON()
					}, "30 days")
				};
				
				return res.ok(rsp);
			}
			
			// Player is blocked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', {status: 403,err_code:"blocked"});
			}
			
			// Player has not activated their account
			if(player.accountStatus == 1){
				throw new CustomError('Your account has not yet been activated. Please check your email for a PIN code and enter to activate your account.', {status: 401,err_code:"activate"});
			}
			
        } catch(err) {
            return util.errorResponse(err, res);
        }
	},
	
	
	/**
	* Activate Player Account - using PIN
	*/
	async activatePlayer(req, res) {
	
		try {
		
			let pin = req.param("pin"),
				email = req.param("email");
				
			// Validate sent params
			if(!pin || !email){
				throw new CustomError('You did not provide all login details required.', {status: 400});
			}
			
			// PIN not long enough
			if(pin.length < 6){
				throw new CustomError('Invalid PIN was provided', {status: 401,err_code:"invalid_pin"});
			}
				
			let player = await Player.findOne({email:email});
			
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Pin does not match
			if(player.pin != pin){
				
				// If too many PIN attempts made, block their account, send email notifying user
				if(player.pinAttempts > 6){
					let updatedPinAttempt = await Player.update({id:player.id},{accountStatus:0});
					
					// Send player an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;
					
					// Send activation email/SMS to player to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: player.email,
						toName: player.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});
			
					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', {status: 403,err_code:"blocked"});
				}
			
				let updatedPinAttempt = await Player.update({id:player.id},{pinAttempts:player.pinAttempts + 1});
				throw new CustomError('The PIN provided was invalid', {status: 401,err_code:"invalid_pin"});
			}
			
			// PIN is correct and player is allowed to enter
			let updatedPinAttempt = await Player.update({id:player.id},{accountStatus:2,pinAttempts:0,pin:0});
			
			const rsp = {
					player: player,
					success:true,
					isValid:true,
					msg: "Success! Your account is now active",
					token: jwToken.issue({
					  user: player.toJSON()
					}, "30 days")
				};
			
			return res.ok(rsp);
			
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	/**
	* Reset Password - forgot their password
	*/
	async resetPassword(req, res) {
	
		try {
			let email = req.param("email");
			
			// Validate sent params
			if(!email){
				throw new CustomError('You did not provide all details required.', {status: 400});
			}
			
			let player = await Player.findOne({email:email});
			
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			
			await Player.update({id:player.id},{pin:pin});
			
			let msg = `Hi,<br />
				You requested a password reset. Please enter the 6 digit PIN below into the PIN activation screen in the RaidParty mobile app to reset your password.<br /><br />
				<strong>${pin}</strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;
			
			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
                fromEmail: 'support@raidparty.io',
                fromName: 'Success Team',
                toEmail: player.email,
                toName: player.email,
                subject: 'Welcome to RaidParty! Reset password requested',
                body: msg
            });
			
			
			return res.ok({
                msg: 'Please check your inbox to find a 6 digit password reset PIN',
                success: true,
            });
			
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	/**
	* Validate a PIN issued
	*/
	async validatePin(req, res) {
		try {
			let pin = req.param("pin"),
				email = req.param("email");
				
			// Validate sent params
			if(!email || !pin){
				throw new CustomError('You did not provide all details required.', {status: 400});
			}
			
			let player = await Player.findOne({email:email});
			
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Pin does not match
			if(player.pin != pin){
				
				// If too many PIN attempts made, block their account, send email notifying user
				if(player.pinAttempts > 5){
					let updatedPinAttempt = await Player.update({id:player.id},{accountStatus:0});
					
					// Send player an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;
					
					// Send activation email/SMS to player to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: player.email,
						toName: player.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});
			
					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', {status: 403,err_code:"blocked"});
				}
			
				let updatedPinAttempt = await Player.update({id:player.id},{pinAttempts:player.pinAttempts + 1});
				throw new CustomError('The PIN provided was invalid', {status: 401,err_code:"invalid_pin"});
			}
			
			// PIN is correct and player is allowed to enter
			return res.ok({"success": true,"isValid": true});
			
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	
	/**
	* Change password after reset request made
	*/
	async changePassword(req, res) {
		try {
			let pin = req.param("pin"),
				email = req.param("email"),
				newPassword = req.param("password");
			
			// Validate sent params
			if(!email || !pin || !newPassword){
				throw new CustomError('You did not provide all details required.', {status: 400});
			}
			
			let player = await Player.findOne({email:email});
			
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Pin does not match
			if(player.pin != pin){
				
				// If too many PIN attempts made, block their account, send email notifying user
				if(player.pinAttempts > 6){
					let updatedPinAttempt = await Player.update({id:player.id},{accountStatus:0});
					
					// Send player an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;
					
					// Send activation email/SMS to player to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: player.email,
						toName: player.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});
			
					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', {status: 403,err_code:"blocked"});
				}
			
				let updatedPinAttempt = await Player.update({id:player.id},{pinAttempts:player.pinAttempts + 1});
				throw new CustomError('The PIN provided was invalid', {status: 401,err_code:"invalid_pin"});
			}
			
			// TODO: Make sure password is valid
			
			// PIN is correct and player can change their password
			let updatedPassword = await Player.update({id:player.id},{password:newPassword,pinAttempts:0,pin:0});
			
			return res.ok({"success": true,"msg": "Your new password has been set, please login to your account"});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get players dashboard
	*/
	async getPlayerDashboard(req, res) {
		try {
			let player = await Player.findOne({id:req.token.user.id});
			
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Player is not active
			if(player.accountStatus == 1){
				throw new CustomError('Your account has not been activated yet. Please check your email', {status: 403,err_code:"activate"});
			}
			
			if(!player.forceBalance){
				player.forceBalance = '0';
			}
			
			// Work out FORCE balance in dollar
			let forceTotal = new BigNumber(player.forceBalance);
			
			player.totalForce = forceTotal.toFormat(6);
			
			player.totalForceUSD = parseInt(forceTotal) * 0.11;
			
			return res.ok({success:true, player:player});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	/**
	* Update players password when logged in
	* Uses Authentication Bearer auth
	*/
	async updatePassword(req, res) {
		try {
			let currentPassword = req.param("current_password"),
				newPassword = req.param("new_password");
				
			// Validate sent params
			if(!currentPassword || !newPassword){
				throw new CustomError('You did not provide all details required.', {status: 400});
			}
			
			if(currentPassword == newPassword){
				throw new CustomError('You entered the same password as your current password', {status: 400});
			}
			
			let player = await Player.findOne({id:req.token.user.id});
						
			// Could not find that account
			if(!player){
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401,err_code:"not_found"});
			}
			
			// Player is locked
			if(player.accountStatus == 0){
				throw new CustomError('Your account has been blocked.', {status: 403,err_code:"blocked"});
			}
			
			// Check current password entered is valid
			let validPassword = await Player.validatePassword(currentPassword,player.password);
			
			// Invalid current password given
			if(!validPassword){
				throw new CustomError('The current password you entered was invalid', {status: 401,err_code:"invalid_password"});
			}
			
			// Current password was correct, enter new password
			let updatedPassword = await Player.update({id:player.id},{password:newPassword});
			
			return res.ok({"success": true,"msg": "Your password has been updated successfully"});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	
	/**
	* Get list of active games
	*/
	async getGames(req, res) {
		try {
			let deviceType = req.param("device_type").toLowerCase(),
			locale = req.param('locale'),
			excludePlatform = 'android',
			game, prizeList, prize, reward, gameItem, platformAvailable,
			rules,
			ruleLocale;
			
			if(deviceType == 'android'){
				excludePlatform = 'ios';
			}
			
			if(!locale){
				locale = 'en';
			}
			
			// Get games we need for this device
			let games = await Game.find({active:true,startDate: {'<=':new Date()},endDate: {'>=':new Date()}}).populate('rewardCampaign').populate('gamePlatforms');
			
			finalGamesList = [];
			for(game of games){
			
				// Go through each platform to check this is available on their platform
				platformAvailable = false;
				for(const platform of game.gamePlatforms){
					if(platform.type == deviceType){
						platformAvailable = true;
						game.link = platform.link;
						game.platform = platform.type;
					}
				}
				
				if(!platformAvailable){
					continue;
				}
				
				// Prepare the prizes list
				prizeList = [];
				for(reward of game.rewardCampaign){
					// TODO: Whether the player has qualified for this reward
					// TODO: ?? Ionic might be fine displaying html ?? Strip HTML out of rules, for display purposes in mobile app
					
					// Reward is not currently live - skip listing it
					if(moment().isSameOrBefore(reward.startDate) || moment().isSameOrAfter(reward.endDate)){
						continue;
					}
					
					// Reward has no more entries available
					if(reward.maxQualifyingPlayers < 1){
						continue;
					}
					
					if(reward.value <= 0){
						continue;
					}
					
					// Ensure we set the correct language for the rules
					rules = util.stringToJson(reward.rules);
					
					if(rules){
						ruleLocale = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
						
						if(!ruleLocale){
							locale = 'en';
							reward.rules = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
							reward.rules = reward.rules['en'];
						}else{
							reward.rules = ruleLocale[locale];
						}
					}
					
					if(!reward.rules){
						reward.rules = rules;
					}
					
					prize = {id:reward.id,value:reward.value,currency:reward.currency,rules:reward.rules,maxQualifyingPlayers:reward.maxQualifyingPlayers,maxWinningPlayers:reward.maxWinningPlayers,startDate:reward.startDate,endDate:reward.endDate};
					prizeList.push(prize);
				}
				
				gameItem = {game_id:game.gameId,title:game.title,reward:game.rewardAvailable,description:game.description,jackpot:game.jackpot,bannerContent:game.bannerContent,link:game.link,platform:game.platform,avatar:game.avatar,prizes:prizeList};
				
				finalGamesList.push(gameItem);
			}
			
			sails.log.debug("Final games list: ",finalGamesList);
			
			return res.ok({games:finalGamesList});
		}catch(err){
			sails.debug.log("this is an err",err);
			return util.errorResponse(err, res);
		}
	},
	
	
	
	/**
	* Get the last 25 rewards
	*/
	async getRewards(req, res) {
		try {
			// Get games we need for this device
			let rewards = await PlayerRewards.find({player:req.token.user.id}).populate("player").populate("game").sort("id DESC").limit("25");
			
			rewards = _.map(rewards, function(reward){
				return {reason:reward.reason,amount:reward.amount,currency:reward.currency,avatar:reward.avatar,link:reward.link,created_at:reward.createdAt,game:{title:reward.game.title}};
			});
			
			return res.ok({rewards:rewards});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	/**
	* Get player code
	*/
	async getPlayerCode(req, res) {
		try {
		
			// Get games we need for this device
			let player = await Player.findOne({id:req.token.user.id});
			
			if(!player){
				throw new CustomError('Could not find that player.', {status: 401,err_code:"not_found"});
			}
			
			if(!player.code || player.code.length == 0 || player.code == ''){
				let playerCode = await PlayerService.generatePlayerSdkCode(player.id,0);
				
				if(!playerCode){
					throw new CustomError('Could not generate a new unique code for that player at this time.', {status: 401,err_code:"server_err"});
				}
				
				player.code = playerCode;
			}
			
			return res.ok({code:player.code});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	/**
	* Get notifications against a player
	*/
	async getNotifications(req, res) {
		try {
		
			// Get games we need for this device
			let player = await Player.findOne({id:req.token.user.id}).populate('notifications', { sort: 'createdAt DESC' });
			
			if(!player){
				throw new CustomError('Could not find that player.', {status: 401,err_code:"not_found"});
			}
			
			return res.ok({notifications:player.notifications});
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	/**
	* Delete a player notification
	*/
	async deleteNotification(req, res) {
		try {
		
			let notificationId = req.param('notification_id');
			
			if(!notificationId){
				throw new CustomError('Could not find that notification.', {status: 401,err_code:"not_found"});
			}
			
			// Get games we need for this device
			let player = await Player.findOne({id:req.token.user.id});
			
			if(!player){
				throw new CustomError('Could not find that player.', {status: 401,err_code:"not_found"});
			}
			
			let deleted = await PlayerNotifications.destroy({players:player.id,id:notificationId});
			
			if(deleted){
				return res.ok({success:true});
			}else{
				return res.ok({success:false});
			}
		}catch(err){
			return util.errorResponse(err, res);
		}
	},
	
	
	
	
};
