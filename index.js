var functions = require('firebase-functions');
const https = require('https');
let admin = require('firebase-admin');
let FieldValue = require("firebase-admin").FieldValue;

admin.initializeApp(functions.config().firebase);



// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.clockIn = functions.https.onRequest((request, response) => { 

    var conId = request.query.conId
    var location = request.query.location

    var firestore = admin.firestore();

    firestore.collection("users/" + conId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        
        console.log(shiftCollection)
        console.log(shiftCollection.size)

        if (shiftCollection.size != 0) {
            console.log("collection exists")
            shiftCollection.forEach(function (shiftWithNewestStartDate) {
                console.log(shiftWithNewestStartDate.data().endTime)
                if (shiftWithNewestStartDate.data().endTime == null) {
                    response.status(400)
                    response.end("There is already an open shift")
                } else {
                    firestore.collection("users/" + conId + "/shift").add({
                        startTime: admin.firestore.FieldValue.serverTimestamp(),
                        startLocation: location
                    }).then(function () {
                        response.end("Successful clock in");
                    })
                }
            })
        } else {
            firestore.collection("users/" + conId + "/shift").add({
                startTime: admin.firestore.FieldValue.serverTimestamp(),
                startLocation: location
            }).then(function () {
                response.end("Successful clock in");
            })
        }

        
        

    })


})

exports.clockOut = functions.https.onRequest((request, response) => { 

    var firestore = admin.firestore();
    var contactId = request.query.conId
    var location = request.query.location

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) { 
        if (shiftCollection.size != 0) {

            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(400)
                    response.end("There is no open shift")
                } else {

                    var latestShiftRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id)
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id +"/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {
                        breakCollection.forEach(function (latestBreakDoc) {
                            if (latestBreakDoc.data().endTime == null) {

                                response.status(201)
                                response.end("User is on break, please end before clocking out")


                                // var latestBreakRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks/" + latestBreakDoc.id)
                                // latestBreakRef.update({
                                //     endTime: admin.firestore.FieldValue.serverTimestamp()
                                // }).then(function () {
                                //     firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (updatedBreakCollection) {

                                //         updatedBreakCollection.forEach(function (updatedBreak) {
                                //             var breakData = updatedBreak.data()
                                //             var breakDuration = (breakData.endTime - breakData.startTime)

                                //             latestBreakRef.update({
                                //                 duration: breakDuration
                                //             })
                                //         })

                                //     })
                                // })
                            } else {
                                firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime").limit(1).get().then(function (jobCollection) {
                                    jobCollection.forEach(function (latestJobDoc) {
                                        if (latestJobDoc.data().endTime == null) {

                                            response.status(201)
                                            response.end("User is on a job, please end before clocking out")

                                            // var latestJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + latestJobDoc.id)
                                            // latestJobRef.update({
                                            //     endTime: admin.firestore.FieldValue.serverTimestamp()
                                            // }).then(function () {
                                            //     firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").where("jobId", "==", latestJobDoc.id).get().then(function (breakCollection) {
                                            //         var totalBreakDuration = 0
                                            //         if (breakCollection.size != 0) {
                                            //             breakCollection.forEach(function (breakForJob) {
                                            //                 totalBreakDuration += (breakForJob.data().endTime - breakForJob.data().startTime)
                                            //             })
                                            //         }
                                            //         firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime").limit(1).get().then(function (jobCollection) {
                                            //             jobCollection.forEach(function (updatedJob) {
                                            //                 var updatedJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + updatedJob.id)
                                            //                 var duration = updatedJob.data().endTime - updatedJob.data().startTime
                                            //                 duration -= totalBreakDuration

                                            //                 updatedJobRef.update({
                                            //                     duration: duration
                                            //                 })
                                            //             })
                                            //         })


                                            //     })
                                            // })
                                        } else {
                                            latestShiftRef.update({
                                                endTime: admin.firestore.FieldValue.serverTimestamp(),
                                                endLocation: location
                                            }).then(function () {
                                                firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (updatedShiftCollection) {


                                                    updatedShiftCollection.forEach(function (updatedShiftDoc) {
                                                        var duration = (updatedShiftDoc.data().endTime - updatedShiftDoc.data().startTime)


                                                        firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").get().then(function (shiftBreaks) {

                                                            shiftBreaks.forEach(function (shiftBreakDoc) {


                                                                duration -= shiftBreakDoc.data().duration
                                                            })
                                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").get().then(function (shiftJobs) {

                                                                var generalDuration = duration
                                                                shiftJobs.forEach(function (shiftJobDoc) {
                                                                    generalDuration -= shiftJobDoc.data().duration
                                                                })


                                                                latestShiftRef.update({
                                                                    duration: duration,
                                                                    generalDuration: generalDuration
                                                                }).then(function () {
                                                                    response.end("Clocked out")
                                                                })
                                                            })
                                                        })

                                                    })
                                                })
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    })
                }
            })


        } else { 
            response.status(201)
            response.end("There is no open shift")
        }
    })

})




exports.startJob = functions.https.onRequest((request, response) => {

    // args of contact id and project id

    var contactId = request.query.conId
    var projId = request.query.projectId

    var db = admin.database();
    var firestore = admin.firestore();

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        
        if (shiftCollection.size != 0){
        
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.data().endTime != null) {
                    response.status(400)
                    response.end("There is no open shift")
                } else {


                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                        if (jobCollection.size != 0) {
                            
                            jobCollection.forEach(function (latestJobDoc) {
                                if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                    response.status(400)
                                    response.end("There is already an open job")
                                } else {

                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {
                                        breakCollection.forEach(function (latestBreak) {
                                            if (latestBreak.data().endTime == null) {
                                                response.status(400)
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
                                    })
                                    
                                }
                            })
                           
                        } else {
                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {
                                breakCollection.forEach(function (latestBreak) {
                                    if (latestBreak.data().endTime == null) {
                                        response.status(400)
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
                            })
                        }

                        
                    })
                }
            })
        } else {
            response.status(400)
            response.end("There is no open shift")
        }

    })

})

exports.endJob = functions.https.onRequest((request, response) => {


    var db = admin.database();

    var contactId = request.query.conId

    var firestore = admin.firestore();

        firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
            if (shiftCollection.size != 0) {
                shiftCollection.forEach(function (latestShiftDoc) {
                    if (latestShiftDoc.data().endTime != null) {
                        response.status(201)
                        response.end("There is no open shift")
                    } else {

                        


                        firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime").limit(1).get().then(function (jobCollection) {
                                if (jobCollection.size != 0) {
                                    jobCollection.forEach(function (latestJobDoc) {
                                        if (latestJobDoc.data().endTime != null) {
                                            response.status(201)
                                            response.end("There is no open job")
                                        } else {

                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime").limit(1).get().then(function (breakCollection) {

                                                breakCollection.forEach(function (latestBreakDoc) {
                                                    if (latestBreakDoc.data().endTime == null) {

                                                        response.status(201)
                                                        response.end("user is on break,  please end before ending the job")
                                                        
                                                        // var latestBreakRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks/" + latestBreakDoc.id)
                                                        // latestBreakRef.update({
                                                        //     endTime: admin.firestore.FieldValue.serverTimestamp()
                                                        // }).then(function () {
                                                        //     firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (updatedBreakCollection) {

                                                        //         updatedBreakCollection.forEach(function (updatedBreak) {
                                                        //             var breakData = updatedBreak.data()
                                                        //             var breakDuration = (breakData.endTime - breakData.startTime)

                                                        //             var updatedBreakRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks/" + updatedBreak.id)

                                                        //             updatedBreakRef.update({
                                                        //                 duration: breakDuration
                                                        //             })
                                                        //         })

                                                        //     })
                                                        // })
                                                    } else {
                                                        var latestJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + latestJobDoc.id)
                                                        latestJobRef.update({

                                                            endTime: admin.firestore.FieldValue.serverTimestamp()
                                                        }).then(function () {
                                                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").where("jobId", "==", latestJobDoc.id).get().then(function (breakCollection) {
                                                                var totalBreakDuration = 0
                                                                if (breakCollection.size != 0) {
                                                                    breakCollection.forEach(function (breakForJob) {
                                                                        totalBreakDuration += (breakForJob.data().endTime - breakForJob.data().startTime)
                                                                    })
                                                                }
                                                                firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime").limit(1).get().then(function (jobCollection) {
                                                                    jobCollection.forEach(function (updatedJob) {
                                                                        var duration = updatedJob.data().endTime - updatedJob.data().startTime
                                                                        duration -= totalBreakDuration

                                                                        var updatedJobRef = firestore.doc("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs/" + updatedJob.id)
                                                                        updatedJobRef.update({
                                                                            duration: duration
                                                                        }).then(function () {
                                                                            response.end("Ended job")
                                                                        })
                                                                    })
                                                                })


                                                            })
                                                        })
                                                    }
                                                })
                                            })
                                        }
                                    })

                                } else {
                                    response.status(400)
                                    response.end("There is no open job")
                                }
                            })
 
                    }
                })
            } else {
                response.status(400)
                response.end("There is no open shift")
            }
        })
    

    

})


exports.startBreak = functions.https.onRequest((request, response) => {

    var contactId = request.query.conId

    var db = admin.database();
    var firestore = admin.firestore();

    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {
        if (shiftCollection.size != 0) {
            shiftCollection.forEach(function (latestShiftDoc) {
                console.log(latestShiftDoc.id)
                if (latestShiftDoc.data().endTime != null) {
                    response.status(400)
                    response.end("There is no open shift")
                } else {
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                        if (breakCollection.size != 0) {
                            breakCollection.forEach(function (latestBreakDoc) {
                                if (latestBreakDoc.exists && latestBreakDoc.data().endTime == null) {
                                    response.status(400)
                                    response.end("There is already an open break")
                                } else {
                                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                                        if (jobCollection.exists) {
                                            var jobId
                                            jobCollection.forEach(function (latestJobDoc) {
                                                
                                                if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                                    jobId = latestJobDoc.id
                                                }
                                            })
                                        }

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
                        } else {
                            firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobCollection) {

                                if (jobCollection.size != 0) {
                                    var jobId
                                    jobCollection.forEach(function (latestJobDoc) {

                                        if (latestJobDoc.exists && latestJobDoc.data().endTime == null) {
                                            jobId = latestJobDoc.id
                                        }
                                    })
                                }

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
            response.status(400)
            response.end("There is no open shift")
        }
        
    })

})

exports.endBreak = functions.https.onRequest((request, response) => {


    var contactId = request.query.conId
    var db = admin.database();
    var firestore = admin.firestore();


    firestore.collection("users/" + contactId + "/shift").orderBy("startTime", "desc").limit(1).get().then(function (shiftCollection) {

        if (shiftCollection.size != 0) {
            shiftCollection.forEach(function (latestShiftDoc) {
                if (latestShiftDoc.exists && latestShiftDoc.data().endTime != null) {
                    response.status(400)
                    response.end("There is no open shift")
                } else {
                    firestore.collection("users/" + contactId + "/shift/" + latestShiftDoc.id + "/breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

                        if (breakCollection.size != 0) {
                            breakCollection.forEach(function (latestBreakDoc) {
                                if (!latestBreakDoc.exists || latestBreakDoc.data().endTime != null) {
                                    //response.sendError("There is not an open break");
                                    response.status(400)
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

                                                
                                                latestBreakRef.update({
                                                    duration: breakDuration
                                                }).then(function () {
                                                    response.end("Successful break end");
                                                })
                                            })

                                            
                                        })
                                    })
                                }
                            })
                        } else {
                            response.sendError( "There is not an open break");
                            response.end()
                        }

                        
                    })
                }
            })
        } else { 
            response.sendError( "There is not an open timesheet");
            response.end()
        }
        
    })


})

exports.notificationFromCol = functions.https.onRequest((request, response) => { 

    var conId = request.query.conId
    var content = request.query.content
    var type = request.query.type
    var itemId = request.query.itemId

    var db = admin.database();

    console.log(conId)
    console.log(content)
    console.log(type)

   
    var iOSToken = db.ref('/users/' + conId + '/tokens/ios');


    db.ref('/users/' + conId + '/notifications/' + type).push().set(itemId)

    // db.ref('/users/' + conId + '/notifications/' + type).once("value", function (snapshot) { 

    //     if (snapshot.exists) {
    //         var currentnumber = snapshot.val();
    //         currentnumber++;
    //         db.ref('/users/' + conId + '/notifications/' + type).set(currentnumber);
    //     }
    //     else { 
    //         db.ref('/users/' + conId + '/notifications/' + type).set(1);
    //     }

    // })


    const payload = {
        data: {
            notificationContent: content,
            notificationType: type
        },
        notification: {
            title: content,
            body: "",
        }
    };

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
    
    response.end('Notifications sent');

})

// exports.updateChatTimestamp = functions.database
//     .ref('/chats/{chatId}')
//         .onWrite(event => {
//             const chat = event.data.val();
//             if (chat.fireOnWrite != true) {
//                 const chatId = event.params.chatId;
//                 var millis = new Date().getTime();
//                 console.log(millis)
//                 event.data.ref.child('fireOnWrite').set(true);
//                 event.data.ref.child('lastTimestamp').set(millis);
//             }
//             else { 
//                 return;
//             }
            
//     })

exports.sendNotification = functions.database
    .ref('/chats/{chatId}/Messages/{pushId}')
    .onWrite(event => {
        // const message = event.data.val();
        // console.log(message.content)

        // var uId = event.params.userId
        // var token = functions.database.ref('/users/'+uId +'/tokens/android').val();

        // sendMessageToUser(token, message.content);

        const message = event.data.val();
        const senderUid = message.author;
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
        var db = admin.database();

            var gettingUsername = db.ref('chats/' + event.params.chatId + '/members/' + senderUid + '/username/');
            gettingUsername.once("value", function(snapshot) {

                var shit = db.ref('/chats/' + event.params.chatId + '/members');
                shit.once("value", function(userIds) {

            userIds.forEach(function (childSnap) {
                
                if (senderUid == childSnap.key) {
                    console.log('Self notification')
                    return;
                }

                try {
                    var userChatRef = db.ref('/users/' + childSnap.key + '/chats/' + event.params.chatId);
                    userChatRef.once("value", function (isInChatSnap) { 
                        if (isInChatSnap.val == false) {
                            return;
                            
                        } else { 

                            var userTokens = db.ref('/users/' + childSnap.key + '/tokens/android');
                            userTokens.once("value", function (tokenSnap) {

                                userName = snapshot.val();
                                const payload = {
                                    data: {
                                        toUserName: userName,
                                        chatId: event.params.chatId,
                                        userId: senderUid,
                                        type: 25

                                    },
                                    notification: {
                                        title: 'New Message from ' + userName,
                                        body: body,
                                        type: 25
                                    }
                                };
                                console.log(tokenSnap.val());
                                if (tokenSnap.val() != null) {

                                    admin.messaging().sendToDevice(tokenSnap.val(), payload)
                                        .then(function (response) {
                                            console.log("Successfully sent message:", response);
                                        })
                                        .catch(function (error) {
                                            console.log("Error sending message:", error);
                                        });
                                }

                            })                            

                        }
                    })
                    
                } catch (err) { 
                   console.log("Android try catch block", err)
                }    

                
                try {
                    console.log("Are we getting here or what")
                    var userTokens = db.ref('/users/' + childSnap.key + '/tokens/ios');
                    userTokens.once("value", function (tokenSnap) {

                        userName = snapshot.val();
                        const payload = {
                            data: {
                                toUserName: userName,
                                chatId: event.params.chatId,
                                userId: senderUid,
                                type: 25
                            },
                            notification: {
                                title: 'New Message from ' + userName,
                                body: body,
                                type: 25
                            }
                        };

                        console.log(tokenSnap.val());                        
                        if (tokenSnap.val() != null) {

                            admin.messaging().sendToDevice(tokenSnap.val(), payload)
                                .then(function (response) {
                                    console.log("Successfully sent message:", response);
                                })
                                .catch(function (error) {
                                    console.log("Error sending message:", error);
                                });
                        }

                    })

                } catch (err) { 
                    console.log("ios try catch block", err)
                }    


            })
                   
            }, function(errorObject) {
                console.log("we really messed up")
            })


        }, function(errorObject) {
            console.log("we really messed up")
        })

    })


function createNotification(typeID, data, title, body) {
    const payload = {
        data: data,
        notification: {
            title: title,
            body: body,
            type: typeID
        }
    }

    return payload;
}

