/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const sha1 = require('sha1');

module.exports = {


	async signupPlayer(req, res) {

		const email = req.param("email"),
			firstName = req.param("firstName"),
			lastName = req.param("lastName"),
			password = req.param("password"),
			deviceType = req.param("device_type"),
			referral = req.param("referral"),
			locale = req.param("locale");

		try {

			// Validate sent params
			if (!deviceType || !email || !password) {
				throw new CustomError(sails.__("You did not provide all signup details required."), { status: 400 });
			}
			
			if(!referral){
				referral = "";
			}

			if (!locale) {
				locale = 'en';
			}
			
			// Validate against a password string
			if(!util.isValidPassword(password)){
				throw new CustomError(sails.__("You did not provide a valid password. It must be greater than 6 characters, contain one uppercase character and at least one digit"), { status: 400 });
			}

			let existingPlayerDevice = await Player.findOne({ email: email });

			// Player already exists
			if (existingPlayerDevice) {
				throw new CustomError(sails.__("This email is already registered with another account. Please login to your account using the following email: ") + existingPlayerDevice.email, { status: 400 });
			}

			// Create activation PIN
			let pin = util.randomFixedInteger(6);

			// Create new player account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let player = await Player.create({
				email: email,
				password: password,
				deviceType: deviceType,
				pin: pin,
				accountStatus: 1,
				forceBalance: '0',
				firstName: firstName,
				lastName: lastName,
				referral: referral
			});

			// Create the users wallet
			//WalletService.createUserWallet(player.id).catch(err=>{sails.log.error('On signup, failed to create player wallet: ', err)});
			
			let subject, msg;

			if (locale == 'es' || locale == 'es_ES' || locale == 'es-MX') {
				subject = "Bienvenido a RaidParty! Activa tu cuenta para comenzar a ganar recompensas";
				msg = `¡Bienvenido a RaidParty! <br /> 
					Tu cuenta ha sido creada. Descargue la <a href="https://play.google.com/store/apps/details?id=com.app.Raidparty">aplicación móvil RaidParty aquí</a> para usuarios de Android e inicie sesión con su correo electrónico y contraseña creada. 
					<br />
					Si tiene un dispositivo con iOS, espere hasta que nuestro equipo lance la versión de iOS de la aplicación. <br />
					Recuerde también ingresar su propia identificación de jugador de 7 caracteres en la configuración del juego, que encontrará en la página de la lista de juegos en la aplicación móvil. <br />
					Esto es importante para poder rastrear la actividad de tu juego. <br /> <br />
					El equipo de éxito de RaidParty`;
			} else if (locale == 'pt' || locale == 'pt_PT' || locale == 'pt-BR') {
				subject = "Bem vindo a RaidParty! Ative a sua conta e começe a ganhar recompensas ";
				msg = `Bem-vindo ao RaidParty! <br />
						Sua conta foi criada. Faça o download do <a href="https://play.google.com/store/apps/details?id=com.app.Raidparty">aplicativo móvel RaidParty aqui</a> para usuários do Android e faça login usando seu e-mail e senha criada. <br />
						Se você tiver um dispositivo iOS, aguarde até que nossa equipe libere a versão iOS do aplicativo. <br />
						Lembre-se também de inserir seu próprio ID de 7 caracteres exclusivo nas configurações do jogo, que você encontrará na página da lista de jogos no aplicativo móvel. <br />
						Isso é importante para que sua atividade no jogo possa ser rastreada. <br /> <br />
						A equipe de sucesso do RaidParty`;
			} else {
				subject = "Welcome to RaidParty! Activate your account to start earning rewards";
				msg = `Welcome to RaidParty!<br />
					Your account has been created. Please download the <a href="https://play.google.com/store/apps/details?id=com.app.Raidparty">RaidParty mobile app here</a> for Android users and login using your email and password created.<br />
					If you have an iOS device please wait until our team release the iOS version of the app.<br />
					Also remember to enter your own unique 7 character player ID into the game settings, which you will find in the games list page on the mobile app.<br />
					This is important so that your game activity can be tracked.<br /><br />
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
			MailchimpService.addSubscriber("bb2455ea6e", email, firstName, lastName, "pending", locale).then(function (addResponse) {
			}).catch(function (err) {
				sails.log.debug("new subscriber not added due to error: ", err);
			});

			return res.ok({
				success: true,
			});

		} catch (err) {
			return util.errorResponse(err, res);
		}
	},



	/**
	* Track a player request from a game using their device ID
	* Route: /sdk/player/track
	*/
	async trackPlayer(req, res) {

		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerCode = req.param('user_id'),
				developersPlayerId = req.param('my_id');

			// Ensure Auth Key is set and a valid key format
			if (typeof authKey == 'undefined' || authKey.length < 40) {
				sails.log.debug("trackerPlayer : Not a valid request");
				// TODO: add a log that a bad request was made
				return res.json('400', { 'reason': 'You did not provide a valid request' });
			}

			// Make sure valid information was sent
			if (typeof playerCode == 'undefined' || playerCode.length < 1) {
				sails.log.debug("trackerPlayer : No valid user_id provided");
				return res.json('400', { 'reason': 'You did not provide a valid user_id of the player' });
			}

			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({ publicKey: publicKey }).populate('developer');

			// Game was not found with public key
			if (!game) {
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ", publicKey);
				return res.json('403', { 'reason': 'Could not discover a record with details sent.' });
			}


			// Authenticate the request
			if (!SdkAuth.validAuthKey(authKey, publicKey, game.privateKey, '/sdk/player/track', playerCode)) {
				sails.log.debug("trackerPlayer : Invalid auth_key was sent");
				// TODO: add a log that a bad request was made
				return res.json('400', { 'reason': 'You did not provide a valid request' });
			}


			// Attempt to find this player
			let player = await Player.findOne({ code: playerCode }).populate('games');

			// Player not found - invite them to use RaidParty
			if (!player) {
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network.");
				return res.json('403', { 'reason': 'Player is not within RaidParty network. Could not discover a record with details sent.' });
			}

			// Check to see if this player is already registered against this game
			/*let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});*/

			let playerLinkedToGameState = await PlayerToGame.findOne({ player: player.id, game: game.id });

			// Player is not linked to this game
			if (!playerLinkedToGameState) {
				let linkPlayerToGame = await PlayerToGame.create({ player: player.id, game: game.id, myId: developersPlayerId, lastLogin: new Date() });

				playerData = {
					id: player.playerId,
					last_login: linkPlayerToGame.lastLogin,
					created_at: linkPlayerToGame.createdAt,
					my_id: linkPlayerToGame.myId
				}

				return res.json('201', { playerData });
			} else {
				// Record this player accessed the game
				let linkPlayerToGame = await PlayerToGame.update({ id: playerLinkedToGameState.id }, { lastLogin: new Date() });

				playerData = {
					id: player.playerId,
					last_login: linkPlayerToGame[0].lastLogin,
					created_at: linkPlayerToGame[0].createdAt,
					my_id: linkPlayerToGame[0].myId
				}

				return res.json('201', { playerData });
			}

		} catch (err) {
			util.errorResponse(err, res);
		}
	},





	/**
	* Track an in-game event
	* Route: /sdk/game/event
	*/
	async trackEvent(req, res) {

		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerCode = req.param('user_id'),
				eventId = req.param('event_id'),
				eventValue = req.param('event_value'),
				eventTypeId = req.param('event_type_id');

			// Ensure Auth Key is set and a valid key format
			if (typeof authKey == 'undefined' || authKey.length < 40) {
				sails.log.debug("PlayerController.trackerEvent: Not a valid request");
				// TODO: add a log that a bad request was made
				return res.json('400', { 'reason': 'You did not provide a valid request' });
			}

			// Make sure valid information was sent
			if (typeof playerCode == 'undefined' || playerCode.length < 1) {
				sails.log.debug("PlayerController.trackerEvent: No valid user_id provided");
				return res.json('400', { 'reason': 'You did not provide a valid user_id of the player' });
			}

			// Event ID is required
			if (typeof eventId == 'undefined' || eventId.length < 1) {
				sails.log.debug("PlayerController.trackerEvent: Invalid event ID");
				return res.json('400', { 'reason': 'Invalid event ID. Event ID is required.' });
			}

			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({ publicKey: publicKey }).populate('developer');

			// Game was not found with public key
			if (!game) {
				sails.log.debug("PlayerController.trackerEvent: Could not find that game with the public key: ", publicKey);
				return res.json('403', { 'reason': 'Could not discover a record with details sent.' });
			}


			// Authenticate the request
			if (!SdkAuth.validAuthKey(authKey, publicKey, game.privateKey, '/sdk/game/event', playerCode + ':' + eventId)) {
				sails.log.debug("PlayerController.trackerEvent: Invalid auth_key was sent");
				// TODO: add a log that a bad request was made
				return res.json('400', { 'reason': 'You did not provide a valid request' });
			}


			// Attempt to find this player
			let player = await Player.findOne({ code: playerCode }).populate('games');

			// Player not found - invite them to use RaidParty
			if (!player) {
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("PlayerController.trackerEvent: Player not found in RaidParty network. Inviting player to join.");
				return res.json('403', { 'reason': 'Player is not within RaidParty network. They have been invited.' });
			}

			// Record this event against the player and game
			let recordGameEvent = await PlayerToGameEvent.create({ player: player.id, gameEvent: eventId, eventValue: eventValue });

			if (!recordGameEvent) {
				sails.log.debug("PlayerController.trackEvent: Could not record that game event");
				return res.json('403', { 'reason': 'The game event could not be tracked.' });
			}
			
			// Send the response in advance as API request has done its job.
			res.json('201', recordGameEvent);
			
			// Check if this event is attached to a reward campaign event of type 2 (instant win, but one time)
			if (!eventTypeId) {
			}
			// If eventTypeId is 2, it means it is an instant win
			else if (eventTypeId == 2) {
				let dateNow = new Date();
				let activeRewardCampaigns = await RewardCampaign.find({ game: game.id, rewardTypeId: 2, rewardProcessed: false, maxWinningPlayers: { '>': 0 }, startDate: { '<=': dateNow }, endDate: { '>=': dateNow } })
					.populate('rewardCampaignGameEvents');
					
				if (!activeRewardCampaigns) {
					sails.log.debug("PlayerController.trackEvent: No reward campaign game events found for that.");
				} else {

					// Cycle through each reward campaign
					let totalEventsToComplete = 0,
						playerCompletedEvents = 0;
						
					for (const rewardCampaign of activeRewardCampaigns) {
						if (!rewardCampaign.rewardCampaignGameEvents) {
							sails.log.debug("PlayerController.trackEvent: No reward campaign game events found for this reward campaign.", rewardCampaign);
							continue;
						}

						totalEventsToComplete = rewardCampaign.rewardCampaignGameEvents.length;
						playerCompletedEvents = 0;

						// Make sure the player has not already been rewarded this
						let playerRewardedAlready = await QualifiedPlayers.findOne({ players: player.id, rewardCampaign: rewardCampaign.id, isWinner: true });

						// Player already claimed this reward
						if (playerRewardedAlready) {
							sails.log.debug("PlayerController.trackEvent: the player has already been rewarded for this");
							continue;
						}

						// Cycle through each reward campaign required event
						for (const rewardCampaignEvent of rewardCampaign.rewardCampaignGameEvents) {

							// Check if player has achieved this particular event on this occassion
							if (rewardCampaignEvent.valueMin <= eventValue && rewardCampaignEvent.valueMax >= eventValue) {
								sails.log.debug("The player has completed an event for reward: ");
								playerCompletedEvents++;
							}
						}

						// The player has completed all the neccessary events for this reward, 
						// to be rewarded
						if (playerCompletedEvents >= totalEventsToComplete) {
							sails.log.debug("The player has completed all events required for reward");
							let rewardPlayer = await QualifiedPlayers.create({ players: player.id, game: game.id, rewardCampaign: rewardCampaign.id, isWinner: true, points: 1 });
							let issueReward = await PlayerRewards.create({ player: player.id, game: game.id, reason: rewardCampaign.reason, currency: rewardCampaign.currency, amount: rewardCampaign.value, rewardCampaign: rewardCampaign.id });

							// Reduce total potential winners now
							await RewardCampaign.update({ id: rewardCampaign.id }, { maxWinningPlayers: rewardCampaign.maxWinningPlayers - 1 });

							// TODO: Send push notification that player won this reward
							let message = "You got an instant win!";
							await PlayerNotifications.create({ title: "Instant Win", message: message, players: player.id });
						}
					}
				}
				
			}

		} catch (err) {
			util.errorResponse(err, res);
		}
	},



	async getPlayerCount(req, res) {
		try {
			let totalPlayers = await Player.count();
			return res.ok({ totalPlayers });
		} catch (err) {
			sails.log.debug("Get Player Count fired error: ", err);
			return res.serverError();
		}
	}


};
