declare const Parse: any;
const logger = require('parse-server').logger;

import Scheduler from 'parse-server-jobs-scheduler';
const scheduler = new Scheduler();

// Recreates all crons when the server is launched
scheduler.recreateScheduleForAllJobs();

//https://github.com/CaskProtocol/cask-js-sdk/blob/main/src/core/abi/ICaskSubscriptions.js
//https://docs.cask.fi/protocol-deployments/testnet
//https://github.com/CaskProtocol/cask-webhook-bridge#webhook-event-list
//To update this code, can pull the keys from the Moralis website

// need to setup a flow for renewals but now we can get a subscription and then allow users to associate with an application
// from the front end we can have one click to subscribe per app, but backend should keep it seperate

Parse.Cloud.afterSave("CaskSubCreateLogs", async function (request : any) {
  let confirmed = request.object.get("confirmed");

  logger.info("Sub Create is Confirmed : " + confirmed);
  logger.info("Plan Id " + request.object.get("planId"));

  if (confirmed){
    var PlansDefinition = Parse.Object.extend("PlanLimits");
    let planQuery = new Parse.Query(PlansDefinition);
    planQuery.equalTo("planId", request.object.get("planId"));
    let plan = await planQuery.first();

    if (plan) { //could also check if the provider is me if needed
      logger.info("Subscription Id " + request.object.get("subscriptionId"));
      var uid = Buffer.from(request.object.get("ref").substring(2), "hex").toString().replace(/\x00/g, ""); //ref should be session id. need to convert bytes to string
      logger.info("User ID " + uid);

      let userQuery = new Parse.Query(Parse.User);
      var user = await userQuery.get(uid, {useMasterKey : true});
      
      var attributes = { subscriptionId : request.object.get("subscriptionId"), "plan" : plan , 
        address : request.object.get("consumer").toLowerCase(), user : user, subscribed : true };
      var SubsDefinition = Parse.Object.extend("Subscriptions");
      var subscription = new SubsDefinition(attributes);
      await subscription.save(null, {useMasterKey : true}); //only need to save subscription since it needs to be assigned to app
    } else {
        logger.info("Subscription Create Failed : No Associated Plan");
    }
  }

});

//on SubscriptionRenewed we need to reset analytics for the app
Parse.Cloud.afterSave("CaskSubRenewalLogs", async function (request : any) {
  let confirmed = request.object.get("confirmed");
  logger.info("Sub Renewal is Confirmed : " + confirmed);
  if (confirmed) {
    var SubDefinition = Parse.Object.extend("Subscriptions");
    let subQuery = new Parse.Query(SubDefinition);
    subQuery.equalTo("subscriptionId", request.object.get("subscriptionId"));
    logger.info("Subscription ID : " +  request.object.get("subscriptionId"));
    let sub = await subQuery.first();

    if (sub) { 
      await sub.save({subscribed : true}, {useMasterKey : true}); //update should trigger Subscription Job
    } else {
      logger.info("No associated subscription in Database for Renewal");
    }
  }

});

//cask sub cancel
Parse.Cloud.afterSave("CaskSubCanceledLogs", async function (request : any) {
  let confirmed = request.object.get("confirmed");
  logger.info("Sub Cancel is Confirmed : " + confirmed);
  if (confirmed) {
    var SubDefinition = Parse.Object.extend("Subscriptions");
    let subQuery = new Parse.Query(SubDefinition);
    subQuery.equalTo("subscriptionId", request.object.get("subscriptionId"));
    let sub = await subQuery.first();

    logger.info( "Cancel Subscription : " + request.object.get("subscriptionId") );

    if (sub) { 
      await sub.save({subscribed : false}, {useMasterKey : true});
    } else {
      logger.info("No assocaited subscription for Sub Cancel");
    }
  }

});

Parse.Cloud.afterSave("Subscriptions", async function (request : any) {
  if (request.object.get("subscribed")) { //only if subscribed do we create sub stats

    var attributes = { sub : request.object, apiCalls : 0 , emailCalls : 0 };
    var SubStatsDefinition = Parse.Object.extend("SubStats");
    var subStats = new SubStatsDefinition(attributes);
    await subStats.save(null, {useMasterKey : true});

  }

});

Parse.Cloud.afterSave("_User", async function (request : any) {
  let planQuery = new Parse.Query("PlanLimits");
  planQuery.equalTo("planId", "free"); //must be a free plan
  let plan = await planQuery.first();

  var attributes = { subscriptionId : "free-" + request.object.id, "plan" : plan , address : "N/A", 
    subscribed : true , user : request.object};    
  var SubDefinition = Parse.Object.extend("Subscriptions");
  var subscription = new SubDefinition(attributes);
  await subscription.save(null, {useMasterKey : true}); //only need to save subscription since it needs to be assigned to app

});