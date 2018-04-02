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
    if (projectId == null) {
      projectId = '-1'
    }
    var db = admin.database();
    var logMsg = {}
    logMsg.conId = conId
    logMsg.type = type
    logMsg.itemId = itemId
    logMsg.projectId = projectId
    logMsg.refPath = '/users/' + conId + '/notifications/' + type
    db.ref('/users/' + conId + '/notifications/' + type).push().child(projectId).set(itemId)

    var data = {
        notificationContent: title,
        notificationType: String(type)
    }
    const notificaition = Notifier.createNotification(COLNotificationID, data, title, content)
    notifyAllPlatforms(admin,db,conId,notificaition)
    response.end('Notifications sent');
    console.log("sendNotification Log:" + JSON.stringify(logMsg))
 }

//returns broken down notification json either filtered by project or aggregated
exports.getCOLNotifications = function(request, response, admin) {
  // Use database to declare databaseRefs:
  var conId = String(request.body.conId)
  var projectIds = request.body.projectIds

  var db = admin.database();
  var logMsg = {}
  logMsg.conID = conId
  logMsg.projectIds = projectIds


  var notificationsRef = db.ref("users/" + conId + "/notifications")
  var result = {}
  if (!Array.isArray(projectIds)) {
    response.status(400).end("projectIds must be array of project id strings")
  }
  countNotificationForProjects(notificationsRef, projectIds,function(result,success){
    if (success) {
      response.status(200).end(JSON.stringify(result))
    }
    response.status(400).end(JSON.stringify(result))
  })

}



//{"conId":"202426","content":"hellooo from ios","type":2}
exports.resetNotification = function(request, response, admin) {
     // Use database to declare databaseRefs:
  var conId = request.body.conId
  var featureType = request.body.type
  var projectId = request.body.projectId
  var itemIds = request.body.itemIds
  var db = admin.database();

  var logMsg = {}
  logMsg.conID = conId
  logMsg.type = featureType
  logMsg.projectId = projectId
  var notificationsRef = db.ref("users/" + conId + "/notifications")
  resetNotifications(notificationsRef, featureType, projectId, itemIds).then(function(msg){
    response.status(200).end(JSON.stringify(msg))
    console.log("resetNotification Log:" + JSON.stringify(logMsg))
  }).catch(function(err){
    logMsg.error = result
    response.status(400).end(JSON.stringify(err))
    console.error("resetNotification Log:" + JSON.stringify(logMsg))
  })
}

function countNotificationForProjects(notificationsRef, projectIds,callBack){
  var result = {}
  try {
    notificationsRef.once("value", function(colFeatureTypes){
      colFeatureTypes.forEach(function(featureType) {
        featureType.forEach(function(notification) {
          notification.forEach(function(notifInfo){//theres only 1 key value pair {proj:itemid}
          //{project id : {featureType: [itemid]}}
          if (result[notifInfo.key] === undefined) {
            result[notifInfo.key] = {[featureType.key]: [] }
          }
          if (result[notifInfo.key][featureType.key] === undefined) {
            result[notifInfo.key][featureType.key] = []
          }
          result[notifInfo.key][featureType.key].push(String(notifInfo.val()))
          })
        })
      })
      if (!projectIds.includes("-1")){ //removes the project if its not requested.
        Object.keys(result).filter(key => (!projectIds
          .includes(key)))
          .forEach(key => delete result[key])
      }
      callBack(result, true)
      console.log("Notifications:", result)
    }, function(err){
      result.error = "error getting notifications for user"
      callBack(result, false)
      console.error(err.message);
    })
  }catch (err) {
    result.error = 'Error getting notifications for user' + err.message
    callBack(result, false)
    console.error(result.error);
  }
}


/*
this function resets notification for user
@params notificationsRef: 'users/{uid}/notitifications/'
@params featureType: String of number. -1 clears all notifications, otherwise just the featureID
@params projectId: strig of number, if its -1, clears every notificaiton under the feature.
@params itemIds: array of item ids, currently not in use, but put inplace
for when we want to be able to clear individual items.
@returns a promise with error message
*/

function resetNotifications(notificationsRef, featureType, projectId,itemIds) {
  return new Promise(
    (resolve, reject) => {
      var errLog = {}
      errLog.featureID = featureType
      errLog.notificationsRef = notificationsRef
      errLog.projectID = projectId;
      if (featureType == "-1"){ //removes all notificaitons
        notificationsRef.remove()
        resolve("All Notification Reset for user Successfully.")
      }else{
        notificationsRef.child(featureType).once("value", function(notifications){
          notifications.forEach(function(notification){
            var projItemPair = notification.val()
            //projItemPair.key : project id
            //projItemPair.val() : item id
            console.log(notification.key + notification.val())
            console.log(projItemPair.key)
            if (projectId == "-1") {
              notifications.child(notification.key).ref.remove()
            }else{
              if(projItemPair.hasOwnProperty(projectId)){
                notifications.child(notification.key).ref.remove()
              }
            }
          })
          resolve('notification reset for feature type: '+ featureType + " and project: " + projectId);
        },function(err){
          errLog.errorMsg = "Clear Notification: error getting notifications for user:" + err.message
          eject(JSON.stringify(errLog));
          console.error(errLog);
        })
      }
    }//end of (resolve, reject) =>
  );
}



//this should be refactored out to notifier and remove the dependency to admin and db
function notifyAllPlatforms (admin,db,conId,payload){
    var tokens = [];
    tokens.push(db.ref('/users/' + conId + '/tokens/android'));
    tokens.push(db.ref('/users/' + conId + '/tokens/ios'));
    Notifier.notifyDevices(admin,tokens,payload);
}
