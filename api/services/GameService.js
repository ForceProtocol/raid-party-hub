const moment = require('moment');

module.exports = {

    addPlatformLink: async (gameId,platformType,link,isCountrySpecific,active)=>{

        try{

            let fontAwesome = GameService.getPlatformFontAwesome(platformType);

            sails.log.debug("fontAwesome is: ",fontAwesome);

            let gamePlatform = await GamePlatforms.create({game:gameId,type:platformType,fontAwesome:fontAwesome,link:link,isCountrySpecific:isCountrySpecific,active:active});

            if(!gamePlatform){
                throw new CustomError('Could not add that game platform link', { status: 401, err_code: "not_found" });
            }

            return true;
        }catch(err){
            sails.log.error("GameService.setPlatformLink Error: ",err);
            return false;
        }
        
    },


    getPlatformFontAwesome: (platformType) => {
        switch(platformType){
            case 'pc':
                return 'fas fa-desktop';
            case 'steam':
                return 'fab fa-steam';
            case 'android':
                return 'fab fa-android';
            case 'ios':
                return 'fab fa-app-store-ios';
            case 'console':
                return 'fas fa-gamepad';
            default:
                return 'fas fa-link';
        }
    }



};