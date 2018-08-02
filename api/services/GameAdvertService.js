const moment = require('moment');

module.exports = {

    pushLiveAdCampaigns: async ()=>{

        try{
            // Find any live campaigns
            let gameAdAssets = await GameAdAsset.find({active:true,startDate: {'<=': new Date()}, endDate: {'>=': new Date()}}).populate('gameAsset').populate("game"),
            gameAdvertData = {},
            selectedGameAdAssets = {};

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
                    sails.log.error("GameAdvertService.pushLiveAdCampaigns cron err: game asset type set is not recognised: ", gameAdAsset);
                    return;
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
                if(!selectedGameAdAssets[gameAdAsset.gameAsset.id] ||
                    selectedGameAdAssets[gameAdAsset.gameAsset.id].maxBid < gameAdAsset.maxBid){
                    selectedGameAdAssets[gameAdAsset.gameAsset.id] = gameAdvertData;
                }
            }

            // Cycle through and broadcast all selected campaigns
            for (let key in selectedGameAdAssets) {
                if(selectedGameAdAssets.hasOwnProperty(key)){
                    sails.log.debug("selected gam ad asset: ",selectedGameAdAssets[key]);
                    sails.sockets.broadcast(selectedGameAdAssets[key].game.gameId + selectedGameAdAssets[key].gameAsset.id, "advert", selectedGameAdAssets[key]);
                }
            }

            return true;
        }catch(err){
            sails.log.error("GameAdvertService.pushLiveAdCampaigns Error: ",err);
            return false;
        }
        
    },

};