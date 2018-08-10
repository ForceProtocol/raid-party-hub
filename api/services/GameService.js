const moment = require('moment');

module.exports = {

    addPlatformLink: async (gameId,platformType,link,isCountrySpecific,active)=>{

        try{
            
            let fontAwesome = GameService.getPlatformFontAwesome(platformType);

            let gamePlatform = await GamePlatforms.findOrCreate({game:gameId,type:platformType,link:link},{game:gameId,type:platformType,fontAwesome:fontAwesome,link:link,isCountrySpecific:isCountrySpecific,active:active});

            if(!gamePlatform){
                throw new CustomError('Could not add that game platform link', { status: 401, err_code: "not_found" });
            }

            return true;
        }catch(err){
            sails.log.error("GameService.setPlatformLink Error: ",err);
            return false;
        }
        
    },



    removePlatformLink: async (gameId,platformType)=>{

        try{
            let gamePlatform = await GamePlatforms.destroy({game:gameId,type:platformType});

            if(!gamePlatform){
                throw new CustomError('Could not remove that platform link', { status: 401, err_code: "not_found" });
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
    },


    isValidUrl: (url) => {
        let linkRegex = new RegExp('^(|(http|https):\/\/[^ "]+$|www.[^ "]+$)$');
        return linkRegex.test(url);
    }


};