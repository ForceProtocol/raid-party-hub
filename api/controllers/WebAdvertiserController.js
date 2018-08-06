/**
 * WebPlayerController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const moment = require('moment'),
fs = require("fs");

module.exports = {


	/**
	* Sign Up New Advertiser
	*/
	async signupUser(req, res) {

		let email = req.param("email"),
			password = req.param("password");

		try {

			// Validate firstname params
			if (!email || !password) {
				throw new CustomError("You did not provide all signup details required.", { status: 400 });
			}

			let existingUser = await Advertiser.findOne({ email: email });

			// Player already exists
			if (existingUser) {
				throw new CustomError("This email is already registered with another account. Please login to your account using the following email: " + existingUser.email, { status: 400 });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			// Create new player account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let advertiser = await Advertiser.create({
				email: email,
				password: password,
				pin: pin,
				accountStatus: 1,
			});


			let okMsg, subject, msg;

			// await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: [deviceId], text: pin + " is your activation pin" });
			okMsg = "Please check your email inbox for a 6 digit pin and enter below to activate your account";
			subject = "Welcome to RaidParty! Activate your account to start earning rewards";
			activationLink = `${sails.config.APP_HOST}/activate-account?advertiserId=${advertiser.id}&pin=${pin}&email=${email}`;
			msg = `Welcome to RaidParty!<br />
				Your account has been created and is now awaiting your activation. Please click on the link below to activate your account.<br /><br />
				<strong><a href=\"${activationLink}\">Activate Account</a></strong><br /><br />
				<br />
				The RaidParty Team`;


			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: advertiser.email,
				toName: advertiser.email,
				subject: subject,
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
	* Login Advertiser
	*/
	async loginUser(req, res) {
		try {
			let email = req.param("email"),
				password = req.param("password");

			// Validate sent params
			if (!email || !password) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			let advertiser = await Advertiser.findOne({ email: email });

			// advertiser does not exist
			if (!advertiser) {
				throw new CustomError('That account does not exist, please check the details you entered', { status: 401, err_code: "not_found" });
			}

			// Player is activated - try to login
			if (advertiser.accountStatus == 2) {
				// Check password matches
				let isValidPassword = await Advertiser.validatePassword(password, advertiser.password);

				// Invalid password entered
				if (!isValidPassword) {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}

				const rsp = {
					user: advertiser,
					success: true,
					token: jwToken.issue({
						user: advertiser.toJSON()
					}, "60 days")
				};

				return res.ok(rsp);
			}

			// advertiser is blocked
			if (advertiser.accountStatus == 0) {
				throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', { status: 403, err_code: "blocked" });
			}

			// advertiser has not activated their account
			if (advertiser.accountStatus == 1) {
				throw new CustomError('Your account has not yet been activated. Please check your email for a PIN code and enter to activate your account.', { status: 401, err_code: "activate" });
			}

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Activate advertiser Account - using PIN
	*/
	async activateUser(req, res) {

		try {

			let pin = req.param("pin"),
				email = req.param("email"),
				advertiserId = req.param("userId");

			// Validate sent params
			if (!pin || !advertiserId) {
				throw new CustomError('You did not provide all login details required.', { status: 400 });
			}

			// PIN not long enough
			if (pin.length < 6) {
				throw new CustomError('Invalid PIN was provided', { status: 401, err_code: "invalid_pin" });
			}

			let advertiser = await Advertiser.findOne({ id: advertiserId, email:email });

			// Could not find that account
			if (!advertiser) {
				throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
			}

			// Player is locked
			if (advertiser.accountStatus == 0) {
				throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
			}

			// Pin does not match
			if (advertiser.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (advertiser.pinAttempts > 6) {
					let updatedPinAttempt = await Advertiser.update({ id: advertiser.id }, { accountStatus: 0 });
					let okMsg, subject, msg;

					subject = "Your RaidParty account has been locked";
					msg = `Hi<br />
						We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
						You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
						Keep calm, keep playing<br />
						The RaidParty team`;

					// Send activation email/SMS to advertiser to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: advertiser.email,
						toName: advertiser.email,
						subject: subject,
						body: msg
					});

					throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
				}

				let updatedPinAttempt = await Advertiser.update({ id: advertiser.id }, { pinAttempts: advertiser.pinAttempts + 1 });
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}

			// PIN is correct and advertiser is allowed to enter
			let updatedPinAttempt = await Advertiser.update({ id: advertiser.id }, { accountStatus: 2, pinAttempts: 0, pin: 0 });

			okMsg = "Success! Your account is now active";

			const rsp = {
				user: advertiser,
				success: true,
				isValid: true,
				msg: okMsg,
				token: jwToken.issue({
					user: advertiser.toJSON()
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
			let email = req.param("email"),
				locale = req.param("locale");

			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!email) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários', { status: 400 });
				} else {
					throw new CustomError('You did not provide all details required.', { status: 400 });
				}
			}

			let user = await Advertiser.findOne({ email: email });

			// Could not find that account
			if (!user) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// user is locked
			if (user.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			let okMsg, subject, msg;

			await Advertiser.update({ id: user.id }, { pin: pin });
			const activationLink = `${sails.config.APP_HOST}/forgot-password?email=${email}&user=${user.id}&pin=${pin}`;

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				okMsg = 'Por favor, revise su bandeja de entrada para encontrar un PIN de restablecimiento de contraseña de 6 dígitos';
				subject = 'Bienvenido a RaidParty! Restablecer contraseña solicitada';
				msg = `Hola, 
					<br /> Usted solicitó un restablecimiento de contraseña. Ingrese el PIN de 6 dígitos a continuación en la pantalla de activación del PIN en la aplicación móvil RaidParty para restablecer su contraseña.<br /><br />
					<strong>${pin}</strong><br /><br />
					<strong><a href=\"${activationLink}\">Reset My password</a></strong><br /><br />
					Mantén la calma, sigue jugando <br />
					El equipo exitoso de RaidParty`;
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				okMsg = 'Por favor verifique o seu email por um PIN de 6 Digitos para efetuar o reset';
				subject = 'Bem vindo a RaidParty! Requer reset da palavra passe';
				msg = `Olá,<br />
					 Pediu que a sua palavra passe fosse alterada. Por favor digite o PIN de 6 digitos na tela de ativação da aplicação RaidParty para efetuar o reset da sua palvra passe.<br /><br />
					 <strong>${pin}</strong><br /><br />
					 <strong><a href=\"${activationLink}\">Reset My password</a></strong><br /><br />
					Sem Stress, Continue Jogando<br />
					A equipe RaidParty`;
			} else {
				okMsg = 'Please check your email inbox for a password reset link.';
				subject = 'Welcome to RaidParty! Reset password requested';
				msg = `Hi,<br />
					You requested a password reset. Please click on the link below and reset your passoword.<br /><br />
					<strong>${pin}</strong><br /><br />
					<strong><a href=\"${activationLink}\">Reset My password</a></strong><br /><br />
					The RaidParty team`;
			}

			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: user.email,
				toName: user.email,
				subject: subject,
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
	* Validate a PIN issued
	*/
	async validatePin(req, res) {
		try {
			let pin = req.param("pin"),
				email = req.param("email"),
				locale = req.param("locale");

			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!email || !pin) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários', { status: 400 });
				} else {
					throw new CustomError('You did not provide all details required.', { status: 400 });
				}
			}

			let user = await Advertiser.findOne({ email: email });

			// Could not find that account
			if (!user) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// user is locked
			if (user.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Pin does not match
			if (user.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (user.pinAttempts > 5) {
					let updatedPinAttempt = await Advertiser.update({ id: user.id }, { accountStatus: 0 });
					let okMsg, subject, msg;

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						// Send user an email that their account has been blocked
						subject = "Su cuenta RaidParty ha sido bloqueada";
						msg = `Hola<br />
						   Lamentamos informarle que su cuenta se ha bloqueado debido a demasiados intentos incorrectos de PIN para cambiar su contraseña.<br /><br />
						   Debe responder a este correo electrónico para confirmar su identidad y permitirnos garantizar que su cuenta esté segura. A continiación, reactivaremos su cuenta en función de una evaluación.<br />
						   Mantén la calma, sigue jugando<br />
						   El equipo exitoso de RaidParty`;

						// Send activation email/SMS to user to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('Ha realizado demasiados intentos incorrectos de PIN. Su cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						// Send user an email that their account has been blocked
						subject = "A sua conta RaidParty foi bloqueada.";
						msg = `Olá<br />
						   Lamentamos informar que a sua conta foi bloqueada devido a várias tentativas incorretas de alterar a sua palavra passe.<br /><br />
						   Deverá agora responder a este email de forma a confirmar a sua identidade assegurando que a sua conta está segura. Após verificação podemos desbloquear a conta.<br />
						   Sem Stress, Continue Jogando<br />
						A equipe RaidParty`;

						// Send activation email/SMS to user to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('PIN Introduzido erradamente por multiplas vezes. A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
					} else {
						// Send user an email that their account has been blocked
						subject = "Your RaidParty account has been locked";
						msg = `Hi<br />
							We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
							You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
							Keep calm, keep playing<br />
							The RaidParty success team`;

						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
					}
				}

				let updatedPinAttempt = await Advertiser.update({ id: user.id }, { pinAttempts: user.pinAttempts + 1 });

				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('PIN no válido fue proporcionado', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('O PIN providenciado é inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}

			}

			// PIN is correct and user is allowed to enter
			return res.ok({ "success": true, "isValid": true });

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},




	/**
	* Change password after reset request made
	*/
	async changePassword(req, res) {
		try {
			userId = req.param("userId"),
			pin = req.param("pin"),
			email = req.param("email"),
			newPassword = req.param("password"),
			locale = req.param("locale");

			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!userId || !newPassword) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários', { status: 400 });
				} else {
					throw new CustomError('You did not provide all details required.', { status: 400 });
				}
			}

			let user = await Advertiser.findOne({ id: userId, email: email });

			// Could not find that account
			if (!user) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// user is locked
			if (user.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Pin does not match
			if (user.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (user.pinAttempts > 6) {
					let updatedPinAttempt = await Advertiser.update({ id: user.id }, { accountStatus: 0 });

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						let msg = `Hola<br />
						   Lamentamos informarle que su cuenta se ha bloqueado debido a demasiados intentos incorrectos de PIN para cambiar su contraseña.<br /><br />
						   Debe responder a este correo electrónico para confirmar su identidad y permitirnos garantizar que su cuenta esté segura. A continiación, reactivaremos su cuenta en función de una evaluación.<br />
						   Mantén la calma, sigue jugando<br />
						   El equipo exitoso de RaidParty`;
						// Send activation email/SMS to user to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: 'Su cuenta RaidParty ha sido bloqueada',
							body: msg
						});

						throw new CustomError('Ha realizado demasiados intentos incorrectos de PIN. Su cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						let msg = `Olá<br />
							   Lamentamos informar que a sua conta foi bloqueada devido a várias tentativas incorretas de alterar a sua palavra passe.<br /><br />
							   Deverá agora responder a este email de forma a confirmar a sua identidade assegurando que a sua conta está segura. Após verificação podemos desbloquear a conta.<br />
							   Sem Stress, Continue Jogando<br />
							A equipe RaidParty`;
						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: 'A sua conta foi bloqueada.',
							body: msg
						});

						throw new CustomError('PIN Introduzido erradamente por multiplas vezes. A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
					} else {
						let msg = `Hi<br />
							We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
							You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
							Keep calm, keep playing<br />
							The RaidParty success team`;
						// Send activation email/SMS to user to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: user.email,
							toName: user.email,
							subject: 'Your RaidParty account has been locked',
							body: msg
						});

						throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
					}
				}

				let updatedPinAttempt = await Advertiser.update({ id: user.id }, { pinAttempts: user.pinAttempts + 1 });

				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('PIN no válido fue proporcionado', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('O PIN providenciado é inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}
			}

			// TODO: Make sure password is valid

			// PIN is correct and user can change their password
			let updatedPassword = await Advertiser.update({ id: user.id }, { password: newPassword, pinAttempts: 0, pin: 0 });

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				return res.ok({ "success": true, "msg": "Su nueva contraseña ha sido configurada, ingrese a su cuenta" });
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				return res.ok({ "success": true, "msg": "Uma nova palavra passe foi efetuada, por favor faça login" });
			} else {
				return res.ok({ "success": true, "msg": "Your new password has been set, please login to your account" });
			}

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},




	/**
	* Update users password when logged in
	* Uses Authentication Bearer auth
	*/
	async updatePassword(req, res) {
		try {
			let currentPassword = req.param("current_password"),
				newPassword = req.param("new_password"),
				locale = req.param("locale");

			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!currentPassword || !newPassword) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários', { status: 400 });
				} else {
					throw new CustomError('You did not provide all details required.', { status: 400 });
				}
			}

			if (currentPassword == newPassword) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A palavra passe inserida é a palavra passe atual.', { status: 400 });
				} else {
					throw new CustomError('You entered the same password as your current password', { status: 400 });
				}
			}

			let user = await Advertiser.findOne({ id: req.token.user.id });

			// Could not find that account
			if (!user) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// user is locked
			if (user.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Check current password entered is valid
			let validPassword = await Advertiser.validatePassword(currentPassword, user.password);

			// Invalid current password given
			if (!validPassword) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('La contraseña actual que ingresaste no era válida', { status: 401, err_code: "invalid_password" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A palavra passe inserida é inválida', { status: 401, err_code: "invalid_password" });
				} else {
					throw new CustomError('The current password you entered was invalid', { status: 401, err_code: "invalid_password" });
				}
			}

			// Current password was correct, enter new password
			let updatedPassword = await Advertiser.update({ id: user.id }, { password: newPassword });

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				return res.ok({ "success": true, "msg": "Su contraseña se ha actualizado correctamente" });
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				return res.ok({ "success": true, "msg": "A sua palavra passe foi atualizada com sucesso" });
			} else {
				return res.ok({ "success": true, "msg": "Your password has been updated successfully" });
			}
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	
	/**
	* Get user
	*/
	async getUser(req, res) {
		try {
			// Get games we need for this device
			let user = await Advertiser.findOne({ id: req.token.user.id });

			if (!user) {
				throw new CustomError('Could not find that user.', { status: 401, err_code: "not_found" });
			}

			return res.ok({ user: user});
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get all games for advertisers
	*/
	async getGames(req, res) {
		try {
			// Get games we need for this device
			let games = await Game.find({ dynamicAdsEnabled: true }).populate('gamePlatforms').populate('gameAsset');

			if (!games) {
				throw new CustomError('Could not find any active games.', { status: 401, err_code: "not_found" });
			}

			finalGamesList = [];
			for (game of games) {
				// Convert game avatar to base64 encoded string
				game.avatar = '/assets/images/' + game.avatar;

				gameItem = { game_id: game.gameId, title: game.title, dynamicAdsDescription: game.dynamicAdsDescription, 
					bannerContent: game.bannerContent, link: game.link, platform: game.platform, avatar: game.avatar,
					monthlyImpressions:game.monthlyImpressions, monthlyActiveUsers:game.monthlyActiveUsers, regions:game.regions, age:game.age,
					gender:game.gender
				};

				finalGamesList.push(gameItem);
			}

			return res.ok({ games: games});
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},
	

	/**
	* Get notifications against a user
	*/
	async getNotifications(req, res) {
		try {

			// Get games we need for this device
			let user = await Advertiser.findOne({ id: req.token.user.id }).populate('notifications', { sort: 'createdAt DESC' });

			if (!user) {
				throw new CustomError('Could not find that user.', { status: 401, err_code: "not_found" });
			}

			return res.ok({ notifications: user.notifications });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Delete a user notification
	*/
	async deleteNotification(req, res) {
		try {

			let notificationId = req.param('notification_id');

			if (!notificationId) {
				throw new CustomError('Could not find that notification.', { status: 401, err_code: "not_found" });
			}

			// Get games we need for this device
			let player = await Player.findOne({ id: req.token.user.id });

			if (!player) {
				throw new CustomError('Could not find that player.', { status: 401, err_code: "not_found" });
			}

			let deleted = await PlayerNotifications.destroy({ players: player.id, id: notificationId });

			if (deleted) {
				return res.ok({ success: true });
			} else {
				return res.ok({ success: false });
			}
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Get games the advertiser is using
	*/
	async getUserGames(req, res) {
		// const playerId = req.token.user.id;
		let locale = req.param('locale');
		const playerId = req.param('playerId');
		let deviceType = req.param("device_type").toLowerCase();
		if (!locale) {
			locale = 'en';
		}
		const playerGames = await PlayerToGame.find({ player: playerId });
		if (!playerGames) {
			throw new CustomError('You haven not played any game yet!', { status: 401, err_code: "not_found" });
		}
		const finalResponse = {
			gamesList: []
		}
		const playerGameIds = _.map(playerGames, 'game');
		let games = await Game.find({ id: playerGameIds }).populate('rewardCampaign').populate('gamePlatforms');
		for (game of games) {

			platformAvailable = false;
			for (const platform of game.gamePlatforms) {
				if (platform.type == deviceType) {
					platformAvailable = true;
					game.link = platform.link;
					game.platform = platform.type;
				}
			}

			if (!platformAvailable) {
				continue;
			}
			// Prepare the prizes list
			prizeList = [];
			for (reward of game.rewardCampaign) {
				rules = util.stringToJson(reward.rules);
				if (rules) {
					ruleLocale = rules.find(function (obj) { return obj.hasOwnProperty(locale); });

					if (!ruleLocale) {
						reward.rules = rules.find(function (obj) { return obj.hasOwnProperty('en'); });
						reward.rules = reward.rules['en'];
					} else {
						reward.rules = ruleLocale[locale];
					}
				}
				if (!reward.rules) {
					reward.rules = rules;
				}
				// Ensure we set the correct language for the rules
				description = util.stringToJson(reward.description);
				if (description) {
					descriptionLocale = description.find(function (obj) { return obj.hasOwnProperty(locale); });
					if (!descriptionLocale) {
						reward.description = reward.find(function (obj) { return obj.hasOwnProperty('en'); });
						reward.description = reward.description['en'];
					} else {
						reward.description = descriptionLocale[locale];
					}
				}
				if (!reward.description) {
					reward.description = description;
				}
				prize = { id: reward.id, value: reward.value, currency: reward.currency, rules: reward.rules, maxQualifyingPlayers: reward.maxQualifyingPlayers, maxWinningPlayers: reward.maxWinningPlayers, startDate: reward.startDate, endDate: reward.endDate };
				prizeList.push(prize);
			}
			// Ensure we set the correct language for the rules
			description = util.stringToJson(game.description);
			if (description) {
				descriptionLocale = description.find(function (obj) { return obj.hasOwnProperty(locale); });
				if (!descriptionLocale) {
					game.description = description.find(function (obj) { return obj.hasOwnProperty('en'); });
					game.description = game.description['en'];
				} else {
					game.description = descriptionLocale[locale];
				}
			}
			if (!game.description) {
				game.description = description;
			}
			// Convert game avatar to base64 encoded string
			game.avatar = '/assets/images/' + game.avatar;
			gameItem = { game_id: game.gameId, title: game.title, reward: game.rewardAvailable, description: game.description, jackpot: game.jackpot, bannerContent: game.bannerContent, link: game.link, platform: game.platform, avatar: game.avatar, prizes: prizeList };
			finalResponse.gamesList.push(gameItem);
		}
		finalResponse['success'] = true;
		return res.ok(finalResponse);
	},



	async uploadAsset(req, res) {
		try {

			let fileType = req.param("type"),
			uploadPath = 'assets/adverts/';

			if(fileType == 'video'){
				uploadPath = 'assets/adverts/videos';
			}else if(fileType == 'image'){
				uploadPath = 'assets/adverts/images';
			}


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


	async createCampaign(req,res){
		try{
			let gameId = req.param("gameId"),
			width = req.param("width"),
			height = req.param("height"),
			resourceUrlHd = req.param("resourceUrlHd"),
			resourceUrlSd = req.param("resourceUrlSd"),
			resourceUrlImg = req.param("resourceImg"),
			startDate = req.param("startDate"),
			endDate = req.param("endDate"),
			gameAsset = req.param("gameAsset"),
			maxBid = req.param("maxBid"),
			dailyBudget = req.param("dailyBudget"),
			active = req.param("active"),
			advertiserId = req.token.user.id;


			// Validate width and height values as float
			if(!width){
				width = 0.0;
			}

			if(!height){
				height = 0.0;
			}

			width = parseFloat(width);
			height = parseFloat(height);


			if(active){
				active = true;
			}else{
				active = false;
			}


			// Ensure at least one asset was uploaded
			if(!resourceUrlHd && !resourceUrlSd && !resourceUrlImg){
				throw new CustomError('You must provide at least one asset (video or image)', { status: 401, err_code: "not_found" });
			}

			// Ensure that uploaded files exist
			if(resourceUrlHd){
				resourceUrlHd = '/adverts/videos/' + resourceUrlHd;
			}

			if(resourceUrlSd){
				resourceUrlSd = '/adverts/videos/' + resourceUrlSd;
			}

			if(resourceUrlImg){
				resourceUrlImg = '/adverts/images/' + resourceUrlImg;
			}

			let gameAdAsset = await GameAdAsset.create({game:gameId,gameAsset:gameAsset,active:active,advertiser:advertiserId,width:width,height:height,resourceUrlSd:resourceUrlSd,
				resourceUrlHd:resourceUrlHd,resourceUrlImg:resourceUrlImg,maxBid:maxBid,dailyBudget:dailyBudget,startDate:startDate,endDate:endDate});

			if (!gameAdAsset) {
				throw new CustomError('Could not save that campaign', { status: 401, err_code: "not_found" });
			}

			return res.ok({success:true,gameAdAsset:gameAdAsset});

		}catch(err){
			sails.log.error("WebAdertiserController.createCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async updateCampaign(req,res){
		try{
			let gameAdAssetId = req.param("gameAdAssetId"),
			gameId = req.param("gameId"),
			width = req.param("width"),
			height = req.param("height"),
			resourceUrlHd = req.param("resourceUrlHd"),
			resourceUrlSd = req.param("resourceUrlSd"),
			resourceUrlImg = req.param("resourceImg"),
			startDate = req.param("startDate"),
			endDate = req.param("endDate"),
			gameAsset = req.param("gameAsset"),
			maxBid = req.param("maxBid"),
			dailyBudget = req.param("dailyBudget"),
			advertiserId = req.token.user.id;


			// Validate width and height values as float
			if(!width){
				width = 0.0;
			}

			if(!height){
				height = 0.0;
			}

			width = parseFloat(width);
			height = parseFloat(height);


			// Ensure at least one asset was uploaded
			if(!resourceUrlHd && !resourceUrlSd && !resourceUrlImg){
				throw new CustomError('You must provide at least one asset (video or image)', { status: 401, err_code: "not_found" });
			}

			// Ensure that uploaded files exist
			if(resourceUrlHd){
				resourceUrlHd = '/adverts/videos/' + resourceUrlHd;
			}

			if(resourceUrlSd){
				resourceUrlSd = '/adverts/videos/' + resourceUrlSd;
			}

			if(resourceUrlImg){
				resourceUrlImg = '/adverts/images/' + resourceUrlImg;
			}

			let gameAdAsset = await GameAdAsset.update({id:gameAdAssetId,advertiser:advertiserId},{active:true,approved:false,game:gameId,
				gameAsset:gameAsset,advertiser:advertiserId,width:width,height:height,resourceUrlSd:resourceUrlSd,
				resourceUrlHd:resourceUrlHd,resourceUrlImg:resourceUrlImg,maxBid:maxBid,dailyBudget:dailyBudget,startDate:startDate,endDate:endDate});

			if (!gameAdAsset) {
				throw new CustomError('Could not update that campaign', { status: 401, err_code: "not_found" });
			}

			return res.ok({success:true,gameAdAsset:gameAdAsset});

		}catch(err){
			sails.log.error("WebAdertiserController.updateCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},


	async getCampaigns(req,res){
		try{
			let archived = req.param("archived"),
			active = req.param("active"),
			findQuery = {advertiser:req.token.user.id};

			if(!archived || archived == 'false'){
				findQuery.archived = false;
			}else{
				findQuery.archived = true;
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
			sails.log.error("WebAdertiserController.getCampaigns error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async getCampaign(req,res){
		try{
			let gameAdAssetId = req.param("gameAdAssetId");

			let campaign = await GameAdAsset.findOne({advertiser:req.token.user.id,id:gameAdAssetId}).populate('gameAsset').populate('game').populate('gameAdSessions');

			if (!campaign) {
				throw new CustomError('Could not find that campaign.', { status: 401, err_code: "not_found" });
			}

			return res.ok(campaign);
		}catch(err){
			sails.log.error("WebAdertiserController.getCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async downloadItem(req,res){
		try{
			let item = decodeURI(req.param("item"));
			return res.download(sails.config.appPath + "/assets" + item);
		}catch(err){
			sails.log.error("WebAdertiserController.downloadItem error: ",err);
			return util.errorResponse(err, res);
		}
	},


	async archiveCampaign(req,res){
		try{
			let gameAdAssetId = decodeURI(req.param("campaignId")),
			archived = req.param("archived"),
			updateQuery = {};

			if(!archived){
				updateQuery.archived = false;
				updateQuery.active = true;
			}else{
				updateQuery.archived = true;
				updateQuery.active = false;
			}

			let archiveGameAdAsset = await GameAdAsset.update({advertiser:req.token.user.id,id:gameAdAssetId},updateQuery);

			if (archiveGameAdAsset.length === 0) {
				throw new CustomError('Could not archive that campaign. Please check your permissions.', { status: 401, err_code: "not_found" });
			}

			return res.ok();
		}catch(err){
			sails.log.error("WebAdertiserController.archiveCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async deleteCampaign(req,res){
		try{
			let gameAdAssetId = decodeURI(req.param("campaignId"));

			let deleteGameAdAsset = await GameAdAsset.destroy({advertiser:req.token.user.id,id:gameAdAssetId});

			if (deleteGameAdAsset.length === 0) {
				throw new CustomError('Could not delete that campaign. Please check your permissions.', { status: 401, err_code: "not_found" });
			}

			// Remove files associated with this campaign
			if(deleteGameAdAsset[0].resourceUrlHd){
				fs.unlink(sails.config.appPath + '/assets' + deleteGameAdAsset[0].resourceUrlHd, function(err) {
			  		if (err){
						sails.log.error("WebAdvertiserController.deleteCampaign delete file error: ", err);
					}
				});
			}

			if(deleteGameAdAsset[0].resourceUrlSd){
				fs.unlink(sails.config.appPath + '/assets' + deleteGameAdAsset[0].resourceUrlSd, function(err) {
			  		if (err){
						sails.log.error("WebAdvertiserController.deleteCampaign delete file error: ", err);
					}
				});
			}

			if(deleteGameAdAsset[0].resourceUrlImg){
				fs.unlink(sails.config.appPath + '/assets' + deleteGameAdAsset[0].resourceUrlImg, function(err) {
			  		if (err){
						sails.log.error("WebAdvertiserController.deleteCampaign delete file error: ", err);
					}
				});
			}

			return res.ok();
		}catch(err){
			sails.log.error("WebAdertiserController.deleteCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async activateCampaign(req,res){
		try{

			let gameAdAssetId = req.param("gameAdAssetId"),
			active = req.param("active"),
			userId = req.token.user.id;

			if(!active){
				active = false;
			}else{
				active = true;
			}

			let gameAdAssetUpdate = await GameAdAsset.update({id:gameAdAssetId,advertiser:userId},{active:active});

			if(!gameAdAssetUpdate){
				throw new CustomError('Could not change status of campaign.', { status: 401, err_code: "not_found" });
			}

			return res.ok({success:true});
		}catch(err){
			sails.log.error("WebAdertiserController.activateCampaign error: ",err);
			return util.errorResponse(err, res);
		}
	},



	async deleteFile(req,res){
		try{
			let gameAdAssetId = decodeURI(req.param("campaignId")),
			fileKey = req.param("fileKey");

			let gameAdAsset = await GameAdAsset.findOne({advertiser:req.token.user.id,id:gameAdAssetId});

			if (gameAdAsset.length === 0) {
				throw new CustomError('Could not find that campaign.', { status: 401, err_code: "not_found" });
			}

			// Remove file
			if(gameAdAsset[fileKey]){
				fs.unlink(sails.config.appPath + '/assets' + gameAdAsset[fileKey], function(err) {
			  		if (err){
						sails.log.error("WebAdvertiserController.deleteFile delete file error: ", err);
					}
				});

				// If no files exist against this campaign, it must be paused
				if(!gameAdAsset.resourceUrlHd && !gameAdAsset.resourceUrlSd && !gameAdAsset.resourceUrlImg){
					await GameAdAsset.update({id:gameAdAsset.id},{active:false,approved:false,[fileKey]:""});
				}else{
					await GameAdAsset.update({id:gameAdAsset.id},{[fileKey]:""});
				}
			}

			return res.ok();
		}catch(err){
			sails.log.error("WebAdertiserController.deleteFile error: ",err);
			return util.errorResponse(err, res);
		}
	},


};
