/**
 * MobileAppPlayerController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const BigNumber = require('bignumber.js'), moment = require('moment'), base64Img = require('base64-img');
const mysql = require('promise-mysql');
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

			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!deviceType || !email || !password || !deviceId) {
				if (locale == 'es' || locale == 'es_ES' || locale == "es-MX") {
					throw new CustomError("No proporcionó todos los detalles de registro necesarios.", { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError("Não providenciou todos os detalhes necessários para cadastro.", { status: 400 });
				} else {
					throw new CustomError("You did not provide all signup details required.", { status: 400 });
				}
			}

			let existingPlayerDevice = await Player.findOne({ email: email });

			// Player already exists
			if (existingPlayerDevice) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError("Este correo electrónico ya está registrado en otra cuenta. Inicie sesión en su cuenta con el siguiente correo electrónico: " + existingPlayerDevice.email, { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError("Este email já se encontra cadastrado com outra conta. Por favor efetue o Login usado o email seguinte: " + existingPlayerDevice.email, { status: 400 });
				} else {
					throw new CustomError("This email is already registered with another account. Please login to your account using the following email: " + existingPlayerDevice.email, { status: 400 });
				}
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

			let okMsg, subject, msg;

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: [deviceId], text: pin + " es tu pin de activación"  });
				okMsg = "Por favor revise su bandeja de entrada de correo electrónico para un pin de 6 dígitos e ingrese a continuación para activar su cuenta";
				subject = "Bienvenido a RaidParty! Activa tu cuenta para comenzar a ganar recompensas";
				msg = `¡Bienvenido a RaidParty! <br /> 
					Su cuenta ha sido creada y ahora está esperando su activación. Ingrese el PIN de 6 dígitos a continuación en la pantalla de activación del PIN en la aplicación móvil RaidParty.
					<br /><br /> 
					<strong>${pin}</ strong>
					<br />
					<br />
					Recuerde también ingresar su propia identificación de jugador de 7 caracteres en la configuración del juego, que encontrará en la página de la lista de juegos en la aplicación móvil.
					<br /> Esto es importante para poder rastrear la actividad de tu juego. 
					<br /><br /> 
					Mantén la calma, sigue jugando <br />
					El equipo de éxito de RaidParty`;
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: [deviceId], text: pin + " é o seu pino de ativação"  });
				okMsg = "Por favor verifique o seu email por um PIN de 6 Digitos e digite a seguir para ativar a sua conta";
				subject = "Bem vindo a RaidParty! Ative a sua conta e começe a ganhar recompensas ";
				msg = `Bem vindo a  RaidParty!<br />
					A sua conta foi criada e precisa de ser agora ativada. Por favor digite o PIN de 6 digitos de seguida na tela de ativação de PIN na aplicação RaidParty para celular.<br /><br />
					<strong>${pin}</strong><br /><br />
				   Lembre de introduzir o seu ID unico de 7 Digitos na pagina de definições do jogo, os jogos estão listados na aplicação .<br />
					Este passo é essencial de forma a seguir o seu processo no jogo selecionado.<br /><br />
					Sem Stress, Continue Jogando<br />
					A equipe RaidParty`;
			} else {
				await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: [deviceId], text: pin + " is your activation pin"  });
				okMsg = "Please check your email inbox for a 6 digit pin and enter below to activate your account";
				subject = "Welcome to RaidParty! Activate your account to start earning rewards";
				msg = `Welcome to RaidParty!<br />
					Your account has been created and is now awaiting your activation. Please enter the 6 digit PIN below into the PIN activation screen in the RaidParty mobile app.<br /><br />
					<strong>${pin}</strong><br /><br />
					Also remember to enter your own unique 7 character player ID into the game settings, which you will find in the games list page on the mobile app.<br />
					This is important so that your game activity can be tracked.<br /><br />
					Keep calm, keep playing<br />
					The RaidParty success team`;
			}


			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: player.email,
				toName: player.email,
				subject: subject,
				body: msg
			});


			/** Add to normal subscriber list **/
			MailchimpService.addSubscriber("bb2455ea6e", email, "", "", "pending", locale).then(function (addResponse) {
			}).catch(function (err) {
				sails.log.debug("new subscriber not added due to error: ", err);
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
	* Login Player
	*/
	async loginPlayer(req, res) {
		try {
			let email = req.param("email"),
				password = req.param("password"),
				locale = req.param("locale");
				
			if (!locale) {
				locale = 'en';
			}
				
			// Validate sent params
			if (!email || !password) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles de inicio de sesión requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários para Login.', { status: 400 });
				} else {
					throw new CustomError('You did not provide all login details required.', { status: 400 });
				}
			}

			let player = await Player.findOne({ email: email });

			// Player does not exist
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Esa cuenta no existe, verifique los detalles que ingresó', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Essa conta não existe, por favor verifique os detalhes novamente', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('That account does not exist, please check the details you entered', { status: 401, err_code: "not_found" });
				}
			}

			// Player is activated - try to login
			if (player.accountStatus == 2) {
				// Check password matches
				let isValidPassword = await Player.validatePassword(password, player.password);

				// Invalid password entered
				if (!isValidPassword) {
					sails.log.debug("MobileAppPlayerController.loginPlayer: invalid password given by player.");
					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
					} else {
						throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
					}
				}

				const rsp = {
					player: player,
					success: true,
					token: jwToken.issue({
						user: player.toJSON()
					}, "60 days")
				};

				return res.ok(rsp);
			}

			// Player is blocked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada. Por favor contáctenos si cree que esto es un error.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada. Por favor entre em contato caso pense que é um erro.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', { status: 403, err_code: "blocked" });
				}
			}

			// Player has not activated their account
			if (player.accountStatus == 1) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Su cuenta aún no ha sido activada. Por favor revise su correo electrónico para obtener un código PIN e ingrese para activar su cuenta.', { status: 401, err_code: "activate" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta ainda não foi ativada. Por favor verifique o seu email por um PIN para ativar a sua conta.', { status: 401, err_code: "activate" });
				} else {
					throw new CustomError('Your account has not yet been activated. Please check your email for a PIN code and enter to activate your account.', { status: 401, err_code: "activate" });
				}
			}

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Activate Player Account - using PIN
	*/
	async activatePlayer(req, res) {

		try {

			let pin = req.param("pin"),
				email = req.param("email"),
				locale = req.param("locale");
				
			if (!locale) {
				locale = 'en';
			}
			
			// Validate sent params
			if (!pin || !email) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles de inicio de sesión requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários para Login.', { status: 400 });
				} else {
					throw new CustomError('You did not provide all login details required.', { status: 400 });
				}
			}

			// PIN not long enough
			if (pin.length < 6) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('PIN no válido fue proporcionado', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Providenciou um PIN Inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('Invalid PIN was provided', { status: 401, err_code: "invalid_pin" });
				}
			}

			let player = await Player.findOne({ email: email });

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Pin does not match
			if (player.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (player.pinAttempts > 6) {
					let updatedPinAttempt = await Player.update({ id: player.id }, { accountStatus: 0 });
					let okMsg, subject, msg;

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						// Send player an email that their account has been blocked
						subject = "Su cuenta RaidParty ha sido bloqueada";
						msg = `ola<br />
						   Lamentamos informarle que su cuenta se ha bloqueado debido a demasiados intentos incorrectos de PIN para cambiar su contraseña.<br /><br />
						   Debe responder a este correo electrónico para confirmar su identidad y permitirnos garantizar que su cuenta esté segura. A continiación, reactivaremos su cuenta en función de una evaluación.<br />
						   Mantén la calma, sigue jugando<br />
						   El equipo exitoso de RaidParty`;
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						subject = "A sua conta RaidParty foi bloqueada.";
						msg = `Olá<br />
							   Lamentamos informar que a sua conta foi bloqueada devido a várias tentativas incorretas de alterar a sua palavra passe.<br /><br />
							   Deverá agora responder a este email de forma a confirmar a sua identidade assegurando que a sua conta está segura. Após verificação podemos desbloquear a conta.<br />
							   Sem Stress, Continue Jogando<br />
								A equipe RaidParty`;
					} else {
						subject = "Your RaidParty account has been locked";
						msg = `Hi<br />
							We are sorry to inform you that your account has been locked due to too many incorrect PIN attempts to change your password.<br /><br />
							You should reply to this email to confirm your identity and allow us to ensure your account is safe. We will then reactivate your account based on an assessment.<br />
							Keep calm, keep playing<br />
							The RaidParty success team`;
					}

					// Send activation email/SMS to player to activate their account
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'Account Team',
						toEmail: player.email,
						toName: player.email,
						subject: subject,
						body: msg
					});

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						throw new CustomError('Ha realizado demasiados intentos incorrectos de PIN. Su cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						throw new CustomError('PIN Introduzido erradamente por multiplas vezes.', { status: 403, err_code: "blocked" });
					} else {
						throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
					}
				}

				let updatedPinAttempt = await Player.update({ id: player.id }, { pinAttempts: player.pinAttempts + 1 });

				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('El PIN proporcionado no era válido', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('O PIN providenciado é inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}
			}

			// PIN is correct and player is allowed to enter
			let updatedPinAttempt = await Player.update({ id: player.id }, { accountStatus: 2, pinAttempts: 0, pin: 0 });

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				okMsg = "¡Éxito! Su cuenta ahora está activa";
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				okMsg = "Sucesso! A sua conta está agora ativa";
			} else {
				okMsg = "Success! Your account is now active";
			}

			const rsp = {
				player: player,
				success: true,
				isValid: true,
				msg: okMsg,
				token: jwToken.issue({
					user: player.toJSON()
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

			let player = await Player.findOne({ email: email });

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
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

			await Player.update({ id: player.id }, { pin: pin });

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				okMsg = 'Por favor, revise su bandeja de entrada para encontrar un PIN de restablecimiento de contraseña de 6 dígitos';
				subject = 'Bienvenido a RaidParty! Restablecer contraseña solicitada';
				msg = `Hola, 
					<br /> Usted solicitó un restablecimiento de contraseña. Ingrese el PIN de 6 dígitos a continuación en la pantalla de activación del PIN en la aplicación móvil RaidParty para restablecer su contraseña.<br /><br />
					<strong>${pin}</strong><br /><br />
					Mantén la calma, sigue jugando <br />
					El equipo exitoso de RaidParty`;
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				okMsg = 'Por favor verifique o seu email por um PIN de 6 Digitos para efetuar o reset';
				subject = 'Bem vindo a RaidParty! Requer reset da palavra passe';
				msg = `Olá,<br />
					 Pediu que a sua palavra passe fosse alterada. Por favor digite o PIN de 6 digitos na tela de ativação da aplicação RaidParty para efetuar o reset da sua palvra passe.<br /><br />
					 <strong>${pin}</strong><br /><br />
					Sem Stress, Continue Jogando<br />
					A equipe RaidParty`;
			} else {
				okMsg = 'Please check your inbox to find a 6 digit password reset PIN';
				subject = 'Welcome to RaidParty! Reset password requested';
				msg = `Hi,<br />
					You requested a password reset. Please enter the 6 digit PIN below into the PIN activation screen in the RaidParty mobile app to reset your password.<br /><br />
					<strong>${pin}</strong><br /><br />
					Keep calm, keep playing<br />
					The RaidParty success team`;
			}

			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Success Team',
				toEmail: player.email,
				toName: player.email,
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

			let player = await Player.findOne({ email: email });

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Pin does not match
			if (player.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (player.pinAttempts > 5) {
					let updatedPinAttempt = await Player.update({ id: player.id }, { accountStatus: 0 });
					let okMsg, subject, msg;

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						// Send player an email that their account has been blocked
						subject = "Su cuenta RaidParty ha sido bloqueada";
						msg = `Hola<br />
						   Lamentamos informarle que su cuenta se ha bloqueado debido a demasiados intentos incorrectos de PIN para cambiar su contraseña.<br /><br />
						   Debe responder a este correo electrónico para confirmar su identidad y permitirnos garantizar que su cuenta esté segura. A continiación, reactivaremos su cuenta en función de una evaluación.<br />
						   Mantén la calma, sigue jugando<br />
						   El equipo exitoso de RaidParty`;

						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: player.email,
							toName: player.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('Ha realizado demasiados intentos incorrectos de PIN. Su cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
					} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
						// Send player an email that their account has been blocked
						subject = "A sua conta RaidParty foi bloqueada.";
						msg = `Olá<br />
						   Lamentamos informar que a sua conta foi bloqueada devido a várias tentativas incorretas de alterar a sua palavra passe.<br /><br />
						   Deverá agora responder a este email de forma a confirmar a sua identidade assegurando que a sua conta está segura. Após verificação podemos desbloquear a conta.<br />
						   Sem Stress, Continue Jogando<br />
						A equipe RaidParty`;

						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: player.email,
							toName: player.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('PIN Introduzido erradamente por multiplas vezes. A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
					} else {
						// Send player an email that their account has been blocked
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
							toEmail: player.email,
							toName: player.email,
							subject: subject,
							body: msg
						});

						throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
					}
				}

				let updatedPinAttempt = await Player.update({ id: player.id }, { pinAttempts: player.pinAttempts + 1 });

				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('PIN no válido fue proporcionado', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('O PIN providenciado é inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}

			}

			// PIN is correct and player is allowed to enter
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
			let pin = req.param("pin"),
				email = req.param("email"),
				newPassword = req.param("password"),
				locale = req.param("locale");
				
			if (!locale) {
				locale = 'en';
			}

			// Validate sent params
			if (!email || !pin || !newPassword) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No proporcionó todos los detalles requeridos.', { status: 400 });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não providenciou todos os detalhes necessários', { status: 400 });
				} else {
					throw new CustomError('You did not provide all details required.', { status: 400 });
				}
			}

			let player = await Player.findOne({ email: email });

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Pin does not match
			if (player.pin != pin) {

				// If too many PIN attempts made, block their account, send email notifying user
				if (player.pinAttempts > 6) {
					let updatedPinAttempt = await Player.update({ id: player.id }, { accountStatus: 0 });

					if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
						let msg = `Hola<br />
						   Lamentamos informarle que su cuenta se ha bloqueado debido a demasiados intentos incorrectos de PIN para cambiar su contraseña.<br /><br />
						   Debe responder a este correo electrónico para confirmar su identidad y permitirnos garantizar que su cuenta esté segura. A continiación, reactivaremos su cuenta en función de una evaluación.<br />
						   Mantén la calma, sigue jugando<br />
						   El equipo exitoso de RaidParty`;
						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: player.email,
							toName: player.email,
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
							toEmail: player.email,
							toName: player.email,
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
						// Send activation email/SMS to player to activate their account
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'Account Team',
							toEmail: player.email,
							toName: player.email,
							subject: 'Your RaidParty account has been locked',
							body: msg
						});

						throw new CustomError('You have made too many incorrect PIN attempts. Your account has been locked.', { status: 403, err_code: "blocked" });
					}
				}

				let updatedPinAttempt = await Player.update({ id: player.id }, { pinAttempts: player.pinAttempts + 1 });

				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('PIN no válido fue proporcionado', { status: 401, err_code: "invalid_pin" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('O PIN providenciado é inválido', { status: 401, err_code: "invalid_pin" });
				} else {
					throw new CustomError('The PIN provided was invalid', { status: 401, err_code: "invalid_pin" });
				}
			}

			// TODO: Make sure password is valid

			// PIN is correct and player can change their password
			let updatedPassword = await Player.update({ id: player.id }, { password: newPassword, pinAttempts: 0, pin: 0 });

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
	* Get players dashboard
	*/
	async getPlayerDashboard(req, res) {
		try {
			let player = await Player.findOne({ id: req.token.user.id }),
				locale = req.param("locale");
				
			if (!locale) {
				locale = 'en';
			}

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Player is not active
			if (player.accountStatus == 1) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta no ha sido activada todavía. Por favor revise su correo electrónico', { status: 403, err_code: "activate" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta ainda não foi ativada. Por favor verifique o seu email ', { status: 403, err_code: "activate" });
				} else {
					throw new CustomError('Your account has not been activated yet. Please check your email', { status: 403, err_code: "activate" });
				}
			}

			if (!player.forceBalance) {
				player.forceBalance = '0';
			}

			// Work out FORCE balance in dollar
			let forceTotal = new BigNumber(player.forceBalance);

			player.totalForce = forceTotal.toFormat(6);

			player.totalForceUSD = parseInt(forceTotal) * 0.11;

			return res.ok({ success: true, player: player });
		} catch (err) {
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

			let player = await Player.findOne({ id: req.token.user.id });

			// Could not find that account
			if (!player) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('No se pudo encontrar una cuenta con esos detalles. Por favor verifique sus detalles y vuelva a intentarlo.', { status: 401, err_code: "not_found" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('Não foi possivel encontrar uma conta com estes detalhes. Por favor verifique os seus detalhes e tente novamente.', { status: 401, err_code: "not_found" });
				} else {
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', { status: 401, err_code: "not_found" });
				}
			}

			// Player is locked
			if (player.accountStatus == 0) {
				if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
					throw new CustomError('Tu cuenta ha sido bloqueada.', { status: 403, err_code: "blocked" });
				} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
					throw new CustomError('A sua conta foi bloqueada.', { status: 403, err_code: "blocked" });
				} else {
					throw new CustomError('Your account has been blocked.', { status: 403, err_code: "blocked" });
				}
			}

			// Check current password entered is valid
			let validPassword = await Player.validatePassword(currentPassword, player.password);

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
			let updatedPassword = await Player.update({ id: player.id }, { password: newPassword });

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
	* Get list of active games
	*/
	async getGames(req, res) {
		try {
			let deviceType = req.param("device_type").toLowerCase(),
				locale = req.param('locale'),
				excludePlatform = 'android',
				game, prizeList, prize, reward, gameItem, platformAvailable,
				rules,
				ruleLocale,
				description,
				descriptionLocale;

			if (deviceType == 'android') {
				excludePlatform = 'ios';
			}

			if (!locale) {
				locale = 'en';
			}

			moment.locale(locale);

			// Get games we need for this device
			let games = await Game.find({ active: true, startDate: { '<=': new Date() }, endDate: { '>=': new Date() } }).populate('rewardCampaign').populate('gamePlatforms');

			finalGamesList = [];
			for (game of games) {

				// Go through each platform to check this is available on their platform
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
					// TODO: Whether the player has qualified for this reward
					// TODO: ?? Ionic might be fine displaying html ?? Strip HTML out of rules, for display purposes in mobile app

					// Reward is not currently live - skip listing it
					if (moment().isSameOrBefore(reward.startDate) || moment().isSameOrAfter(reward.endDate)) {
						continue;
					}

					// Reward has no more entries available
					if (reward.maxQualifyingPlayers < 1) {
						continue;
					}

					if (reward.value <= 0) {
						continue;
					}

					// Ensure we set the correct language for the rules
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
				game.avatar = base64Img.base64Sync(sails.config.appPath + '/assets/images/games/banners/' + game.avatar);

				gameItem = { game_id: game.gameId, title: game.title, reward: game.rewardAvailable, description: game.description, jackpot: game.jackpot, bannerContent: game.bannerContent, link: game.link, platform: game.platform, avatar: game.avatar, prizes: prizeList };

				finalGamesList.push(gameItem);
			}

			return res.ok({ games: finalGamesList });
		} catch (err) {
			sails.log.debug("this is an err", err);
			return util.errorResponse(err, res);
		}
	},



	/**
	* Get the last 25 rewards
	*/
	async getRewards(req, res) {
		try {
			// Get games we need for this device
			let rewards = await PlayerRewards.find({ player: req.token.user.id }).populate("player").populate("game").sort("id DESC").limit("25");

			rewards = _.map(rewards, function (reward) {
				return { reason: reward.reason, amount: reward.amount, currency: reward.currency, avatar: reward.avatar, link: reward.link, created_at: reward.createdAt, game: { title: reward.game.title } };
			});

			return res.ok({ rewards: rewards });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},


	/**
	* Get player code
	*/
	async getPlayerCode(req, res) {
		try {

			// Get games we need for this device
			let player = await Player.findOne({ id: req.token.user.id });

			if (!player) {
				throw new CustomError('Could not find that player.', { status: 401, err_code: "not_found" });
			}

			if (!player.code || player.code.length == 0 || player.code == '') {
				let playerCode = await PlayerService.generatePlayerSdkCode(player.id, 0);

				if (!playerCode) {
					throw new CustomError('Could not generate a new unique code for that player at this time.', { status: 401, err_code: "server_err" });
				}

				player.code = playerCode;
			}
			
			if(!player.deviceId){
				player.deviceId = '';
			}

			return res.ok({ code: player.code, device_id: player.deviceId });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Get notifications against a player
	*/
	async getNotifications(req, res) {
		try {

			// Get games we need for this device
			let player = await Player.findOne({ id: req.token.user.id }).populate('notifications', { sort: 'createdAt DESC' });

			if (!player) {
				throw new CustomError('Could not find that player.', { status: 401, err_code: "not_found" });
			}

			return res.ok({ notifications: player.notifications });
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Delete a player notification
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


	sendEmailsToAirdropUsers: async function (req, res) {

		// External Connection to Mysql database server.
		// Replace the Creds with actual ones.
		const connection = await mysql.createConnection({
		  adapter: 'sails-mysql',
		  host: '178.62.109.184',
		  user: 'triforcer236',
		  password: 'ji4Zr56Bu72FY',
		  database: 'triforcetokens_live'
		});

		const players = await Player.find({ accountStatus: 2 });

		if (!players) {
			return new CustomError("No Active Players found in the network.");
		}

		let airdropUsers = await connection.query('SELECT * from airdropusers');

		if (!airdropUsers) {
			return new CustomError("Failed to fetch Airdrop users from remote database.")
		}
		airdropUsers = JSON.parse(JSON.stringify(airdropUsers));

		// Loop through each airdrop user and player to check if their account is active and exists as a player. 
		_.each(airdropUsers, async (airdropUser) => {
			_.each(players, async (player) => {
				if ((player.email === airdropUser.email) && !_.isEmpty(airdropUser.tempPassword) && (player.accountStatus === 2) && !_.isEmpty(player.code)) {
					const message = `Dear user,\n
					You pre-registered for a RaidParty account. The app is currently only availabe on Android devices. You will need to download the RaidParty player app
					on the <a href="https://play.google.com/store/apps/details?id=com.app.Raidparty">google play store here</a>, then use the login details below to access your account:\n
					Registered email: ${player.email}\n
					Password: ${airdropUser.tempPassword}\n
					Player Code: ${player.code}\n\n
					Our team are awaiting approval for listing of our app on iOS. We will send an email once it has gone live.`;
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'RaidParty Support',
						toEmail: player.email,
						toName: player.email,
						subject: 'Your RaidParty player account details',
						body: message
					});
				}
			})
		})
		// console.log(filteredAirdropUsers);
		res.ok("User have been notified via email");

	},


	sendEmailsToPlayersWithoutCode: async function (req, res) {

		const nonActivatedPlayers = await Player.find({ accountStatus: 1 });

		if (_.isEmpty(nonActivatedPlayers)) {
			return new CustomError("Failed to fetch players from the database");
		}

		_.each(nonActivatedPlayers, async (player) => {
			// Check where player code is empty for the player.
			if (_.isEmpty(player.code)) {
				const playerCode = await PlayerService.generatePlayerSdkCode(player.id, 0);
				if (playerCode) {
					const tempPassword = util.getPlayerGameCode(8);
					let updatedPlayer = await Player.update({ id: player.id }, { password: tempPassword, accountStatus: 2 });
					if (!_.isEmpty(updatedPlayer)) {
						const message = `Congrats! We have activated your account on RaidParty. Please find your account details below to login to the app with.<br />
							Registered email: ${updatedPlayer[0].email}<br />
							Temporary Password: ${tempPassword}<br />
							Player Code: ${updatedPlayer[0].code}<br /><br />
							You can download the <a href="https://play.google.com/store/apps/details?id=com.app.Raidparty">RaidParty app for Android here</a> and login using the details above.<br />
							Our team are awaiting approval for listing of our app on iOS. We will send an email once it has gone live.`;
						await EmailService.sendEmail({
							fromEmail: 'support@raidparty.io',
							fromName: 'RaidParty Support',
							toEmail: updatedPlayer[0].email,
							toName: updatedPlayer[0].email,
							subject: 'Your raidparty player account details',
							body: message
						});
					}
				}

			}
		})

		return res.ok("success");
	},
	
	
	
	/**
	* Device Data update player
	*/
	async deviceData(req, res) {
		try {
			let deviceType = req.param("device_type").toLowerCase(),
				deviceId = req.param("device_id");
				
			// Get games we need for this device
			let player = await Player.findOne({id: req.token.user.id});

			if (!player) {
				throw new CustomError('Could not find that player.', { status: 401, err_code: "not_found" });
			}
			
			await Player.update({id:player.id},{deviceId:deviceId,deviceType:deviceType});

			return res.ok({success:true});
		} catch (err) {
			return util.errorResponse(err, res);
		}
	},

	
	
};
