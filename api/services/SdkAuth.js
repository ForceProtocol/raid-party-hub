var sha1 = require('sha1');

module.exports = {
  
    validAuthKey: function(authKey,appId,appKey,route,param){
	
		var validAuthKey = sha1(route + ':' + param + ':' + appId + ':' + appKey);
		
		// Invalid key was sent
		if(authKey != validAuthKey){
			return false;
		}
    
		return true;
	}
	
	
};