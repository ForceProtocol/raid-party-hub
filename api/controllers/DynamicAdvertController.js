/**
 * DynamicAdvertController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const moment = require('moment'),
request = require('request-promise');

module.exports = {


    async startSession(req,res){

        try{
            let gameId = req.param("gameId"),
            playerId = req.param("player_id"),
            playerIp = req.param("player_ip"),
            clientRemoteIp = req.connection.remoteAddress;

            if(playerIp != clientRemoteIp){
                playerIp = clientRemoteIp;
            }

            if(!gameId || !playerId){
                throw new CustomError('Missing params: Require game_id, player_id and player_ip', { status: 400, err_code: "bad_request" });
            }

            // Get the game ensure it exists
            let game = await Game.findOne({gameId:gameId});

            if(!game){
                throw new CustomError('Could not find that game', { status: 404, err_code: "not_found" });
            }

            sails.log.error("Player IP received: " + playerIp);

            // Set player ID to store in database
            let storedPlayerId = GameAdvertService.generatePlayerId(playerId,game.id);

            // See if player already exist
            let player = await PlayerToGameAdSession.findOne({playerId:storedPlayerId});

            if(!player){

                // Find players location info
                let playerLocation = await GameAdvertService.getPlayerLocation(playerIp);

                if(!playerLocation || playerLocation.success === false){
                    playerLocation = {country_code:'',region_code:'',region_name:'',city:'',longitude:0,latitude:0};
                    playerIp = '';
                }

                // Create the player
                let player = await PlayerToGameAdSession.create({playerId:storedPlayerId,ip:playerIp,
                    countryCode: playerLocation.country_code,
                    regionCode:playerLocation.region_code,
                    regionName:playerLocation.region_name,city:playerLocation.city,longitude:playerLocation.longitude,
                    latitude:playerLocation.latitude});

                if(!player){
                    throw new CustomError('Player could not be registered', { status: 500, err_code: "server_error" });
                }
            }


            return res.ok({success:true});
        }catch(err){
            sails.log.error("DynamicAdvertController.startSession err: ",err);
            status = 500;
            if(err.status){
                status = err.status;
            }

            if(err.msg){
                err = err.msg;
            }

            delete err.stack;

            return res.json(status,{success:false,err:err});
        }
    },



    /**
    * End a game session that had a advert campaigns running
    */
    async endSession(req,res){

        try{

            let gameId = req.param("gameId"),
            playerId = req.param("player_id"); // Games own player ID

            if(!gameId || !playerId){
                throw new CustomError('Missing params: Require game_id and player_id', { status: 400, err_code: "bad_request" });
            }

            // Get the game ensure it exists
            let game = await Game.findOne({gameId:gameId});

            if(!game){
                throw new CustomError('Could not find that game', { status: 404, err_code: "not_found" });
            }

            let storedPlayerId = GameAdvertService.generatePlayerId(playerId,game.id);

            // Make sure this game ad asset exists
            let activeGameAdSessions = await GameAdSession.find({game:game.id,player:storedPlayerId,sessionTime: 0});

            if(!activeGameAdSessions){
                return res.ok({success:true});
            }

            // Work out session time of each game ad session
            let sessionEndTime = 0,
            startTime,
            endTime = moment(new Date());
            for(const gameAdSession of activeGameAdSessions){
                startTime = moment(gameAdSession.createdAt);
                sessionEnd = endTime.diff(startTime,'seconds');

                await GameAdSession.update({id:gameAdSession.id},{sessionTime:sessionEnd});
            }

            return res.ok({success:true});
        }catch(err){
            sails.log.error("DynamicAdvertController.endSession err: ",err);
            status = 500;
            if(err.status){
                status = err.status;
            }

            if(err.msg){
                err = err.msg;
            }

            delete err.stack;

            return res.json(status,{success:false,err:err});
        }
    },




    async findAdvertForGameObject(req,res){
        try{
            let gameId = req.param("gameId"),
            playerId = req.param("player_id"),
            gameAssetId = req.param("game_object_id");

            if(!gameId || !gameAssetId){
                throw new CustomError('Invalid Params Sent', { status: 404, err_code: "not_found" });
            }

            // Make sure this game exists
            let game = await Game.findOne({gameId:gameId});

            if(!game){
                throw new CustomError('Could not find your game', { status: 404, err_code: "not_found" });
            }

            // Find player location
            playerId = GameAdvertService.generatePlayerId(playerId,game.id);
            let playerData = await PlayerToGameAdSession.findOne({playerId:playerId});

            if(!playerData){
                throw new CustomError('Could not find that stored player', { status: 404, err_code: "not_found" });
            }

            // Find live campaigns and select which ones to send back
            let gameAdAssets = await GameAdAsset.find({gameAsset: gameAssetId, availableBudget: {'>': 0},
                game: game.id, active:true, approved: true, 
                startDate: {'<=': new Date()}, endDate: {'>=': new Date()}
            }).populate('gameAsset').populate("game").populate("gameAdAssetRegion"),
            gameAdvertData = {},
            gameAdvertsAvailable = [],
            selectedGameAdAsset = {},
            gameObjectTextures,
            gameObjectTextureUrl,
            probabilityMax = 0,
            advertType = '';


            for (const gameAdAsset of gameAdAssets) {

                // Make sure advert is the right region for player
                if(gameAdAsset.gameAdAssetRegion.length > 0){
                    let countryCode = gameAdAsset.gameAdAssetRegion.find(function(region){
                        return region.countryCode === playerData.countryCode;
                    });

                    if(!countryCode){
                        continue;
                    }
                }

                // Set the game asset URL
                if(gameAdAsset.gameAsset.type == 'screen'){
                    advertType = 'video';
                }else if(gameAdAsset.gameAsset.type == 'texture'){
                    advertType = 'texture';

                    // Store all game textures needed for this game object
                    gameObjectTextures = gameAdAsset.textures;
                }
                // The game asset type set for this is not recognised
                // Must be type 'screen' or 'texture'
                else{
                    continue;
                }

                // Set max bid to whole number
                gameAdAsset.maxBid = gameAdAsset.maxBid * 100;

                gameAdvertData = {
                    advertId: gameAdAsset.id,
                    adverts: [gameAdAsset.id],
                    textures: gameObjectTextures,
                    resourceUrlHd: gameAdAsset.resourceUrlHd,
                    resourceUrlSd: gameAdAsset.resourceUrlSd,
                    videos: [{hd:gameAdAsset.resourceUrlHd,sd:gameAdAsset.resourceUrlSd}],
                    maxBid: gameAdAsset.maxBid
                };

                // increment probability max value
                probabilityMax += gameAdAsset.maxBid;

                gameAdvertsAvailable.push(gameAdvertData);
            }


            // No adverts available
            if(gameAdvertsAvailable.length < 1){
                 return res.ok({});
            }
            
            // Game object is a video. Find at most two adverts
            else if(advertType == 'video'){

                setAdvertsProbability = GameAdvertService.setAdvertsProbability(gameAdvertsAvailable);
                gameAdvertsAvailable = setAdvertsProbability.gameAdvertsAvailable;
                probabilityMax = setAdvertsProbability.probabilityMax;

                // Set the winning adverts
                selectedGameAdAsset = await GameAdvertService.getWinningVideoAdverts(probabilityMax,gameAdvertsAvailable);
            }

            // Game object is a texture - find one advert
            else if(advertType == 'texture'){
                setAdvertsProbability = GameAdvertService.setAdvertsProbability(gameAdvertsAvailable);
                gameAdvertsAvailable = setAdvertsProbability.gameAdvertsAvailable;
                probabilityMax = setAdvertsProbability.probabilityMax;

                // Set the winning advert
                selectedGameAdAsset = await GameAdvertService.getWinningTextureAdverts(probabilityMax,gameAdvertsAvailable);
            }else{
                return res.ok({});
            }


            // Start the game advert session
            for(const activeAdvert of selectedGameAdAsset.adverts){
                GameAdSession.create({gameAdAsset:activeAdvert,sessionTime:0,player:playerId,game:game.id}).exec(function(err,created){
                    if(err){
                        sails.log.debug("could not update an active advert campaign: ",err);
                    }
                });
            }

            return res.ok(selectedGameAdAsset);
        }catch(err){
            sails.log.error("DynamicAdvertController.findAdvertForGameObject err: ",err);
            status = 500;
            if(err.status){
                status = err.status;
            }

            if(err.msg){
                err = err.msg;
            }

            delete err.stack;

            return res.json(status,{success:false,err:err});
        }
    },




    async testStartSession(req,res){
        try{

            // Create a dummy game
            sails.log.debug("DynamicAdvertController.testStartSession initiated");
            let game = await Game.create({title:"testing",description:"wdawd",avatar:"adwawd"}),
            playerId = "2988973834",
            playerIp = "37.122.196.70";

            // Create dummy
            let startGameSession = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/start-session/' + game.gameId,
                json: true,
                body: {
                    player_id:playerId,
                    player_ip:playerIp
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });

            // Destroy game after test
            await Game.destroy({id:game.id});

            return res.ok(startGameSession);
        }catch(err){
            return res.serverError(err);
        }

    },


    async testEndSession(req,res){
        try{

            // Create a dummy game
            sails.log.debug("DynamicAdvertController.testEndSession initiated");
            let game = await Game.create({title:"testing",description:"wdawd",avatar:"adwawd"}),
            playerId = "2988973834",
            playerIp = "37.122.196.70";

            storedPlayerId = GameAdvertService.generatePlayerId(playerId,game.id);

            // Create game session to test
            let gameSession = await GameAdSession.create({gameAdAsset:1,player:storedPlayerId,game:game.id});

            // Create dummy
            let endGameSession = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/end-session/' + game.gameId,
                json: true,
                body: {
                    player_id:playerId,
                    player_ip:playerIp
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });

            sails.log.debug("endGameSession Response: ",endGameSession);

            // Destroy game after test
            await Game.destroy({id:game.id});

            return res.ok(endGameSession);
        }catch(err){
            return res.serverError(err);
        }

    },


    async testFindVideoAdvertForGameObject(req,res){
        try{

            // Create a dummy game
            let game = await Game.create({title:"testing",description:"wdawd",avatar:"adwawd"});

            // Create dummy game asset
            let gameAsset1 = await GameAsset.create({game:game.id,type:'screen',active:true});

            // Create dummy advert campaigns
            let advert1 = await GameAdAsset.create({active:true,approved:true,maxBid:4.0,dailyBudget:100.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                resourceUrlHd:"testlink1",resourceUrlSd:"testLink1",
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert1Region1 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"GB",region:227});
            let advert1Region2 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"AF",region:1});
            let advert1Region3 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"AL",region:2});


            let advert2 = await GameAdAsset.create({active:true,approved:true,maxBid:2.0,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                resourceUrlHd:"testlink2",resourceUrlSd:"testLink2",
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert2Region1 = await GameAdAssetRegion.create({gameAdAsset:advert2.id,countryCode:"AF",region:1});

            let advert3 = await GameAdAsset.create({active:true,approved:true,maxBid:2.0,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                resourceUrlHd:"testlink3",resourceUrlSd:"testLink3",
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert3Region1 = await GameAdAssetRegion.create({gameAdAsset:advert3.id,countryCode:"AF",region:1});

            let advert4 = await GameAdAsset.create({active:true,approved:true,maxBid:1.5,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                resourceUrlHd:"testlink4",resourceUrlSd:"testLink4",
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert4Region1 = await GameAdAssetRegion.create({gameAdAsset:advert4.id,countryCode:"AF",region:1});

            // Create game session
            let playerId = "2988973834",
            playerIp = "37.122.196.70";
            let startGameSession = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/start-session/' + game.gameId,
                json: true,
                body: {
                    player_id:playerId,
                    player_ip:playerIp
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });

            // Create dummy
            let adverts = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/game-object/' + game.gameId,
                json: true,
                body: {
                    player_id:playerId,
                    game_object_id:gameAsset1.id
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });


            // Destroy game after test
            await GameAdAsset.destroy({id:advert1.id},{id:advert2.id},{id:advert3.id},{id:advert4.id});
            await GameAdAssetRegion.destroy({id:advert1Region1.id},{id:advert1Region2.id},
                {id:advert1Region3.id},{id:advert2Region1.id},{id:advert3Region1.id}),{id:advert4Region1.id};
            await GameAsset.destroy({id:gameAsset1.id});
            await Game.destroy({id:game.id});

            return res.ok(adverts);
        }catch(err){
            return res.serverError(err);
        }
    },


     async testFindTextureAdvertForGameObject(req,res){
        try{

            // Create a dummy game
            let game = await Game.create({title:"testing",description:"wdawd",avatar:"adwawd"});

            // Create dummy game asset
            let gameAsset1 = await GameAsset.create({game:game.id,type:'texture',active:true});

            let textures = [{a:"http://a"},{b:"http://b"},{c:"http://c"}],
            texture = [{a:"http://a"}];


            // Create dummy advert campaigns
            let advert1 = await GameAdAsset.create({active:true,approved:true,maxBid:4.0,dailyBudget:100.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                textures:textures,
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert1Region1 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"GB",region:227});
            let advert1Region2 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"AF",region:1});
            let advert1Region3 = await GameAdAssetRegion.create({gameAdAsset:advert1.id,countryCode:"AL",region:2});


            let advert2 = await GameAdAsset.create({active:true,approved:true,maxBid:2.0,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                textures:textures,
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert2Region1 = await GameAdAssetRegion.create({gameAdAsset:advert2.id,countryCode:"GB",region:1});

            let advert3 = await GameAdAsset.create({active:true,approved:true,maxBid:1.8,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                textures:textures,
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert3Region1 = await GameAdAssetRegion.create({gameAdAsset:advert3.id,countryCode:"GB",region:1});

            let advert4 = await GameAdAsset.create({active:true,approved:true,maxBid:1.5,dailyBudget:300.0,availableBudget:200,
                gameAsset:gameAsset1.id,
                game:game.id,
                textures:texture,
                startDate: moment().subtract(2,"days").toDate(),
                endDate:moment().add(2,"days").toDate()});

            let advert4Region1 = await GameAdAssetRegion.create({gameAdAsset:advert4.id,countryCode:"AF",region:1});

            // Create game session
            let playerId = "2988973834",
            playerIp = "37.122.196.70";
            let startGameSession = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/start-session/' + game.gameId,
                json: true,
                body: {
                    playerId:playerId,
                    playerIp:playerIp
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });

            // Create dummy
            let adverts = await request({
                method: 'POST',
                uri: sails.config.API_HOST + '/sdk/advert/game-object/' + game.gameId,
                json: true,
                body: {
                    playerId:playerId,
                    gameObjectId:gameAsset1.id
                },
            }).then(function(data){
                return data;
            }).catch(function(err){
                throw new Error(err);
            });


            // Destroy game after test
            await GameAdAsset.destroy({id:advert1.id},{id:advert2.id},{id:advert3.id},{id:advert4.id});
            await GameAdAssetRegion.destroy({id:advert1Region1.id},{id:advert1Region2.id},
                {id:advert1Region3.id},{id:advert2Region1.id},{id:advert3Region1.id}),{id:advert4Region1.id};
            await GameAsset.destroy({id:gameAsset1.id});
            await Game.destroy({id:game.id});

            return res.ok(adverts);
        }catch(err){
            return res.serverError(err);
        }
    },



    /** OLD METHODS */
	async connectGame(req,res){

		if (!req.isSocket) {
			return res.badRequest();
		}

		try{
			let gameId = req.param("gameId"),
			gameAssetId = req.param("gameAssetId"),
			socketId = sails.sockets.getId(req);

			sails.sockets.join(req.socket, gameId + gameAssetId);

			return res.ok({connected:true});
		}catch(err){
			sails.log.error("websocket connection request error: ",err);
			return res.serverError(err);
		}
	},


	async testConnectGame(req,res){
		try{
			return res.view('test/dynamicAdvertTest', {
				layout: 'test/layout'
			});
		}catch(err){
			sails.log.error("websocket connection request error: ",err);
			return res.serverError(err);
		}
	},


	async getLiveAdverts(req,res){
		try{
			let gameId = req.param("gameId"),
			gameAssetId = req.param("gameAssetId");

			if(!gameId || !gameAssetId){
				throw new CustomError('Invalid Params Sent', { status: 404, err_code: "not_found" });
			}


			// Make sure this game exists
			let game = await Game.findOne({gameId:gameId});

			if(!game){
				throw new CustomError('Could not find your game', { status: 404, err_code: "not_found" });
			}

            // Find any live campaigns
            let gameAdAssets = await GameAdAsset.find({gameAsset: gameAssetId, game: game.id, active:true, approved: true, startDate: {'<=': new Date()}, endDate: {'>=': new Date()}}).populate('gameAsset').populate("game"),
            gameAdvertData = {},
            selectedGameAdAsset = {};

            for (const gameAdAsset of gameAdAssets) {

                // This campaign is active
                // Format the data to push to connected sockets
                if(gameAdAsset.link == null || !gameAdAsset.link){
                    gameAdAsset.link = '';
                }


                // Set the game asset URL
                if(gameAdAsset.gameAsset.type == 'screen'){
                    // Set the HTTP(S) url for HD video resource
                    if(gameAdAsset.resourceUrlHd != null && gameAdAsset.resourceUrlHd){
                        gameAdAsset.resourceUrlHd = sails.config.API_HOST + gameAdAsset.resourceUrlHd;
                    }

                    // Set the HTTP(S) url for SD video resource
                    if(gameAdAsset.resourceUrlSd != null && gameAdAsset.resourceUrlSd){
                        gameAdAsset.resourceUrlSd = sails.config.API_HOST + gameAdAsset.resourceUrlSd;
                    }
                }else if(gameAdAsset.gameAsset.type == 'texture'){
                    // Set the HTTP(S) url for image/texture resource
                    if(gameAdAsset.resourceUrlImg != null && gameAdAsset.resourceUrlImg){
                        gameAdAsset.resourceUrlImg = sails.config.API_HOST + gameAdAsset.resourceUrlImg;
                    }
                }
                // The game asset type set for this is not recognised
                // Must be type 'screen' or 'texture'
                else{
                    continue;
                }


                gameAdvertData = {
                    advertId: gameAdAsset.id,
                    resourceUrlHd: gameAdAsset.resourceUrlHd,
                    resourceUrlSd: gameAdAsset.resourceUrlSd,
                    resourceUrlImg: gameAdAsset.resourceUrlImg,
                    width: gameAdAsset.width,
                    height: gameAdAsset.height,
                    link: gameAdAsset.link,
                    maxBid: gameAdAsset.maxBid,
                    game: {
                        gameId: gameAdAsset.game.gameId
                    },
                    gameAsset: {
                        id: gameAdAsset.gameAsset.id
                    }
                };


                // Check if any campaigns are selected for this game asset
                // Otherwise insert this current campaign into the selected game assets
                // OR
                // The current selected campaign has a lower bid, remove it and set 
                // this campaign as selected active campaign
                if(!selectedGameAdAsset ||
                	_.isEmpty(selectedGameAdAsset) ||
                    selectedGameAdAsset.maxBid < gameAdAsset.maxBid){
                    selectedGameAdAsset = gameAdvertData;
                }
            }

            return res.ok(selectedGameAdAsset);
        }catch(err){
            sails.log.error("GameAdvertService.pushLiveAdCampaigns Error: ",err);
            return res.serverError({err: err});
        }
	},



	
};
