module.exports = {
  
	generatePlayerSdkCode: async (id,count)=>{
	
		if(count > 5){
			return false;
		}else{
			count++;
		}
		
		let playerCode = util.getPlayerGameCode(7);
		
		try {
			let updatedPlayer = await Player.update({id:id},{code:playerCode});
			return playerCode;
		}catch(err){
			return PlayerService.generatePlayerSdkCode(id,count);
		}
		
	}
	
	
};