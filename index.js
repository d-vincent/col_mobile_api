
'use strict';

var functions = require('firebase-functions');
const https = require('https');
let admin = require('firebase-admin');
let FieldValue = require("firebase-admin").FieldValue;

admin.initializeApp(functions.config().firebase);

//should list the apis here
const COLNotificationAPI = require('./notificationAPI/COLNotifications');
const ChatNotificationAPI = require('./notificationAPI/ChatNotifications');
const TimeSheetAPI = require('./timeTrackingAPI/TimeSheetAPI');


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.clockIn = functions.https.onRequest((request, response) => {

    var conId = request.body.conId
    var location = request.body.location

    var firestore = admin.firestore();

    firestore.collection("users/" + conId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        console.log(shiftCollection)
        console.log(shiftCollection.size)

        if (shiftCollection.size != 0) {
            console.log("collection exists")
            shiftCollection.forEach(function (shiftWithNewestStartDate) {
                console.log(shiftWithNewestStartDate.data().endTime)
                if (shiftWithNewestStartDate.data().endTime == null) {
                    response.status(201)
                    console.log("There is already an open shift")
                    response.end("There is already an open shift")
                } else {

                    var docRef = firestore.collection("users/" + conId + "/shift").doc();
                    var docId = docRef.id
                    docRef.set({
                        startTime: admin.firestore.FieldValue.serverTimestamp(),
                        startLocation: location,
                        endTime: null
                    }).then(function () {

                        response.end("{ \"ID\":" + docId + "}");
                    })
                }
            })
        } else {

            var docRef = firestore.collection("users/" + conId + "/shift").doc();
            var docId = docRef.id
            docRef.set({
                startTime: admin.firestore.FieldValue.serverTimestamp(),
                startLocation: location,
                endTime: null
            }).then(function () {

                response.end("{ \"ID\":" + docId + "}");
            })

            // firestore.collection("users/" + conId + "/shift").add({
            //     startTime: admin.firestore.FieldValue.serverTimestamp(),
            //     startLocation: location
            // }).then(function () {
            //     response.end("Successful clock in");
            // })
        }
    })
})

exports.clockOut = functions.https.onRequest((request, response) => {

    var firestore = admin.firestore();
    var contactId = request.body.conId
    var location = request.body.location

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        if (shiftCollection.size != 0) {

            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(201)
                    response.statusMessage = "Hello"
                    console.log("There is no open shift")
                    response.end("There is no open shift")
                } else {
                    var latestShiftRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id)
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                        if (breakCollection.size != 0) {

                            breakCollection.forEach(function (latestBreakDoc) {
                                if (latestBreakDoc.data().endTime == null) {
                                    response.status(201)
                                    response.end("User is on break")
                                } else {

                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobsCollection) {
                                        if (jobsCollection.size != 0) {

                                            jobsCollection.forEach(function (latestJobDoc) {
                                                if (latestJobDoc.data().endTime == null) {
                                                    response.status(201)
                                                    response.end("User is on job")
                                                } else {

                                                    performClockOut(latestShiftRef, location, contactId, response)
                                                }
                                            })

                                        } else {
                                            performClockOut(latestShiftRef, location, contactId, response)
                                        }
                                    })
                                }
                            })
                        } else {
                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobsCollection) {
                                if (jobsCollection.size != 0) {

                                    console.log("found a job")
                                    jobsCollection.forEach(function (latestJobDoc) {
                                        if (latestJobDoc.data().endTime == null) {
                                            response.status(201)
                                            response.end("User is on job")
                                        } else {

                                            performClockOut(latestShiftRef, location, contactId, response)
                                        }
                                    })

                                } else {
                                    performClockOut(latestShiftRef, location, contactId, response)
                                }
                            })
                        }
                    })
                }
            })
        } else {
            response.status(201)
            response.end("There is no open shift")
        }
    })

})

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
                            response.status(200)
                            response.end("Clocked out")
                        })
                    })
                })

            })
        })
    })
}




exports.startJob = functions.https.onRequest((request, response) => {

    // args of contact id and project id

    var contactId = request.body.conId
    var projId = request.body.projectId

    var db = admin.database();
    var firestore = admin.firestore();

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        if (shiftCollection.size != 0){
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(201)
                    response.end("There is no open shift")
                } else {


                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                        if (jobCollection.size != 0) {

                            jobCollection.forEach(function (latestJobDoc) {
                                if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                    response.status(201)
                                    response.end("There is already an open job")
                                } else {

                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                                        if (breakCollection.size != 0){
                                            breakCollection.forEach(function (latestBreak) {
                                                if (latestBreak.data().endTime == null) {
                                                    response.status(201)
                                                    response.end("User is on break. Please end The break before starting a job")

                                                } else {

                                                    var docRef = firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/").doc();
                                                    var docId = docRef.id

                                                    docRef.set({
                                                        startTime: admin.firestore.FieldValue.serverTimestamp(),
                                                        projectId: projId,
                                                        endTime: null
                                                    }).then(function () {
                                                        response.end("{" + docId + "}");
                                                    })
                                                }
                                            })
                                        } else {
                                            var docRef = firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/").doc();
                                            var docId = docRef.id

                                            docRef.set({
                                                startTime: admin.firestore.FieldValue.serverTimestamp(),
                                                projectId: projId,
                                                endTime: null
                                            }).then(function () {
                                                response.end("{" + docId + "}");
                                            })
                                        }
                                    })


                                }
                            })
                        } else {
                            console.log("no job collection")
                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {
                                if (breakCollection.size != 0) {
                                    breakCollection.forEach(function (latestBreak) {
                                        if (latestBreak.data().endTime == null) {
                                            response.status(201)
                                            response.end("User is on break. Please end The break before starting a job")

                                        } else {

                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/").add({
                                                startTime: admin.firestore.FieldValue.serverTimestamp(),
                                                projectId: projId
                                            }).then(function () {
                                                response.end("Successful Job Start");
                                            })
                                        }
                                    })
                                } else {
                                    console.log("no break collection")
                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/").add({
                                        startTime: admin.firestore.FieldValue.serverTimestamp(),
                                        projectId: projId
                                    }).then(function () {
                                        response.end("Successful Job Start");
                                    })
                                }
                            })
                        }

                    })
                }
            })
        } else {
            response.status(201)
            response.end("There is no open shift")
        }

    })

})

exports.endJob = functions.https.onRequest((request, response) => {


    var db = admin.database();

    var contactId = request.body.conId

    var firestore = admin.firestore();

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        if (shiftCollection.size != 0) {
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(201)
                    response.end("There is no open shift")
                } else {




                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {
                        if (jobCollection.size != 0) {
                            jobCollection.forEach(function (latestJobDoc) {
                                if (latestJobDoc.data().endTime != null) {
                                    response.status(201)
                                    response.end("There is no open job")
                                } else {

                                    var latestJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + latestJobDoc.id)
                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime" , "desc").limit(1).get().then(function (breakCollection) {

                                        if (breakCollection.size != 0) {
                                            breakCollection.forEach(function (latestBreakDoc) {
                                                if (latestBreakDoc.data().endTime == null) {

                                                    response.status(201)
                                                    response.end("user is on break,  please end before ending the job")

                                                } else {

                                                    performJobEnd(latestJobRef,latestShiftDoc, contactId, response)
                                                }
                                            })
                                        } else {
                                            console.log(latestShiftDoc.id)
                                            performJobEnd(latestJobRef, latestShiftDoc, contactId, response)
                                        }
                                    })
                                }
                            })

                        } else {
                            response.status(201)
                            response.end("There is no open job")
                        }
                    })

                }
            })
        } else {
            response.status(201)
            response.end("There is no open shift")
        }
    })




})

function performJobEnd(latestJobRef, latestShiftDoc, contactId, response) {
    var firestore = admin.firestore()

    latestJobRef.update({

        endTime: admin.firestore.FieldValue.serverTimestamp()
    }).then(function () {
        console.log(latestShiftDoc.id)
        firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").where("jobId", "==", latestJobRef.id).get().then(function (breakCollection) {
            var totalBreakDuration = 0
            if (breakCollection.size != 0) {
                breakCollection.forEach(function (breakForJob) {
                    totalBreakDuration += (breakForJob.data().endTime - breakForJob.data().startTime)
                })
            }
            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {
                jobCollection.forEach(function (updatedJob) {
                    var duration = updatedJob.data().endTime - updatedJob.data().startTime
                    duration -= totalBreakDuration



                    var seconds = duration / 1000
                    console.log(seconds)
                    var minutes = seconds / 60
                    console.log(minutes)
                    var hours = minutes / 60
                    hours = hours.toFixed(2)

                    console.log(hours)



                    var updatedJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + updatedJob.id)
                    updatedJobRef.update({
                        duration: duration,
                        hours: hours
                    }).then(function () {
                        response.status(200)
                        response.end("Ended job")
                    })
                })
            })

        })
    })

}




exports.startBreak = functions.https.onRequest((request, response) => {

    var contactId = request.body.conId

    var db = admin.database();
    var firestore = admin.firestore();

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        if (shiftCollection.size != 0) {
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(201)
                    response.end("There is no open shift")
                } else {
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                        if (breakCollection.size != 0) {
                            breakCollection.forEach(function (latestBreakDoc) {
                                if (latestBreakDoc.exists && latestBreakDoc.data().endTime == null) {
                                    response.status(201)
                                    response.end("There is already an open break")
                                } else {
                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                                        var jobId

                                            jobCollection.forEach(function (latestJobDoc) {
                                                if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                                    jobId = latestJobDoc.id
                                                    console.log(jobId)
                                                }
                                            })


                                        console.log(jobId)
                                        if (jobId == null) {

                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").add({
                                                startTime: admin.firestore.FieldValue.serverTimestamp(),
                                                endTime: null

                                            }).then(function () {
                                                response.end("BreakStart");
                                            })
                                        } else {
                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").add({
                                                startTime: admin.firestore.FieldValue.serverTimestamp(),
                                                jobId: jobId,
                                                endTime: null
                                            }).then(function () {
                                                response.end("BreakStart");
                                            })
                                        }
                                    })
                                }
                            })
                        } else {
                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                                var jobId


                                    jobCollection.forEach(function (latestJobDoc) {

                                        if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                            jobId = latestJobDoc.id
                                            console.log(jobId)
                                        }
                                    })



                                console.log(jobId)
                                if (jobId == null) {

                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").add({
                                        startTime: admin.firestore.FieldValue.serverTimestamp()

                                    }).then(function () {
                                        response.end("BreakStart");
                                    })
                                } else {
                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").add({
                                        startTime: admin.firestore.FieldValue.serverTimestamp(),
                                        jobId: jobId
                                    }).then(function () {
                                        response.end("BreakStart");
                                    })
                                }



                            })
                        }


                    })
                }
            })
        } else {
            response.status(201)
            response.end("There is no open shift")
        }
    })

})

exports.endBreak = functions.https.onRequest((request, response) => {


    var contactId = request.body.conId
    var db = admin.database();
    var firestore = admin.firestore();


    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {

        if (shiftCollection.size != 0) {
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.exists && latestShiftDoc.data().endTime != null) {
                    response.status(201)
                    response.end("There is no open shift")
                } else {
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                        if (breakCollection.size != 0) {
                            breakCollection.forEach(function (latestBreakDoc) {
                                if (!latestBreakDoc.exists || latestBreakDoc.data().endTime != null) {
                                    //response.sendError("There is not an open break");
                                    response.status(201)
                                    response.end("There is not an open break")
                                } else {

                                    var latestBreakRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks/" + latestBreakDoc.id)
                                    console.log(latestBreakDoc.id)
                                    latestBreakRef.update({
                                        endTime: admin.firestore.FieldValue.serverTimestamp()
                                    }).then(function () {
                                        firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (updatedBreakCollection) {

                                            updatedBreakCollection.forEach(function (updatedBreak) {
                                                var breakData = updatedBreak.data()
                                                var breakDuration = (breakData.endTime - breakData.startTime)

                                                var seconds = breakDuration / 1000
                                                var minutes = seconds / 60
                                                var hours = minutes / 60
                                                hours = hours.toFixed(2)

                                                latestBreakRef.update({
                                                    duration: breakDuration,
                                                    hours: hours
                                                }).then(function () {

                                                    var latestShiftRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id)
                                                    latestShiftRef.get().then(function (shiftDoc) {
                                                        var completedBreakDuration
                                                        if (shiftDoc.data().completedBreakDuration == null) {
                                                            completedBreakDuration = breakDuration
                                                        } else {
                                                            completedBreakDuration = (shiftDoc.data().completedBreakDuration) + breakDuration
                                                        }
                                                            latestShiftRef.update({
                                                                completedBreakDuration: completedBreakDuration
                                                            }).then(function () {
                                                                latestShiftRef.collection("jobs/").orderBy("startTime", "desc").limit(1).get().then(function (jobsref) {
                                                                    if (jobsref.size != 0) {

                                                                        jobsref.forEach(function (jobdoc) {
                                                                            if (jobdoc.data().endTime == null) {

                                                                                var jobCompletedBreakDuration
                                                                                if (jobdoc.data().completedBreakDuration == null) {
                                                                                    jobCompletedBreakDuration = breakDuration
                                                                                } else {
                                                                                    jobCompletedBreakDuration = (jobdoc.data().completedBreakDuration) + breakDuration
                                                                                }

                                                                                firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + jobdoc.id ).update({
                                                                                    completedBreakDuration: jobCompletedBreakDuration
                                                                                }).then(function () {
                                                                                    response.end("Successful break end");
                                                                                })

                                                                            } else {
                                                                                response.end("Successful break end");
                                                                            }
                                                                        })
                                                                    } else {
                                                                        response.end("Successful break end");
                                                                    }
                                                                })
                                                            })

                                                    })


                                                })
                                            })

                                        })
                                    })
                                }
                            })
                        } else {
                            response.status(201)
                            response.end("There is no open break")
                        }


                    })
                }
            })
        } else {
            response.status(201)
            response.end("There is no open shift")
        }
    })


})



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



exports.clockInShift = functions.https.onRequest((request, response) => {
  if (request.method != "POST") {
      response.status(400).send("Invalid Request Method: requires POST");
     return;
   }
   if (request.body.conId == null) {
       response.status(400).send("Invalid Request Body: requires COL ID {conId}");
     return;
   }
   TimeSheetAPI.clockIn(request, response,admin);
});
