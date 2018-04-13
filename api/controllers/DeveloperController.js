/**
 * DeveloperController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const fs = require("fs");
const BigNumber = require('bignumber.js');


module.exports = {


	/**
	* Sign Up New Developer
	*/
	async signupDeveloper(req, res) {

		const email = req.param("email"),
			password = req.param("password");
		firstName = req.param("firstName");
		lastName = req.param("lastName");

		try {

			// Validate sent params
			if (!email || !password || !firstName || !lastName) {
				throw new CustomError('You did not provide all signup details required.', { status: 400 });
			}

			let existingDeveloper = await Developer.findOne({ email: email });

			// developer already exists
			if (existingDeveloper) {
				throw new CustomError('This email is already registered with another account. Please login to your account.', { status: 400 });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);

			// Create new developer account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let developer = await Developer.create({
				email: email,
				password: password,
				firstName: firstName,
				lastName: lastName,
				pin: pin,
				accountStatus: 1,
				forceBalance: '0'
			});

			// Create the users wallet
			//WalletService.createUserWallet(developer.id).catch(err=>{sails.log.error('On signup, failed to create developer wallet: ', err)});
			let activationLink = sails.config.APP_HOST + "activate-developer?developer=" + developer.developerId + "&pin=" + pin;

			let msg = `Welcome to RaidParty!<br />
				Your account has been created and is now awaiting your activation. Please click on the activation link below to activate your RaidParty Indie Developer account.<br /><br />
				<strong><a href=\"${activationLink}\">${activationLink}</a></strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;

			// Send activation email/SMS to developer to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: developer.email,
				toName: developer.email,
				subject: 'Welcome to RaidParty! Activate your account to start launching your games successfully',
				body: msg
			})

			return res.ok({
				msg: 'Please check your email inbox for an activation link.',
				success: true,
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Login Developer
	*/
	async loginDeveloper(req, res) {
		try {
			let email = req.param("email"),
				password = req.param("password");

			// Validate sent params
			if (!email || !password) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			let developer = await Developer.findOne({ email: email });

			// developer does not exist
			if (!developer) {
				throw new CustomError('That account does not exist, please check the details you entered', { status: 401, err_code: "not_found" });
			}

			// Developer is activated - try to login
			if (developer.accountStatus == 2) {
				// Check password matches
				let isValidPassword = await Developer.validatePassword(password, developer.password);

				// Invalid password entered
				if (!isValidPassword) {
					sails.log.debug("DeveloperController.logindeveloper: invalid password given by developer.");
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}

				const rsp = {
					developer: developer,
					success: true,
					token: jwToken.issue({
						user: developer.toJSON()
					}, "30 days")
				};

				return res.ok(rsp);
			}

			// developer is blocked
			if (developer.accountStatus == 0) {
				throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', { status: 403, err_code: "blocked" });
			}

			// developer has not activated their account
			if (developer.accountStatus == 1) {
				throw new CustomError('Your account has not yet been activated. Please check your email for an activation link.', { status: 401, err_code: "activate" });
			}

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Activate Developer Account - using PIN
	*/
	async activateDeveloper(req, res) {

		try {

			let pin = req.param("pin"),
				developerId = req.param("developer");

			// Validate sent params
			if (!pin || !developerId) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			// PIN not long enough
			if (pin.length < 6) {
				throw new CustomError('Invalid PIN was provided', { status: 401, err_code: "invalid_pin" });
			}

			let developer = await Developer.findOne({ developerId: developerId });

			// Could not find that account
			if (!developer) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Developer is already active
			if (developer.accountStatus == 2) {
				throw new CustomError('Your account is already active. Please login.', { status: 403, err_code: "blocked" });
			}

			// developer is locked
			if (developer.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (developer.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (developer.pinAttempts > 6) {
					let updatedPinAttempt = await Developer.update({ developerId: developer.developerId }, { accountStatus: 0 });

					// Send developer an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect activation attempts.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;

					// Send activation email/SMS to developer to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Success Team',
						toEmail: developer.email,
						toName: developer.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Developer.update({ developerId: developer.developerId }, { pinAttempts: developer.pinAttempts + 1 });
				throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
			}

			// PIN is correct and developer is allowed to enter
			let updatedPinAttempt = await Developer.update({ developerId: developer.developerId }, { accountStatus: 2, pinAttempts: 0, pin: 0 });

			const rsp = {
				developer: developer,
				success: true,
				isValid: true,
				msg: "Success! Your account is now active",
				token: jwToken.issue({
					user: developer.toJSON()
				}, "30 days")
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

			let developer = await Developer.findOne({ email: email });

			// Could not find that account
			if (!developer) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Developer is locked
			if (developer.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);

			await Developer.update({ developerId: developer.developerId }, { pin: pin });

			let activationLink = sails.config.APP_HOST + "change-password?developer=" + developer.developerId + "&pin=" + pin;

			let msg = `Welcome to RaidParty!<br />
				A password reset request was made. Please visit the link below to update your password.<br /><br />
				<strong><a href=\"${activationLink}\">${activationLink}</a></strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;

			// Send activation email/SMS to developer to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: developer.email,
				toName: developer.email,
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
				developerId = req.param("developer"),
				newPassword = req.param("password");

			// Validate sent params
			if (!developerId || !pin || !newPassword) {
				throw new CustomError('You did not provide all details required.', { status: 400 });
			}

			let developer = await Developer.findOne({ developerId: developerId });

			// Could not find that account
			if (!developer) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// developer is locked
			if (developer.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (developer.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (developer.pinAttempts > 6) {
					let updatedPinAttempt = await Developer.update({ developerId: developer.developerId }, { accountStatus: 0 });

					// Send developer an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;

					// Send activation email/SMS to developer to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: developer.email,
						toName: developer.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Developer.update({ developerId: developer.developerId }, { pinAttempts: developer.pinAttempts + 1 });
				throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
			}

			// TODO: Make sure password is valid

			// PIN is correct and developer can change their password
			let updatedPassword = await Developer.update({ developerId: developer.developerId }, { password: newPassword, pinAttempts: 0, pin: 0 });

			return res.ok({ "success": true, "msg": "Your new password has been set, please login to your account" });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get developer games
	*/
	async getGames(req, res) {
		try {
			let developer = req.developer;
			let games = await Game.find({ developer: developer.developerId });
			return res.ok({ games: games });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get developer balance
	*/
	async getBalance(req, res) {
		try {
			let developer = req.developer;

			if (!developer.forceBalance) {
				developer.forceBalance = '0';
			}

			// Work out FORCE balance in dollar
			let forceTotal = new BigNumber(developer.forceBalance);

			developer.totalForce = forceTotal.toFormat(6);

			developer.totalForceUSD = parseInt(forceTotal) * 0.11;

			return res.ok({ totalForce: developer.totalForce, totalForceUsd: developer.totalForceUSD });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Add game
	*/
	async addGame(req, res) {
		try {
			let developer = req.developer;

			let gameTitle = req.param("title"),
				description = req.param("description"),
				platform = req.param("platform"),
				link = req.param("link"),
				active = req.param('activeStatus')

			if (!req.file('avatar')) {
				throw new CustomError('You must provide a valid game image to be listed on the RaidParty developer app.', { status: 401 });
			}

			req.file('avatar').upload({ maxBytes: 10000000 }, async function (err, file) {
				if (!file) {
					throw new CustomError('Error Uploading image file.', { status: 401 });
				}

				let avatarBase64Data = await new Buffer(fs.readFileSync(file[0].fd)).toString("base64");

				let addGame = await Game.create({ title: gameTitle, description: description, active: active, link: link, avatar: avatarBase64Data, platform: platform, developer: developer.developerId });

				if (!addGame) {
					throw new CustomError('Could not add that game due to a technical issue. Please try again later.', { status: 400 });
				}

				return res.ok({ game: addGame });
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Update game
	*/
	async updateGame(req, res) {
		try {
			let developer = req.developer;

			let gameId = req.param("gameId"),
				gameTitle = req.param("title"),
				description = req.param("description"),
				platform = req.param("platform"),
				link = req.param("link"),
				active = req.param("activeStatus");
			let addGame = await Game.update({ gameId: gameId, developer: developer.developerId }, { title: gameTitle, description: description, link: link, platform: platform, active: active });

			if (!addGame) {
				throw new CustomError('Could not update that game due to a technical issue. Please try again later.', { status: 400 });
			}

			return res.ok({ game: addGame });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Delete game
	*/
	async deleteGame(req, res) {
		try {
			let developer = req.developer;

			let gameId = req.param("gameId"),
				gameTitle = req.param("title");

			let game = await Game.findOne({ gameId: gameId, developer: developer.developerId });

			if (!game) {
				throw new CustomError('You do not have relevant permissions to delete that game.', { status: 501 });
			}

			// Invalid game title entered - to confirm deletion
			if (game.title != gameTitle) {
				throw new CustomError('You entered the game title incorrectly, that game could not be deleted. Please check the game title and try again.', { status: 400 });
			}

			let gameDeleted = await Game.destroy({ gameId: game.gameId });

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
			let developer = req.developer,
				gameId = req.param("gameId");

			let game = await Game.findOne({ gameId: gameId, developer: developer.developerId });

			if (!game) {
				throw new CustomError('That game could not be found.', { status: 400 });
			}

			return res.ok({ game: game });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Update developers password when logged in
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

			let developer = await Developer.findOne({ developerId: req.developer.developerId });

			// Could not find that account
			if (!developer) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// developer is locked
			if (developer.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Check current password entered is valid
			let validPassword = await Developer.validatePassword(currentPassword, developer.password);

			// Invalid current password given
			if (!validPassword) {
				throw new CustomError('The current password you entered was invalid', { status: 401, err_code: "invalid_password" });
			}

			// Current password was correct, enter new password
			let updatedPassword = await Developer.update({ developerId: developer.developerId }, { password: newPassword });

			return res.ok({ "success": true, "msg": "Your password has been updated successfully" });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},

};
