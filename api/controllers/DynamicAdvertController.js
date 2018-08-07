/**
 * DynamicAdvertController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

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
				throw new CustomError('Invalid Params Sent', { status: 401, err_code: "not_found" });
			}


			// Make sure this game exists
			let game = await Game.findOne({gameId:gameId});

			if(!game){
				throw new CustomError('Could not find your game', { status: 401, err_code: "not_found" });
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



    async sessionEnd(req,res){

        try{
            sails.log.debug("DynamicAdvertController.sessionEnd called: ", req);

            let gameId = req.param("gameId"),
            gameAdAssetId = req.param("gameAdAssetId"),
            exposedTime = req.param("exposedTime"),
            sessionTime = req.param("sessionTime");

            if(!gameId || !gameAdAssetId){
                throw new CustomError('Invalid Params Sent', { status: 401, err_code: "not_found" });
            }

            // Get the game ensure it exists
            let game = await Game.findOne({gameId:gameId});

            if(!game){
                throw new CustomError('Could not find that game', { status: 401, err_code: "not_found" });
            }

            // Make sure this game ad asset exists
            let gameAdAsset = await GameAdAsset.findOne({id:game.id,game:gameId});

            if(!gameAdAsset ){
                throw new CustomError('Could not find that game ad asset', { status: 401, err_code: "not_found" });
            }

            // Find any live campaigns
            let gameAdAssets = await GameAdAssetSession.create({gameAdAsset:gameAdAssetId,exposedTime:exposedTime,sessionTime:sessionTime});

            return res.ok({success:true});
        }catch(err){
            sails.log.error("GameAdvertService.sessionEnd Error: ",err);
            return res.serverError({err: err});
        }
    }


	
};
