const moment = require('moment'),
request = require('request-promise'),
validIpAddress = require('ip-address').Address4;

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

                // Ensure we have all information from populated tables for this game advert
                if(!gameAdAsset.gameAsset || !gameAdAsset.game){
                    continue;
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



    /** Define the status of this game ad campaign:
    *   active: 0 = advertiser paused
    *   active: 1 = advertiser approved
    *   approved: 0 = pending developer approval
    *   approved: 1 = developer approved
    */
    getAdvertStatus: async (active,approved,startDate,endDate)=>{
        let status = '';

        // The advert is withing the start and end date so can go live
        if(moment().isBetween(startDate,endDate)){

            // The advert is approved and active, it's live
            if(active && approved){
                return 'live';
            }

            else if(!active && approved){
                return 'paused';
            }

            else if(!approved){
                return 'pending';
            }

        }
        else{

            // The advert is approved and active, it's live
            if(active && approved || !approved){
                return 'pending';
            }

            else if(!active && approved){
                return 'paused';
            }
        }
    },



    generatePlayerId: function(playerId,gameId){
        return gameId + "-" + playerId;
    },



    /**
    * Set a single players location data
    */
    getPlayerLocation: async(playerIp)=>{
        try{

            let address = new validIpAddress(playerIp);

            if(!address.isValid()){
                return false;
            }

            playerLocation = await request({
                method: 'GET',
                uri: 'http://api.ipstack.com/' + playerIp + '?access_key=' + sails.config.IPSTACK_KEY,
                json: true
            });

            if(!playerLocation || playerLocation.error){
                throw new Error("failed to retrieve player location using ipstack");
            }

            // If for some reason data cant be found for this IP,
            // Make sure to set some value so we don't repeat looking up this player
            if(!playerLocation.region_code || playerLocation.region_code == ''){
                playerLocation.region_code = '00';
            }

            return playerLocation;
        }catch(err){
            sails.log.error("GameAdvertService.setPlayerLocation err: ",err);
            return {success:false,err:err};
        }
    },



    /**
    * Set the player location
    * TODO: use ipstack bulk upload method https://ipstack.com/documentation
    */
    setPlayerLocations: async()=>{

        try{

            // Set a cut off date from players to find location data on
            // So we dont repeat searches of players that just cant find data on
            let cutOffDate = moment().subtract(3, 'day').toDate();

            // Get players without location information but IP
            let players = await PlayerToGameAdSession.find({ip:{"!":""},regionCode:"",createdAt:{'>':cutOffDate}});

            // Find IP for each player to update location data
            let playerLocation = {};

            for(const player of players){
                playerLocation = await request({
                    method: 'GET',
                    uri: 'http://api.ipstack.com/' + player.ip + '?access_key=' + sails.config.IPSTACK_KEY,
                    json: true
                });

                if(!playerLocation || playerLocation.error){
                    throw new Error("failed to retrieve player location using ipstack");
                }

                // If for some reason data cant be found for this IP,
                // Make sure to set some value so we don't repeat looking up this player
                if(!playerLocation.region_code || playerLocation.region_code == ''){
                    playerLocation.region_code = '00';
                }


                let updatedPlayer = await PlayerToGameAdSession.update({playerId:player.playerId},{regionCode:playerLocation.region_code,
                    regionName:playerLocation.region_name,city:playerLocation.city,longitude:playerLocation.longitude,
                    latitude:playerLocation.latitude});

                if(!updatedPlayer){
                    sails.log.error("could not update player");
                }
            }

        }catch(err){
            sails.log.error("GameAdvertService.setPlayerLocation err: ",err);
            return false;
        }

    },


    getWinningVideoAdverts: async(probabilityMax,gameAdvertsAvailable)=>{

        try{
            // Choose a value for probability selection
            let selectedGameAdAsset = {};

            // There is only one advert available
            if(gameAdvertsAvailable.length == 1){
                selectedGameAdAsset = gameAdvertsAvailable[0];
                selectedGameAdAsset.adverts = [gameAdvertsAvailable[0].advertId];
            }

            // There are at most two video adverts to use, so use both
            else if(gameAdvertsAvailable.length == 2){
                // Merge one of the adverts video with the first
                gameAdvertsAvailable[0].videos.push(gameAdvertsAvailable[1].videos[0]);
                selectedGameAdAsset = gameAdvertsAvailable[0];
                selectedGameAdAsset.adverts = [gameAdvertsAvailable[0].advertId,gameAdvertsAvailable[1].advertId];
            }

            // There are multiple adverts to choose
            else{
                // Choose a value for probability selection
                let closestMaxBid = Math.random() * (probabilityMax - 1) - 1;


                for(const [i,advert] of gameAdvertsAvailable.entries()){
                    // One active campaign already chosen, chose final one
                    if(selectedGameAdAsset.videos){
                        selectedGameAdAsset.videos.push(advert.videos[0]);
                        selectedGameAdAsset.adverts.push(advert.advertId);
                        break;
                    }


                    if(advert.probabilityFactor >= closestMaxBid){
                        selectedGameAdAsset = advert;
                        selectedGameAdAsset.adverts = [advert.advertId];

                        // Add the last advert to this since no more adverts left to try
                        if(i === (gameAdvertsAvailable.length - 1) && typeof gameAdvertsAvailable[i-1] !== 'undefined' ){
                            selectedGameAdAsset.videos.push(gameAdvertsAvailable[i-1].videos[0]);
                            selectedGameAdAsset.adverts.push(gameAdvertsAvailable[i-1].advertId);
                        }
                    }
                }
            }

            delete selectedGameAdAsset.advertId;
            delete selectedGameAdAsset.probabilityFactor;
            return selectedGameAdAsset;
        }catch(err){
            sails.log.error("GameAdvertService.getWinningVideoAdverts err: ",err);
            return false;
        }
    },


    getWinningTextureAdverts: async(probabilityMax,gameAdvertsAvailable)=>{

        try{
            // Choose a value for probability selection
            let selectedGameAdAsset = {};

            // There is only one advert available
            if(gameAdvertsAvailable.length == 1){
                selectedGameAdAsset = gameAdvertsAvailable[0];
                selectedGameAdAsset.adverts = [gameAdvertsAvailable[0].advertId];
            }

            // There are multiple adverts to choose
            else{
                // Choose a value for probability selection
                let closestMaxBid = Math.random() * (probabilityMax - 1) - 1;


                for(const [i,advert] of gameAdvertsAvailable.entries()){

                    if(advert.probabilityFactor >= closestMaxBid){
                        selectedGameAdAsset = advert;
                        selectedGameAdAsset.adverts = [advert.advertId];
                        break;
                    }
                }
            }

            delete selectedGameAdAsset.advertId;
            delete selectedGameAdAsset.probabilityFactor;
            return selectedGameAdAsset;
        }catch(err){
            sails.log.error("GameAdvertService.getWinningTextureAdverts err: ",err);
            return false;
        }
    },


    setAdvertsProbability: function(gameAdverts){
        try{
            // Sort game adverts into maximum bid order
            gameAdverts.sort(function(a,b){
                return a.maxBid - b.maxBid;
            });


            // Assign a probability value against each advert campaign
            let probabilityMax = 0;

            gameAdvertsAvailable = gameAdverts.map(function(advert){

                // Increase the weight of higher value bids
                if(probabilityMax > 0){
                    probabilityMax += (advert.maxBid + (probabilityMax * 1.5));
                }else{
                    probabilityMax += advert.maxBid;
                }

                advert.probabilityFactor= probabilityMax;
                return advert;
            });

            return {gameAdvertsAvailable,probabilityMax};
        }catch(err){
            sails.log.error("GameAdvertService.setAdvertsProbability err: ",err);
            return false;
        }
    },



    spendAdvertBudget: async()=>{
        try{
            // Find live campaigns and select which ones to send back
            let adverts = await GameAdAsset.find({availableBudget: {'>': 0}, 
                startDate: {'<=': new Date()}, endDate: {'>=': new Date()}
            }).populate("gameAdSessions",{where: {spent:false}});

            // Go through all adverts to calculate how much more budget was spent
            for(const advert of adverts){
                let advertCpm = advert.maxBid;
                let totalSessions = advert.gameAdSessions.length;

                // Dont divide by 0
                if(totalSessions < 1){
                    continue;
                }

                let cpmCost = (totalSessions / 1000) * advertCpm;
                advert.availableBudget = advert.availableBudget - cpmCost;
                advert.usedBudget += cpmCost;
                advert.impressions += totalSessions;

                if(advert.availableBudget < 0){
                    advert.availableBudget = 0;
                }

                // Record new budget spend
                let advertUpdate = await GameAdAsset.update({id:advert.id},{availableBudget:advert.availableBudget,usedBudget:advert.usedBudget,impressions:advert.impressions});

                advert.gameAdSessions.forEach(function(session){
                    // Update the sessions to record they have been spent
                    GameAdSession.update({id:session.id},{spent:true}).exec(function(err,updated){
                        if(err){
                            sails.log.debug("update game ad session: ",err);
                        }
                    });
                });
            }

            return true;
        }catch(err){
            sails.log.error("GameAdvertService.spendAdvertBudget err: ",err);
            return false;
        }
    },



    /** 
    * Close game sessions that are over a day old
    */
    closeGhostGameSessions: async()=>{
        try{
            let dayAgo = moment().subtract(1,"days").toDate();
            let gameAdSessions = await GameAdSession.find({sessionTime: 0,createdAt: {'<=':dayAgo}});

            // Don't go through every session for the same game ad asset
            gameAdSessions = gameAdSessions.filter(function(session,index,self){
                return index === self.findIndex((t) => (
                    t.gameAdAsset === session.gameAdAsset
                ));
            });

            for(const session of gameAdSessions){
                // Work out average session time for this particular game
                let avgSession = await GameAdSession.find({sessionTime: {">": 0},gameAdAsset:session.gameAdAsset}).average('sessionTime');

                if(!avgSession || !avgSession[0].sessionTime){
                    avgSession = 1;
                }else{
                    avgSession = Math.round(avgSession[0].sessionTime);
                    if(avgSession < 1){
                        avgSession = 1;
                    }
                }

                // Set all ghost sessions of this advert to the average
                await GameAdSession.update({id:session.id,sessionTime:0},{sessionTime:avgSession});
            }

            return true;
        }catch(err){
            sails.log.error("GameAdvertService.closeGhostGameSessions err: ",err);
            return false;
        }
    },

};