module.exports = {
  
	generatePlayerSdkCode: async (id,count)=>{
	
		if(count > 5){
			return false;
		}else{
			count++;
		}
		
		let playerCode = util.getPlayerGameCode(7);
		
		Player.update({id:id},{code:playerCode}).exec(function(err,updated){
		
			if(err || typeof updated == 'undefined'){
				return PlayerService.generatePlayerSdkCode(id,count);
			}
			
			return playerCode;
		});
	}
	
	
};