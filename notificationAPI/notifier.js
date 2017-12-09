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

exports.notifyAllPlatforms = function(admin,db,conId,payload){
    notifyAndroid(admin,db,conId,payload)
    notifyIOS(admin,db,conId,payload);

}

 exports.notifyIOS = function(admin,db,conId,payload){
   notifyIOS(admin,db,conId,payload);
 }

 exports.notifyAndroid = function(admin,db,conId, payload){
   notifyAndroid(admin,db,conId,payload)
 }


 function notifyAndroid(admin,db,conId, payload){
   var androidToken = db.ref('/users/' + conId + '/tokens/android');
   androidToken.once("value", function (snapshot) {
       try {
           admin.messaging().sendToDevice(snapshot.val(), payload)
               .then(function (response) {
                   console.log("Successfully sent message:", response);
               })
               .catch(function (error) {
                   console.log("Error sending message:", error);
               });
       } catch (err) {
           console.log("Probably a null token, fam")
           console.log(err)
       }

   })
 }

 function notifyIOS(admin,db,conId,payload){
   var iosToken = db.ref('/users/' + conId + '/tokens/ios');
   iosToken.once("value", function (snapshot) {
       try {
           admin.messaging().sendToDevice(snapshot.val(), payload)
               .then(function (response) {
                   console.log("Successfully sent message:", response);
               })
               .catch(function (error) {
                   console.log("Error sending message:", error);
               });
       } catch (err) {
           console.log("Probably a null token, fam")
           console.log(err)
       }

   })
 }
