/**
 * StudioController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const fs = require("fs"),
BigNumber = require('bignumber.js');


module.exports = {


	/**
	* Sign Up New Studio
	*/
	async signupStudio(req, res) {

		try {
			let email = req.param("email"),
				password = req.param("password"),
				firstName = req.param("firstName"),
				lastName = req.param("lastName"),
				companyName = req.param("companyName"),
				telephone = req.param("telephone"),
				captcha = req.param("captcha");


			if(!captcha){
				throw new CustomError("You must click the captcha checkbox.", { status: 400 });
			}

			// Validate firstname params
			if (!email || !password) {
				throw new CustomError("You did not provide all signup details required.", { status: 400 });
			}

			let existingUser = await Studio.findOne({ email: email });

			// Player already exists
			if (existingUser) {
				throw new CustomError("This email is already registered with another account. Please login to your account using the following email: " + existingUser.email, { status: 400 });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			// Create new player account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let studio = await Studio.create({
				studioName:companyName,
				firstName:firstName,
				lastName:lastName,
				telephone:telephone,
				email: email,
				password: password,
				pin: pin,
				accountStatus: 1,
			});


			let okMsg, subject, msg;

			// await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: [deviceId], text: pin + " is your activation pin" });
			okMsg = "Please check your email inbox for an activation link to access your account.";
			subject = "Welcome to RaidParty! Activate your account to start promoting your game";
			activationLink = `${sails.config.STUDIOS_APP_HOST}/activate-account?studioId=${studio.id}&pin=${pin}&email=${email}`;
			msg = `Welcome to RaidParty!<br /><br />
				Your studio account has been created and is now awaiting your activation. Please click on the link below to activate your account.<br /><br />
				<strong><a href=\"${activationLink}\">Activate Account</a></strong><br /><br />
				<br />
				The RaidParty Team`;


			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: studio.email,
				toName: studio.email,
				subject: subject,
				body: msg
			});
			

			// Send email to office about new studio signup
			msg = `New game studio signed up:<br />
				email: ${email}<br />
				Company Name: ${companyName}<br />
				Telephone: ${telephone}<br />
				Name: ${firstName} ${lastName}`;

			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: "pete@triforcetokens.io",
				toName: "Pete",
				subject: "New Studio Signed Up: studios.raidparty.io",
				body: msg
			});

			return res.ok({
				msg: okMsg,
				success: true,
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Login Studio
	*/
	async loginStudio(req, res) {
		try {
			let email = req.param("email"),
				password = req.param("password");

			// Validate sent params
			if (!email || !password) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			let studio = await Studio.findOne({ email: email });

			// studio does not exist
			if (!studio) {
				throw new CustomError('That account does not exist, please check the details you entered', { status: 401, err_code: "not_found" });
			}

			// Studio is activated - try to login
			if (studio.accountStatus == 2) {
				// Check password matches
				let isValidPassword = await Studio.validatePassword(password, studio.password);

				// Invalid password entered
				if (!isValidPassword) {
					sails.log.debug("StudioController.loginstudio: invalid password given by studio.");
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}

				const rsp = {
					user: studio,
					success: true,
					token: jwToken.issue({
						user: studio.toJSON()
					}, "30 days")
				};

				return res.ok(rsp);
			}

			// studio is blocked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', { status: 403, err_code: "blocked" });
			}

			// studio has not activated their account
			if (studio.accountStatus == 1) {
				throw new CustomError('Your account has not yet been activated. Please check your email for an activation link.', { status: 401, err_code: "activate" });
			}

			return res.error();

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Submit the contact form
	*/
	async contact(req, res) {

		try{
			let name = req.param('name'),
			email = req.param('email'),
			telephone = req.param('telephone'),
			message = req.param('message'),
			captcha = req.param('captcha');
			
			if(!name){
				name = '';
			}

			if(!captcha){
				throw new CustomError('You must complete the captcha box.', {status: 400});
			}
			
			if(!email){
				throw new CustomError('An invalid email was provided.', {status: 400});
			}

			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Support Team',
				toEmail: email,
				toName: name,
				subject: "Thank you for your enquiry",
				body: `You submitted a message to us at https://studios.raidparty.io regarding creating revenue with your game.<br />
					This is a notification that we have received your message and will be in touch soon.<br /><br />
					Kindest Regards<br />
					The RaidParty Team`
			});

			let emailMsg = `Their email: ${email}<br />
			Name: ${name}<br />
			Telephone: ${telephone}<br />
			Message: ${message}`;

			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Support Team',
				toEmail: 'pete@triforcetokens.io',
				toName: 'Pete',
				subject: "New studios.raidparty.io enquiry",
				body: emailMsg
			});

			return res.ok({
				success: true,
			});
		
		}
		catch(err){
			sails.log.debug("StudioController.contact err: ",err);
			return res.error();
		}
    },


	/**
	* Activate studio Account - using PIN
	*/
	async activateStudio(req, res) {

		try {

			let pin = req.param("pin"),
				email = req.param("email"),
				studioId = req.param("userId");

			// Validate sent params
			if (!pin || !studioId) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			// PIN not long enough
			if (pin.length < 6) {
				throw new CustomError('Invalid PIN was provided', { status: 401, err_code: "invalid_pin" });
			}

			let studio = await Studio.findOne({ id: studioId, email:email });

			// Could not find that account
			if (!studio) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Player is locked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (studio.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (studio.pinAttempts > 6) {
					let updatedPinAttempt = await Studio.update({ id: studio.id }, { accountStatus: 0 });
					let okMsg, subject, msg;

					subject = "Your RaidParty account has been locked";
					msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty team`;

					// Send activation email/SMS to studio to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: studio.email,
						toName: studio.email,
						subject: subject,
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Studio.update({ id: studio.id }, { pinAttempts: studio.pinAttempts + 1 });
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}

			// PIN is correct and studio is allowed to enter
			let updatedPinAttempt = await Studio.update({ id: studio.id }, { accountStatus: 2, pinAttempts: 0, pin: 0 });

			okMsg = "Success! Your account is now active";

			const rsp = {
				user: studio,
				success: true,
				isValid: true,
				msg: okMsg,
				token: jwToken.issue({
					user: studio.toJSON()
				}, "60 days")
			};

			return res.ok(rsp);

		} catch (err) {
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
			if (!email) {
				throw new CustomError('You did not provide all details required.', { status: 400 });
			}

			let studio = await Studio.findOne({ email: email });

			// Could not find that account
			if (!studio) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Studio is locked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);

			await Studio.update({ id: studio.id }, { pin: pin });

			let activationLink = sails.config.STUDIOS_APP_HOST + "change-password?studio=" + studio.id + "&pin=" + pin;

			let msg = `Welcome to RaidParty!<br />
				A password reset request was made. Please visit the link below to update your password.<br /><br />
				<strong><a href=\"${activationLink}\">${activationLink}</a></strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;

			// Send activation email/SMS to studio to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: studio.email,
				toName: studio.email,
				subject: 'Reset password requested for your RaidParty account',
				body: msg
			})



			return res.ok({
				msg: 'Please check your inbox to find a 6 digit password reset PIN',
				success: true,
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Change password after reset request made
	*/
	async changePassword(req, res) {
		try {
			let pin = req.param("pin"),
				studioId = req.param("studio"),
				newPassword = req.param("password");

			// Validate sent params
			if (!studioId || !pin || !newPassword) {
				throw new CustomError('You did not provide all details required.', { status: 400 });
			}

			let studio = await Studio.findOne({ id: studioId });

			// Could not find that account
			if (!studio) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// studio is locked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (studio.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (studio.pinAttempts > 6) {
					let updatedPinAttempt = await Studio.update({ id: studio.id }, { accountStatus: 0 });

					// Send studio an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;

					// Send activation email/SMS to studio to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: studio.email,
						toName: studio.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Studio.update({ id: studio.id }, { pinAttempts: studio.pinAttempts + 1 });
				throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
			}

			// TODO: Make sure password is valid

			// PIN is correct and studio can change their password
			let updatedPassword = await Studio.update({ id: studio.id }, { password: newPassword, pinAttempts: 0, pin: 0 });

			return res.ok({ "success": true, "msg": "Your new password has been set, please login to your account" });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get studio games
	*/
	async getGames(req, res) {
		try {
			let studio = req.token.user,
				active = req.param("active"),
				archived = req.param("archived");

			if(!active || active === 'false'){
				active = false;
			}else{
				active = true;
			}

			if(!archived || archived === 'false'){
				archived = false;
			}else{
				archived = true;
			}

			let games = await Game.find({studio:studio.id,active:active,archived:archived }).populate("gamePlatforms").populate("gameAdAsset").populate("gameAsset");

			return res.ok(games);
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get studio balance
	*/
	async getBalance(req, res) {
		try {
			let studio = req.token.user;

			if (!studio.forceBalance) {
				studio.forceBalance = '0';
			}

			// Work out FORCE balance in dollar
			let forceTotal = new BigNumber(studio.forceBalance);

			studio.totalForce = forceTotal.toFormat(6);

			studio.totalForceUSD = parseInt(forceTotal) * 0.11;

			return res.ok({ totalForce: studio.totalForce, totalForceUsd: studio.totalForceUSD });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Add game
	*/
	async addGame(req, res) {
		try {
			let studio = req.token.user,
				title = req.param("title"),
				description = req.param("description"),
				avatar = req.param("avatar"),
				age = req.param("age"),
				male = req.param("male"),
				female = req.param("female"),
				regions = req.param("regions"),
				mau = req.param("mau"),
				pc = req.param("pc"),
				mac = req.param("mac"),
				console = req.param("console"),
				android = req.param("android"),
				ios = req.param("ios"),
				pcLink = req.param("pcLink"),
				macLink = req.param("macLink"),
				androidLink = req.param("androidLink"),
				consoleLink = req.param("consoleLink"),
				iosLink = req.param("iosLink");

			// Ensure at least one asset was uploaded
			if(!avatar){
				throw new CustomError('You must provide at least one game screenshot', { status: 401, err_code: "not_found" });
			}

			if(pcLink && pcLink.startsWith("www.")){
				pcLink = "https://" + pcLink;
			}

			if(macLink && macLink.startsWith("www.")){
				macLink = "https://" + macLink;
			}

			if(consoleLink && consoleLink.startsWith("www.")){
				consoleLink = "https://" + consoleLink;
			}

			if(androidLink && androidLink.startsWith("www.")){
				androidLink = "https://" + androidLink;
			}

			if(iosLink && iosLink.startsWith("www.")){
				iosLink = "https://" + iosLink;
			}

			let game = await Game.create({studio:studio.id,active:true,archived:false,dynamicAdsEnabled:false,title:title,dynamicAdsDescription:description,
				description:description,avatar:avatar,regions:regions,age:age,monthlyActiveUsers:mau,male:male,female:female});

			if (!game) {
				throw new CustomError('Could not save that game', { status: 401, err_code: "not_found" });
			}



			// Remove an any old platform links if a new link was provided,
			// or if the user decided not to have any link, remove all links of this type
			if(!pcLink){
				pcLink = "";
				await GamePlatforms.destroy({game:game.id,type:'pc'});
			}else if(pcLink){
				await GamePlatforms.destroy({game:game.id,type:'pc',link:{'!':pcLink}});
			}

			if(!macLink){
				macLink = "";
				await GamePlatforms.destroy({game:game.id,type:'mac'});
			}else if(macLink){
				await GamePlatforms.destroy({game:game.id,type:'mac',link:{'!':macLink}});
			}

			if(!consoleLink){
				consoleLink = "";
				await GamePlatforms.destroy({game:game.id,type:'console'});
			}else if(consoleLink){
				await GamePlatforms.destroy({game:game.id,type:'console',link:{'!':consoleLink}});
			}

			if(!androidLink){
				androidLink = "";
				await GamePlatforms.destroy({game:game.id,type:'android'});
			}else if(androidLink){
				await GamePlatforms.destroy({game:game.id,type:'android',link:{'!':androidLink}});
			}

			if(!iosLink){
				iosLink = "";
				await GamePlatforms.destroy({game:game.id,type:'ios'});
			}else if(iosLink){
				await GamePlatforms.destroy({game:game.id,type:'ios',link:{'!':iosLink}});
			}


			// Insert platform links if a valid link is provided or empty string
			if(pc && (GameService.isValidUrl(pcLink) || pcLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('pc');

				let createGamePlatform = await GamePlatforms.findOrCreate({game:game.id,type:'pc',link:pcLink},
					{game:game.id,type:'pc',fontAwesome:fontAwesomeCode,link:pcLink,
					isCountrySpecific:false,active:true});
			}

			if(mac && (GameService.isValidUrl(macLink) || macLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('mac');

				await GamePlatforms.findOrCreate({game:game.id,type:'mac',link:macLink},
					{game:game.id,type:'mac',fontAwesome:fontAwesomeCode,link:macLink,
					isCountrySpecific:false,active:true});
			}

			if(console && (GameService.isValidUrl(consoleLink) || consoleLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('console');

				await GamePlatforms.findOrCreate({game:game.id,type:'console',link:consoleLink},
					{game:game.id,type:'console',fontAwesome:fontAwesomeCode,link:consoleLink,
					isCountrySpecific:false,active:true});
			}

			if(android && (GameService.isValidUrl(androidLink) || androidLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('android');

				await GamePlatforms.findOrCreate({game:game.id,type:'android',link:androidLink},
					{game:game.id,type:'android',fontAwesome:fontAwesomeCode,link:androidLink,
					isCountrySpecific:false,active:true});
			}

			if(ios && (GameService.isValidUrl(iosLink) || iosLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('ios');

				await GamePlatforms.findOrCreate({game:game.id,type:'ios',link:iosLink},
					{game:game.id,type:'ios',fontAwesome:fontAwesomeCode,link:iosLink,
					isCountrySpecific:false,active:true});
			}



			// Send studio an email that their account has been blocked
			let msg = `A Studio has uploaded a new game to review<br />
			Studio ID: ${studio.id}<br />
			Game ID: ${game.id}<br />
			Title: ${title}<br />
			MAU: ${mau}<br />
			Description: ${description}<br />`;

			// Send activation email/SMS to studio to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Account Team',
				toEmail: 'pete@triforcetokens.io',
				toName: 'Pete',
				subject: 'Studio Uploaded A New Game studios.raidparty.io',
				body: msg
			});

			return res.ok({success:true,game:game});

		}catch(err){
			sails.log.error("StudioController.addGame error: ",err);
			return util.errorResponse(err, res);
		}
	},


	/**
	* Update game
	*/
	/**
	* Add game
	*/
	async updateGame(req, res) {
		try {
			let studio = req.token.user,
				gameId = req.param("gameId"),
				title = req.param("title"),
				description = req.param("description"),
				avatar = req.param("avatar"),
				age = req.param("age"),
				male = req.param("male"),
				female = req.param("female"),
				regions = req.param("regions"),
				mau = req.param("mau"),
				pc = req.param("pc"),
				mac = req.param("mac"),
				console = req.param("console"),
				android = req.param("android"),
				ios = req.param("ios"),
				pcLink = req.param("pcLink"),
				macLink = req.param("macLink"),
				androidLink = req.param("androidLink"),
				consoleLink = req.param("consoleLink"),
				iosLink = req.param("iosLink");


			// Ensure at least one asset was uploaded
			if(!avatar){
				throw new CustomError('You must provide at least one game screenshot', { status: 401, err_code: "not_found" });
			}

			if(pcLink && pcLink.startsWith("www.")){
				pcLink = "https://" + pcLink;
			}

			if(macLink && macLink.startsWith("www.")){
				macLink = "https://" + macLink;
			}

			if(consoleLink && consoleLink.startsWith("www.")){
				consoleLink = "https://" + consoleLink;
			}

			if(androidLink && androidLink.startsWith("www.")){
				androidLink = "https://" + androidLink;
			}

			if(iosLink && iosLink.startsWith("www.")){
				iosLink = "https://" + iosLink;
			}

			let game = await Game.update({id:gameId,studio:studio.id},{dynamicAdsEnabled:false,title:title,dynamicAdsDescription:description,
				description:description,avatar:avatar,regions:regions,age:age,monthlyActiveUsers:mau,monthlyImpressions:mau,male:male,female:female});

			if (!game) {
				throw new CustomError('Could not update that game', { status: 401, err_code: "not_found" });
			}

			// Prepare request to destroy multiple platform links
			let fontAwesomeCode = '';

			// Remove an any old platform links if a new link was provided,
			// or if the user decided not to have any link, remove all links of this type
			if(!pcLink){
				pcLink = "";
				await GamePlatforms.destroy({game:game[0].id,type:'pc'});
			}else if(pcLink){
				await GamePlatforms.destroy({game:game[0].id,type:'pc',link:{'!':pcLink}});
			}

			if(!macLink){
				macLink = "";
				await GamePlatforms.destroy({game:game[0].id,type:'mac'});
			}else if(macLink){
				await GamePlatforms.destroy({game:game[0].id,type:'mac',link:{'!':macLink}});
			}

			if(!consoleLink){
				consoleLink = "";
				await GamePlatforms.destroy({game:game[0].id,type:'console'});
			}else if(consoleLink){
				await GamePlatforms.destroy({game:game[0].id,type:'console',link:{'!':consoleLink}});
			}

			if(!androidLink){
				androidLink = "";
				await GamePlatforms.destroy({game:game[0].id,type:'android'});
			}else if(androidLink){
				await GamePlatforms.destroy({game:game[0].id,type:'android',link:{'!':androidLink}});
			}

			if(!iosLink){
				iosLink = "";
				await GamePlatforms.destroy({game:game[0].id,type:'ios'});
			}else if(iosLink){
				await GamePlatforms.destroy({game:game[0].id,type:'ios',link:{'!':iosLink}});
			}


			// Insert platform links if a valid link is provided or empty string
			if(pc && (GameService.isValidUrl(pcLink) || pcLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('pc');

				let createGamePlatform = await GamePlatforms.findOrCreate({game:game[0].id,type:'pc',link:pcLink},
					{game:game[0].id,type:'pc',fontAwesome:fontAwesomeCode,link:pcLink,
					isCountrySpecific:false,active:true});
			}

			if(mac && (GameService.isValidUrl(macLink) || macLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('mac');

				await GamePlatforms.findOrCreate({game:game[0].id,type:'mac',link:macLink},
					{game:game[0].id,type:'mac',fontAwesome:fontAwesomeCode,link:macLink,
					isCountrySpecific:false,active:true});
			}

			if(console && (GameService.isValidUrl(consoleLink) || consoleLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('console');

				await GamePlatforms.findOrCreate({game:game[0].id,type:'console',link:consoleLink},
					{game:game[0].id,type:'console',fontAwesome:fontAwesomeCode,link:consoleLink,
					isCountrySpecific:false,active:true});
			}

			if(android && (GameService.isValidUrl(androidLink) || androidLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('android');

				await GamePlatforms.findOrCreate({game:game[0].id,type:'android',link:androidLink},
					{game:game[0].id,type:'android',fontAwesome:fontAwesomeCode,link:androidLink,
					isCountrySpecific:false,active:true});
			}

			if(ios && (GameService.isValidUrl(iosLink) || iosLink == '')){
				fontAwesomeCode = GameService.getPlatformFontAwesome('ios');

				await GamePlatforms.findOrCreate({game:game[0].id,type:'ios',link:iosLink},
					{game:game[0].id,type:'ios',fontAwesome:fontAwesomeCode,link:iosLink,
					isCountrySpecific:false,active:true});
			}

			return res.ok({success:true,game:game[0]});

		}catch(err){
			sails.log.error("StudioController.updateGame error: ",err);
			return util.errorResponse(err, res);
		}
	},




	/**
	* Delete game
	*/
	async deleteGame(req, res) {
		try {
			let studio = req.token.user;

			let gameId = req.param("gameId"),
				gameTitle = req.param("title");

			let game = await Game.findOne({ id: gameId, studio: studio.id });

			if (!game) {
				throw new CustomError('You do not have relevant permissions to delete that game.', { status: 501 });
			}

			// Invalid game title entered - to confirm deletion
			if (game.title != gameTitle) {
				throw new CustomError('You entered the game title incorrectly, that game could not be deleted. Please check the game title and try again.', { status: 400 });
			}

			let gameDeleted = await Game.destroy({ id: game.gameId });

			if (!gameDeleted) {
				throw new CustomError('There was a technical problem while deleting the game.', { status: 400 });
			}

			return res.ok({ success: true });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get game data
	*/
	async getGame(req, res) {
		try {
			let studio = req.token.user,
				gameId = req.param("gameId");

			let game = await Game.findOne({ id: gameId, studio: studio.id }).populate("gamePlatforms").populate("gameAsset");

			if (!game) {
				throw new CustomError('That game could not be found.', { status: 400 });
			}

			return res.ok(game);
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Update studios password when logged in
	* Uses Authentication Bearer auth
	*/
	async updatePassword(req, res) {
		try {
			let currentPassword = req.param("currentPassword"),
				newPassword = req.param("newPassword");

			// Validate sent params
			if (!currentPassword || !newPassword) {
				throw new CustomError('You did not provide all details required.', { status: 400 });
			}

			if (currentPassword == newPassword) {
				throw new CustomError('You entered the same password as your current password', { status: 400 });
			}

			let studio = await Studio.findOne({ id: req.token.user.id });

			// Could not find that account
			if (!studio) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// studio is locked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Check current password entered is valid
			let validPassword = await Studio.validatePassword(currentPassword, studio.password);

			// Invalid current password given
			if (!validPassword) {
				throw new CustomError('The current password you entered was invalid', { status: 401, err_code: "invalid_password" });
			}

			// Current password was correct, enter new password
			let updatedPassword = await Studio.update({ id: studio.id }, { password: newPassword });

			return res.ok({ "success": true, "msg": "Your password has been updated successfully" });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	async uploadGameImage(req, res) {
		try {

			let fileType = req.param("type"),
			uploadPath = 'assets/images/games/banners';

			req.file('asset').upload({
			  	dirname: require('path').resolve(sails.config.appPath, uploadPath),
			  	//saveAs: newFileName, /* optional. default file name */
				maxBytes: 250 * 1024 * 1024 //250 MB
			}, function (err, uploadedFiles) {
				if (err){
					return res.serverError(err);
				}

				if(uploadedFiles[0].fd.lastIndexOf("/") !== -1){
					newFileName = uploadedFiles[0].fd.substring(uploadedFiles[0].fd.lastIndexOf("/") + 1);
				}else if(uploadedFiles[0].fd.lastIndexOf("\\") !== -1){
					newFileName = uploadedFiles[0].fd.substring(uploadedFiles[0].fd.lastIndexOf("\\") + 1)
				}

				return res.ok({
					success: true,
					fileName: newFileName
				});
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	async pauseGameAdverts(req,res){
		try {
			let studio = req.token.user,
				gameId = req.param("gameId");

			let game = await Game.findOne({ id: gameId, studio: studio.id }).populate("gameAsset");

			if (!game) {
				throw new CustomError('That game could not be found.', { status: 400 });
			}

			let pausedGameAdverts = await GameAdAsset.update({game:game.id},{approved:false});

			return res.ok(pausedGameAdverts);
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	async archiveGame(req,res){
		try{
			let gameId = req.param("gameId"),
			archived = req.param("archived"),
			studio = req.token.user,
			updateQuery = {};

			if(!archived){
				updateQuery.archived = false;
				updateQuery.active = true;
			}else{
				updateQuery.archived = true;
				updateQuery.active = false;
			}

			let archiveGame = await Game.update({studio:studio.id,id:gameId},updateQuery);

			if (archiveGame.length === 0) {
				throw new CustomError('Could not archive that game. Please check your permissions.', { status: 401, err_code: "not_found" });
			}

			return res.ok();
		}catch(err){
			sails.log.error("StudioController.archiveGame error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async deleteGame(req,res){
		try{
			let gameId = req.param("gameId"),
			studio = req.token.user;

			let deleteGame = await Game.destroy({studio:studio.id,id:gameId});

			if (deleteGame.length === 0) {
				throw new CustomError('Could not delete that game. Please check your permissions.', { status: 401, err_code: "not_found" });
			}

			// Remove files associated with this game
			if(deleteGame[0].avatar){
				fs.unlink(sails.config.appPath + '/assets/images/games/banners/' + deleteGame[0].avatar, function(err) {
			  		if (err){
						sails.log.error("StudioController.deleteGame delete file error: ", err);
					}
				});
			}

			return res.ok();
		}catch(err){
			sails.log.error("StudioController.deleteGame error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async activateGame(req,res){
		try{

			let gameId = req.param("gameId"),
			active = req.param("active"),
			studio = req.token.user;

			if(!active){
				active = false;
			}else{
				active = true;
			}

			let gameUpdate = await Game.update({id:gameId,studio:studio.id},{active:active,archived:false});

			if(!gameAdAssetUpdate){
				throw new CustomError('Could not activate the game.', { status: 401, err_code: "not_found" });
			}

			return res.ok({success:true});
		}catch(err){
			sails.log.error("StudioController.activateGame error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async deleteFile(req,res){
		try{
			let gameId = req.param("gameId"),
			fileKey = req.param("fileKey"),
			studio = req.token.user;

			let game = await Game.findOne({studio:studio.id,id:gameId});

			if (game.length === 0) {
				throw new CustomError('Could not find that game.', { status: 401, err_code: "not_found" });
			}

			// Remove file
			if(game[fileKey]){
				fs.unlink(sails.config.appPath + '/assets/images/games/banners/' + gameAdAsset[fileKey], function(err) {
			  		if (err){
						sails.log.error("StudioController.deleteFile delete file error: ", err);
					}
				});
			}

			return res.ok();
		}catch(err){
			sails.log.error("StudioController.deleteFile error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async getGameAdverts(req,res){
		try{
			let approved = req.param("approved"),
			findQuery = {studio:req.token.user.id,archived:false};

			if(!approved || approved == 'false'){
				findQuery.approved = false;
			}else{
				findQuery.approved = true;
			}

			let campaigns = await GameAdAsset.find(findQuery).populate('gameAsset').populate('game').populate('gameAdSessions').sort('createdAt DESC'),
			campaignsList = [];

			for (campaign of campaigns) {
				campaign.gameAsset.screenshot = sails.config.API_HOST + "/adverts/game-assets/screenshots/" + campaign.gameAsset.screenshot;

				// Calculate how long this advert has been viewed in seconds
				// This sums all the exposure time of every player session recorded for this game ad asset
				campaign.totalExposure = _.reduce(campaign.gameAdSessions, function(memo, value) { return memo + value.exposedTime}, 0);

				campaign.status = await GameAdvertService.getAdvertStatus(campaign.active,campaign.approved,campaign.startDate,campaign.endDate);

				campaignsList.push(campaign);
			}

			return res.ok({campaigns:campaignsList});
		}catch(err){
			sails.log.error("StudioController.getGameAdverts error: ",err);
			return util.errorResponse(err, res);
		}
	},



};
