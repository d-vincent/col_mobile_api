'use strict';

const https = require('https');
const Notifier = require('./notifier');


//this is the field to id if the notification is chat notificy or COL
//it shows up in the payload like "gcm.notification.type" = 7;
const COLNotificationID = 7;

//{"conId":"202426","content":"hellooo from ios","type":2,"itemId":1234567}
exports.sendNotification = function(request, response, admin) {
      // Use database to declare databaseRefs:

      var conId = request.body.conId
      var content = request.body.content
      var type = request.body.type
      var itemId = request.body.itemId
    var title = request.body.title
    var projectId = request.body.projectId

      var db = admin.database();
    var logMsg = {}
      logMsg.conID = conId
      logMsg.content = content
      logMsg.type = type
      logMsg.itemId = itemId
    db.ref('/users/' + conId + '/notifications/' + type).push().child(projectId).set(itemId)


      var data = {
          notificationContent: title,
          notificationType: String(type)
      }
      const notificaition = Notifier.createNotification(COLNotificationID, data, title, content)
      notifyAllPlatforms(admin,db,conId,notificaition)
      response.end('Notifications sent');
      console.log("sendNotification Log:" + String(logMsg))
 }

//returns broken down notification json either filtered by project or aggregated
exports.getCOLNotifications = function(request, response, admin) {
  // Use database to declare databaseRefs:
  var conId = String(request.query.conId)
  var projectId = String(request.query.projectId)

  var db = admin.database();
  var logMsg = {}
  logMsg.conID = conId
  logMsg.projectId = projectId


  var notificationsRef = db.ref("users/" + conId + "/notifications")
  var result = {}
  if (projectId == "-1") {
    //this iterates through colfeature type
    try {
      notificationsRef.once("value", function(colFeatureTypes){
        colFeatureTypes.forEach(function(featureType) {
          result[featureType.key] = featureType.numChildren()
        })
        response.status(200).end(JSON.stringify(result))
        console.log("Notifications:", result)
      }, function(err){
        response.status(400).end("error getting notifications for user")
        console.error(err.message);
      })
    }catch (err) {
      var errMSG = 'Error getting notifications for user' + err.message
      response.status(400).end(JSON.stringify(errMSG))
      console.error(errMSG);
    }
  }else{
    try {
      notificationsRef.once("value", function(colFeatureTypes){
        console.log("Filtered Notifications:", colFeatureTypes.val())
        colFeatureTypes.val().forEach(function(featureType) {
          var featureRef = notificationsRef.child(featureType.key)
          featureRef.orderByChild(projectId).equalTo(true).on("value", function(existForProj) {

            console.log(" count Notifications:", existForProj.numChildren())
            existForProj.forEach(function(countForProject) {
              result[existForProj.key] = countForProject.numChildren()
            })
            console.log("Filtered Notifications:", existForProj)
            response.status(200).end(JSON.stringify(result))
          })
        })
        console.log("Notifications:", result)
      }, function(err){
        response.status(400).end("error getting notifications for user")
        console.error(err.message);
      })
    }catch (err) {
      var errMSG = 'Error getting notifications for user' + err.message
      response.status(400).end(JSON.stringify(errMSG))
      console.error(errMSG);
    }
  }

}



//{"conId":"202426","content":"hellooo from ios","type":2}
exports.resetNotification = function(request, response, admin) {
     // Use database to declare databaseRefs:
     var conId = request.body.conId
     var content = request.body.content
    var type = request.body.type
    var projectId = request.body.projectId
     var db = admin.database();

     var logMsg = {}
     logMsg.conID = conId
     logMsg.content = content
     logMsg.type = type

     db.ref('/users/' + conId + '/notifications/' + type ).remove()
     response.end('Notifications cleared');
     console.log("resetNotification Log:" + String(logMsg))
}

function notifyAllPlatforms (admin,db,conId,payload){
    var tokens = [];
    tokens.push(db.ref('/users/' + conId + '/tokens/android'));
    tokens.push(db.ref('/users/' + conId + '/tokens/ios'));
    Notifier.notifyDevices(admin,tokens,payload);
}
