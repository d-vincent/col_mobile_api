'use strict';

const https = require('https');
const Notifier = require('./notifier');


//this is the field to id if the notification is chat notificy or COL
//it shows up in the payload like "gcm.notification.type" = 7;
const COLNotificationID = 7;



//{"conId":"202426","content":"hellooo from ios","type":2}
exports.sendNotification = function(request, response, admin) {
      // Use database to declare databaseRefs:

      var conId = request.body.conId
      var content = request.body.content
      var type = request.body.type
      var db = admin.database();
      var currentNotificationCount = 0;
      var typeName = getNotificationTypeName(type)

      var logMsg = {}
      logMsg.conID = conId
      logMsg.content = content
      logMsg.typeName = typeName
      db.ref('/users/' + conId + '/notifications/' + typeName).once("value", function (snapshot) {
        currentNotificationCount = snapshot.exists ? snapshot.val() + 1 : 1;
        db.ref('/users/' + conId + '/notifications/' + typeName).set(currentNotificationCount);
        var data = {
            notificationContent: content,
            notificationType: String(type),
            notificationCount:String(currentNotificationCount)
        }

        const notificaition = Notifier.createNotification(COLNotificationID, data, content, "")
        Notifier.notifyAllPlatforms(admin,db,conId,notificaition)
        response.end('Notifications sent');

        console.log("sendNotification Log:" + String(logMsg))
      })
   }


//{"conId":"202426","content":"hellooo from ios","type":2}
exports.resetNotification = function(request, response, admin) {
     // Use database to declare databaseRefs:
     var conId = request.body.conId
     var content = request.body.content
     var type = request.body.type
     var db = admin.database();
     var typeName = getNotificationTypeName(type)

     var logMsg = {}
     logMsg.conID = conId
     logMsg.content = content
     logMsg.typeName = typeName

     db.ref('/users/' + conId + '/notifications/' + typeName).once("value", function (snapshot) {
       if (snapshot.exists) {
         db.ref('/users/' + conId + '/notifications/' + typeName).set(0);
       }
     })
     var data = {
         notificationContent: content,
         notificationType: String(type),
         notificationCount:'0'
     }

     const notificaition = Notifier.createNotification(COLNotificationID, data, content, "")
     Notifier.notifyAllPlatforms(admin,db,conId,notificaition)
     response.end('Notifications cleared');
     console.log("resetNotification Log:" + String(logMsg))
}



// use type id to map to notication type string
//type id must be an int. should prob add conversion to force the type.
function getNotificationTypeName(typeID) {
  switch (typeID) {
    case '0':
      return "todo"
    case '1':
      return "punchlist"
    case '2':
      return "changeOrder"
    case '3':
      return "rfi"
    case '4':
      return "clientSelect"
    case '5':
      return "submittal"
    case '6':
      return "transmittal"
    case '8':
      return "lead"
    case '9':
      return "redline"
    case '10':
      return "dailyLog"
    case '11':
      return "calendar"
    case '12':
      return "estimating"
    case '13':
      return "messaging"
    case '14':
      return "newsfeed"
    case '15':
      return "gamePlan"
    default:
      return "errorType"
  }
}
