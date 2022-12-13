declare const Parse: any;

Parse.Cloud.job("Clean Player App Codes older than 10 minutes", async function (request : any) {
  // params: passed in the job call
  // headers: from the request that triggered the job
  // log: the Moralis Server logger passed in the request
  // message: a function to update the status message of the job object
  const { params, headers, log, message } = request;
  message("Starting Player Code Clean-up");
  var currentDate = new Date();
  var tenMinsAgo = new Date(currentDate.getTime() - 10*60000); //10 mins ago

  var PlayerAppDefinition = Parse.Object.extend("PlayerApp");
  let playerAppQuery = new Parse.Query(PlayerAppDefinition);
  playerAppQuery.lessThan("createdAt", tenMinsAgo);
  var playerApps = await playerAppQuery.find({useMasterKey : true});

  for (let i = 0; i < playerApps.length; i++) {
    playerApps[i].destroy(); //remove stale codes
  }

  message("Finished Player Code Clean-up");
});