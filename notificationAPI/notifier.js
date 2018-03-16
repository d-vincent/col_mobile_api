'use strict';

exports.createNotification = function(typeID, data, title, body) {
     const payload = {
         data: data,
         notification: {
             title: title,
             body: body,
             type: String(typeID)
         }
     }
     return payload;
 }

 exports.notifyDevices = function(admin,deviceTokens,payload){
   if (deviceTokens == null){
      console.log("Error notifying devices message: device tokens is null");
   }else{
     notify(admin,deviceTokens,payload)
   }
 }

function notify(admin,deviceTokens,payload){
  if (deviceTokens.constructor === Array) {
    console.log("notifying devices")
    deviceTokens.forEach(function(token) {
      notifyDevice(admin,token,payload)
    });
  }else{
    console.log("notifying single device")
    notifyDevice(admin,deviceTokens,payload)
  }
}

 function notifyDevice(admin,deviceToken,payload){
  deviceToken.once("value", function (snapshot) {
    if (snapshot.val() != null) {
      try {
         admin.messaging().sendToDevice(snapshot.val(), payload)
             .then(function (response) {
                 //console.log("Successfully sent message to: ", snapshot.val());
             })
             .catch(function (error) {
                 console.log("Error sending message:", error);
             });
      } catch (err) {
         console.log("Probably a null token, fam: " + deviceToken + 'payload: ' + payload)
         console.log(err)
      }
    }
  });
};
