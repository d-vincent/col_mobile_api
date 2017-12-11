'use strict';

const https = require('https');
const Notifier = require('./Notifier');


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
      var db = admin.database();
      var logMsg = {}
      logMsg.conID = conId
      logMsg.content = content
      logMsg.type = type
      logMsg.itemId = itemId
      db.ref('/users/' + conId + '/notifications/' + type).push().set(itemId);
      var data = {
          notificationContent: content,
          notificationType: String(type)
      }
      const notificaition = Notifier.createNotification(COLNotificationID, data, content, "")
      notifyAllPlatforms(admin,db,conId,notificaition)
      response.end('Notifications sent');
      console.log("sendNotification Log:" + String(logMsg))
 }


//{"conId":"202426","content":"hellooo from ios","type":2}
exports.resetNotification = function(request, response, admin) {
     // Use database to declare databaseRefs:
     var conId = request.body.conId
     var content = request.body.content
     var type = request.body.type
     var db = admin.database();

     var logMsg = {}
     logMsg.conID = conId
     logMsg.content = content
     logMsg.type = type

     db.ref('/users/' + conId + '/notifications/' + type).remove()
     response.end('Notifications cleared');
     console.log("resetNotification Log:" + String(logMsg))
}

function notifyAllPlatforms (admin,db,conId,payload){
    var tokens = [];
    tokens.push(db.ref('/users/' + conId + '/tokens/android'));
    tokens.push(db.ref('/users/' + conId + '/tokens/ios'));
    Notifier.notifyDevices(admin,tokens,payload);
}
