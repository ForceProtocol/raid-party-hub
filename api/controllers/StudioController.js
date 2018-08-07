/**
 * StudioController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const fs = require("fs");
const BigNumber = require('bignumber.js');


module.exports = {


	/**
	* Sign Up New Studio
	*/
	async signupStudio(req, res) {

		const email = req.param("email"),
			password = req.param("password"),
			firstName = req.param("firstName"),
			lastName = req.param("lastName"),
			studioName = req.param("studioName");

		try {

			// Validate sent params
			if (!email || !password || !firstName || !lastName) {
				throw new CustomError('You did not provide all signup details required.', { status: 400 });
			}

			// Studio name is not required
			if(!studioName){
				studioName = '';
			}

			let existingStudio = await Studio.findOne({ email: email });

			// studio already exists
			if (existingStudio) {
				throw new CustomError('This email is already registered with another account. Please login to your account.', { status: 400 });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);

			// Create new studio account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let studio = await Studio.create({
				email: email,
				password: password,
				firstName: firstName,
				lastName: lastName,
				studioName: studioName,
				pin: pin,
				accountStatus: 1,
				forceBalance: '0'
			});

			let activationLink = sails.config.APP_HOST + "activate?studio=" + studio.studioId + "&pin=" + pin;

			let msg = `Welcome to RaidParty!<br />
				Your account has been created and is now awaiting your activation. Please click on the activation link below to activate your RaidParty Studio account.<br /><br />
				<strong><a href=\"${activationLink}\">${activationLink}</a></strong><br /><br />
				Keep calm, keep building<br />
				The RaidParty team`;

			// Send activation email/SMS to studio to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: studio.email,
				toName: studio.firstName + ' ' + studio.lastName,
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
					studio: studio,
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

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Activate Studio Account - using PIN
	*/
	async activateStudio(req, res) {

		try {

			let pin = req.param("pin"),
				studioId = req.param("studio");

			// Validate sent params
			if (!pin || !studioId) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			// PIN not long enough
			if (pin.length < 6) {
				throw new CustomError('Invalid PIN was provided', { status: 401, err_code: "invalid_pin" });
			}

			let studio = await Studio.findOne({ studioId: studioId });

			// Could not find that account
			if (!studio) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Studio is already active
			if (studio.accountStatus == 2) {
				throw new CustomError('Your account is already active. Please login.', { status: 403, err_code: "blocked" });
			}

			// studio is locked
			if (studio.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (studio.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (studio.pinAttempts > 6) {
					let updatedPinAttempt = await Studio.update({ studioId: studio.studioId }, { accountStatus: 0 });

					// Send studio an email that their account has been blocked
					let msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect activation attempts.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty success team`;

					// Send activation email/SMS to studio to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Success Team',
						toEmail: studio.email,
						toName: studio.email,
						subject: 'Your RaidParty account has been locked',
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Studio.update({ studioId: studio.studioId }, { pinAttempts: studio.pinAttempts + 1 });
				throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
			}

			// PIN is correct and studio is allowed to enter
			let updatedPinAttempt = await Studio.update({ studioId: studio.studioId }, { accountStatus: 2, pinAttempts: 0, pin: 0 });

			const rsp = {
				studio: studio,
				success: true,
				isValid: true,
				msg: "Success! Your account is now active",
				token: jwToken.issue({
					user: studio.toJSON()
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

			await Studio.update({ studioId: studio.studioId }, { pin: pin });

			let activationLink = sails.config.APP_HOST + "change-password?studio=" + studio.studioId + "&pin=" + pin;

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

			let studio = await Studio.findOne({ studioId: studioId });

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
					let updatedPinAttempt = await Studio.update({ studioId: studio.studioId }, { accountStatus: 0 });

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

				let updatedPinAttempt = await Studio.update({ studioId: studio.studioId }, { pinAttempts: studio.pinAttempts + 1 });
				throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
			}

			// TODO: Make sure password is valid

			// PIN is correct and studio can change their password
			let updatedPassword = await Studio.update({ studioId: studio.studioId }, { password: newPassword, pinAttempts: 0, pin: 0 });

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
			let studio = req.studio;
			let games = await Game.find({ studio: studio.studioId });
			return res.ok({ games: games });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get studio balance
	*/
	async getBalance(req, res) {
		try {
			let studio = req.studio;

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
			let studio = req.studio;

			let gameTitle = req.param("title"),
				description = req.param("description"),
				platform = req.param("platform"),
				active = req.param('activeStatus')

			if (!req.file('avatar')) {
				throw new CustomError('You must provide a valid game image to be listed on the RaidParty studio app.', { status: 401 });
			}

			req.file('avatar').upload({ maxBytes: 10000000 }, async function (err, file) {
				if (!file) {
					throw new CustomError('Error Uploading image file.', { status: 401 });
				}
				let isAndroid, isIos;
				_.map(JSON.parse(platform), (pfObject) => {
					isAndroid = pfObject.name === 'android' ? true : false;
					isIos = pfObject.name === 'ios' ? true : false;
				});
				let avatarBase64Data = await new Buffer(fs.readFileSync(file[0].fd)).toString("base64");

				let addGame = await Game.create({ title: gameTitle, description: description, active: active, avatar: avatarBase64Data, isAndroid: isAndroid, isIos: isIos, platform: platform, studio: studio.studioId });

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
			let studio = req.studio;

			let gameId = req.param("gameId"),
				gameTitle = req.param("title"),
				description = req.param("description"),
				platform = req.param("platform"),
				active = req.param("activeStatus");

			let updatedGame;
			if (req._fileparser.upstreams.length) {

				req.file('avatar').upload({ maxBytes: 10000000 }, async function (err, file) {
					if (!file) {
						throw new CustomError('Error Uploading image file.', { status: 401 });
					}
					let isAndroid, isIos;
					_.map(JSON.parse(platform), (pfObject) => {
						isAndroid = pfObject.name === 'android' ? true : false;
						isIos = pfObject.name === 'ios' ? true : false;
					});
					let avatarBase64Data = await new Buffer(fs.readFileSync(file[0].fd)).toString("base64");
					updatedGame = await Game.update({ gameId: gameId, studio: studio.studioId }, { title: gameTitle, description: description, platform: platform, isAndroid: isAndroid, isIos: isIos, active: active, avatar: avatarBase64Data });
					if (!updatedGame) {
						throw new CustomError('Could not update that game due to a technical issue. Please try again later.', { status: 400 });
					}
					return res.ok({ game: updatedGame });
				})
			} else {
				updatedGame = await Game.update({ gameId: gameId, studio: studio.studioId }, { title: gameTitle, description: description, platform: platform, isAndroid: isAndroid, isIos: isIos, active: active });
				if (!updatedGame) {
					throw new CustomError('Could not update that game due to a technical issue. Please try again later.', { status: 400 });
				}
				return res.ok({ game: updatedGame });
			}

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Delete game
	*/
	async deleteGame(req, res) {
		try {
			let studio = req.studio;

			let gameId = req.param("gameId"),
				gameTitle = req.param("title");

			let game = await Game.findOne({ gameId: gameId, studio: studio.studioId });

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
			let studio = req.studio,
				gameId = req.param("gameId");

			let game = await Game.findOne({ gameId: gameId, studio: studio.studioId });

			if (!game) {
				throw new CustomError('That game could not be found.', { status: 400 });
			}

			return res.ok({ game: game });
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

			let studio = await Studio.findOne({ studioId: req.studio.studioId });

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
			let updatedPassword = await Studio.update({ studioId: studio.studioId }, { password: newPassword });

			return res.ok({ "success": true, "msg": "Your password has been updated successfully" });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},

};
