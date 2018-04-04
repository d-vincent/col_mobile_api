'use strict';

const https = require('https');
const Notifier = require('./notifier');


//this is the field to id if the notification is chat notificy or COL
//it shows up in the payload like "gcm.notification.type" = 7;
const COLNotificationID = 25;
//refactor chat stuff over here.

exports.sendChatUpdateNotification = function(event,admin) {

  var db = admin.database();
  const message = event.data.val();
  const senderUid = message.author;
  const chatID = event.params.chatId
  const promises = [];
  const type = message.type;

  var body;
  if (type == "1") {
      body = "Photo Message"
  } else if (type == "2") {
      body = "Video Message"
  }
  else {
      body = message.content;
  }

  var userName;
  var gettingUsername = db.ref('chats/' + chatID + '/members/' + senderUid + '/username/');
  //this section down here is still not clean. but ill leave it since it seems to work ok.
  gettingUsername.once("value", function(snapshot) {
    userName = snapshot.val();
    const title = 'New chat from ' + userName
    const data = {
        toUserName: userName,
        chatId:chatID,
        userId: senderUid
    }
    const notification = Notifier.createNotification(COLNotificationID,data,title, body)
    db.ref('/chats/' + chatID + '/members').once("value", function(userIds) {
      userIds.forEach(function (childSnap) {
        var currentUserID = childSnap.key
        if (senderUid != currentUserID) {
          try {
              var userChatRef = db.ref('/users/' + currentUserID + '/chats/' + chatID);
              userChatRef.once("value", function (isInChatSnap) {
                  if (isInChatSnap.val) {
                    var deviceTokens = [];
                    deviceTokens.push(db.ref('/users/' + currentUserID + '/tokens/android'));
                    deviceTokens.push(db.ref('/users/' + currentUserID + '/tokens/ios')) ;
                    Notifier.notifyDevices(admin, deviceTokens,notification)
                  }
              })
          } catch (err) {
             console.log("Error Sending Notication to Android Users: ", err)
          }
        }
      })
    }, function(errorObject) {
      console.log("Error getting chat member user IDs:", errorObject)
    })
  }, function(errorObject) {
      console.log("Error getting chat member user usernames:", errorObject);
  })

}
