

module.exports = {

    pushLiveAdCampaigns: async ()=>{

        try{
            // Find any live campaigns
            let gameAdAssets = await GameAdAsset.find({active:true,startDate: {'<=': new Date()}, endDate: {'>=': new Date()}}).populate('gameAsset').populate("game"),
            gameAdvertData;

            for (const gameAdAsset of gameAdAssets) {

                sails.log.debug("Found a live game ad asset to push: ",gameAdAsset);

                // TODO: Check that this should be running at this time


                // TODO: CHECK IF THERE ARE OTHER ADVERTS RUNNING AT THE SAME TIME FOR THE SAME GAME AND GAME ASSET
                // - IF YES, NEED TO DECIDE WHICH ADVERT TO DISPLAY BASED ON BID SYSTEM bid winner = 

                if(gameAdAsset.link == null || !gameAdAsset.link){
                    gameAdAsset.link = '';
                }

                if(gameAdAsset.resourceUrlHd != null && gameAdAsset.resourceUrlHd){
                    gameAdAsset.resourceUrlHd = sails.config.API_HOST + gameAdAsset.resourceUrlHd;
                }

                if(gameAdAsset.resourceUrlSd != null && gameAdAsset.resourceUrlSd){
                    gameAdAsset.resourceUrlSd = sails.config.API_HOST + gameAdAsset.resourceUrlSd;
                }

                if(gameAdAsset.resourceUrlImg != null && gameAdAsset.resourceUrlImg){
                    gameAdAsset.resourceUrlImg = sails.config.API_HOST + gameAdAsset.resourceUrlImg;
                }

                gameAdvertData = {
                    advertId: gameAdAsset.id,
                    resourceUrlHd: gameAdAsset.resourceUrlHd,
                    resourceUrlSd: gameAdAsset.resourceUrlSd,
                    resourceUrlImg: gameAdAsset.resourceUrlImg,
                    width: gameAdAsset.width,
                    height: gameAdAsset.height,
                    link: gameAdAsset.link 
                };

                sails.sockets.broadcast(gameAdAsset.game.gameId + gameAdAsset.gameAsset.id, "advert", gameAdvertData);
            }

            return true;
        }catch(err){
            sails.log.error("GameAdvertService.pushLiveAdCampaigns Error: ",err);
            return false;
        }
        
    },

};