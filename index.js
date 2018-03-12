
'use strict';

var functions = require('firebase-functions');
const https = require('https');
let admin = require('firebase-admin');
let FieldValue = require("firebase-admin").FieldValue;

admin.initializeApp(functions.config().firebase);
let initialized = false;
//should list the apis here
let COLNotificationAPI;
let ChatNotificationAPI;
const TimeSheetClass = require('./timeTrackingAPI/TimeSheet');
const TimeJobClass = require('./timeTrackingAPI/TimeJob');
const TimeBreakClass = require('./timeTrackingAPI/TimeBreak');

function init() {
  if(initialized) {return;}
  COLNotificationAPI = require('./notificationAPI/COLNotifications');
  ChatNotificationAPI = require('./notificationAPI/ChatNotifications');
  initialized = true;
}

init()

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


function performClockOut(latestShiftRef, location, contactId, response) {

    var firestore = admin.firestore()
    latestShiftRef.update({
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        endLocation: location
    }).then(function () {
        firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (updatedShiftCollection) {


            updatedShiftCollection.forEach(function (updatedShiftDoc) {
                var duration = (updatedShiftDoc.data().endTime - updatedShiftDoc.data().startTime)


                firestore.collection("users/" + contactId + "/shift/" + updatedShiftDoc.id + "/breaks").get().then(function (shiftBreaks) {

                    shiftBreaks.forEach(function (shiftBreakDoc) {


                        duration -= shiftBreakDoc.data().duration
                    })
                    firestore.collection("users/" + contactId + "/shift/" + updatedShiftDoc.id + "/jobs").get().then(function (shiftJobs) {

                        var generalDuration = duration
                        shiftJobs.forEach(function (shiftJobDoc) {
                            generalDuration -= shiftJobDoc.data().duration
                        })

                        var seconds = duration / 1000
                        var minutes = seconds / 60
                        var hours = minutes / 60
                        hours = hours.toFixed(2)


                        var generalSeconds = generalDuration / 1000
                        var generalMinutes = generalSeconds / 60
                        var generalHours = generalMinutes / 60
                        generalHours = generalHours.toFixed(2)



                        latestShiftRef.update({
                            duration: duration,
                            generalDuration: generalDuration,
                            hours: hours,
                            generalHours, generalHours
                        }).then(function () {
                            response.status(200).json({result:"Clocked out"})
                        })
                    })
                })

            })
        })
    })
}



exports.newBreak = functions.firestore.document('/users/{userID}/shift/{shiftID}/breaks/{breakID}')
    .onCreate(event => {
        var endTime = event.data.data().endTime;
        var newBreakRef = event.data.ref;
        if (endTime == null) {
            //this is a break start
            TimeBreakClass.verifyBreakStart(newBreakRef);
        } else {

        }
    })
exports.updateBreak = functions.firestore.document("/users/{userID}/shift/{shiftID}/breaks/{breakID}")
    .onUpdate(event => {
        var oldData = event.data.previous.data();
        var newEndTime = event.data.data().endTime;
        var oldEndTime = event.data.previous.data().endTime;
        var oldStartTime = event.data.previous.data().startTime;
        var newStartTime = event.data.data().startTime;
        var breakRef = event.data.ref;
        var oldDuration = event.data.previous.data().duration;
        var newDuration = event.data.data().duration;
        if (oldDuration == null && newDuration != null) {
            //this is triggered by the clockout duration calculations and should be ignored
            console.log("Caught the 2nd trigger")
            return;
        }else if (oldEndTime == null && newEndTime != null) {
            // this is break end
            TimeBreakClass.updateBreakDuration(breakRef)
            
        } else if (oldEndTime != null && newEndTime != null && oldEndTime != newEndTime) {
            //this is just an update, should update all duration
            TimeBreakClass.updateBreakDuration(breakRef, oldData)
           
            
        } else if (oldEndTime != null && newEndTime == null) {
            //this job end failure corrective update
        } else if (oldStartTime != null && newStartTime != null && newStartTime != oldStartTime){// old endtime is null and still null,  jsut a generic update
            TimeJobClass.updateBreakDuration (breakRef, oldData)
        }
})

exports.newJob = functions.firestore.document('/users/{userID}/shift/{shiftID}/jobs/{jobID}')
    .onCreate(event => { 
        var endTime = event.data.data().endTime;
        var newJobRef = event.data.ref;
        if (endTime == null) {
            //this is a job start
            TimeJobClass.verifyJobStart(newJobRef);
        } else {
            
        }
    })

exports.updateJob = functions.firestore.document('/users/{userId}/shift/{shiftId}/jobs/{jobId}')
    .onUpdate(event => {
        var newEndTime = event.data.data().endTime;
        var oldEndTime = event.data.previous.data().endTime;
        var jobRef = event.data.ref;
        var oldDuration = event.data.previous.data().duration;
        var newDuration = event.data.data().duration;
        var completedBreakDuration = event.data.data().completedBreakDuration;
        var oldBreakDuration = event.data.previous.data().completedBreakDuration;
        if (oldBreakDuration == null && completedBreakDuration != null) {

        } else if (oldDuration == null && newDuration != null) { 
            //initial duration calculation
        }
        else if (oldEndTime == null && newEndTime != null) {
            // this is jobEnd
            TimeJobClass.verifyJobEnd(jobRef, event.data.previous.data())
        } else if (oldEndTime != null && newEndTime != null && oldEndTime != newEndTime) {
            //this is just an update, should update all duration
            var shiftRef = jobRef.parent.parent
            console.log("not end, updating job")
            TimeJobClass.updateJobDuration(shiftRef,jobRef)
        } else if (oldEndTime != null && newEndTime == null) {
            //this job end failure corrective update
        } else if (newStartTime == oldStartTime && newEndTime == oldEndTime && completedBreakDuration != oldBreakDuration){// old endtime is null and still null,  jsut a generic update
            TimeJobClass.updateJobDuration(shiftRef, jobRef)
        }
    })

exports.newShift = functions.firestore
  .document('/users/{userID}/shift/{shiftID}')
    .onCreate(event => {
    var endTime = event.data.data().endTime;
    var newShiftRef = event.data.ref;
    if (endTime == null ) {
      //this is a clockIn
      TimeSheetClass.verifyClockIn(newShiftRef);
    }else{
      //just adding new shift, prob import
      //should call update duration here.
    }
});

exports.updateShift = functions.firestore
  .document('/users/{userID}/shift/{shiftID}')
    .onUpdate(event => {
    var newEndTime = event.data.data().endTime;
    var oldEndTime = event.data.previous.data().endTime;
        var shiftRef = event.data.ref;
        var oldDuration = event.data.previous.data().duration;
        var newDuration = event.data.data().duration;
        var completedBreakDuration = event.data.data().completedBreakDuration;
        var oldBreakDuration = event.data.previous.data().completedBreakDuration;
        if (oldBreakDuration == null && completedBreakDuration != null) { 

        }else if (oldDuration == null && newDuration != null) { 
            //this is triggered by the clockout duration calculations and should be ignored
            console.log("Caught the 2nd trigger")
            return;
        }else if (oldEndTime == null && newEndTime != null) {
      // this is clock out
      TimeSheetClass.verifyClockOut(shiftRef,event.data.previous.data())
    } else if (oldEndTime != null && newEndTime != null && oldEndTime != newEndTime) {
      //this is just an update, should update all duration
      TimeSheetClass.updateShiftDuration(shiftRef)
    }else if (oldEndTime != null && newEndTime == null) {
        //this clockout failure corrective update
    }else if (oldEndTime == null && newEndTime == null){// old endtime is null and still null,  jsut a generic update
           
        }
    
        
});


//triggers eachtime a new message is created
//sends  notificaiton to all user involved
exports.sendChatNotifications = functions.database
    .ref('/chats/{chatId}/Messages/{pushId}')
    .onCreate(event => {
    //.onWrite(event => {
    ChatNotificationAPI.sendChatUpdateNotification(event,admin);
})

//triggers notifications to devices
exports.sendCOLNotification = functions.https.onRequest((request, response) => {
  if (request.method != "POST") {
     response.status(400).send("Invalid Request Method: requires POST");
     return;
   }
  COLNotificationAPI.sendNotification(request, response, admin);
});
//resets the particular col thing (rfi, messaging, etc) to 0
exports.clearCOLNotification = functions.https.onRequest((request, response) => {
  if (request.method != "POST") {
      response.status(400).send("Invalid Request Method: requires POST");
     return;
   }
  COLNotificationAPI.resetNotification(request, response, admin);
});


//returns count of notification for each feature by filtered by project {feature: count}
exports.getCOLNotifications = functions.https.onRequest((request, response) => {
  if (request.method != "POST") {
     response.status(400).send("Invalid Request Method: requires POST");
     return;
   }
   if (request.body.conId == null) {
       response.status(400).send("Invalid Request Body: requires COL ID {conId}");
     return;
   }
   if (request.body.projectIds == null) {
       response.status(400).send("Invalid Request Body: requires projectIds {projectIds: [ids]}");
     return;
   }
  COLNotificationAPI.getCOLNotifications(request, response, admin);
});
