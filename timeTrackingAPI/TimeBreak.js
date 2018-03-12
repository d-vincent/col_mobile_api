'use strict';
let admin = require('firebase-admin');

/**
 * returns a collection of openshift if there are anys
 * endTime must be null to show up, when time sheeet is inserted
 */

exports.verifyBreakStart = verifyBreakStart
function verifyBreakStart (breakRef) {
  checkForOpenBreaks(breakRef.parent, function (openBreakIds) {
    if (openBreakIds.length == 1) { //the new job should the only open job
      if (breakRef.id != openBreakIds[0]) {
        deleteBreak(breakRef);
      } else {
        console.log("breakStartSuccessful");
      }
    } else if (openBreakIds.length > 1) {
      deleteBreak(breakRef);

    }
  });
}

exports.checkForOpenBreaks = checkForOpenBreaks
function checkForOpenBreaks (breaksRef,callBack) {
  var openBreakIDs = []
  console.log(breaksRef);
  breaksRef.where('endTime', '==', null).get()
    .then(snapshot => {
      snapshot.forEach(function (openBreak) {
        openBreakIDs.push(openBreak.id);
      })
      callBack(openBreakIDs)
      console.log("Open breaks:", openBreakIDs)
    })
    .catch(err => {
      callBack(openBreakIDs)
      console.log('Error getting openBreakIDs', err);
    });
}





//calculates duration for
exports.updateBreakDuration = updateBreakDuration
function updateBreakDuration(breakRef, callbackFunction) {
  console.log("updating break duration:" + breakRef.id);
  var shiftRef = breakRef.parent.parent

  breakRef.get().then(function (updatedBreak) {
    var breakData = updatedBreak.data()
    console.log("we got the break")
    var breakDuration = (breakData.endTime - breakData.startTime)

    var seconds = breakDuration / 1000
    var minutes = seconds / 60
    var hours = minutes / 60
    hours = (hours.toFixed(2)) / 1

    return breakRef.update({
      duration: breakDuration,
      hours: hours
    }).then(function () {


     return shiftRef.get().then(function (shiftDoc) {

        var check = (shiftDoc.data().endTime < breakData.endTime)
        console.log(check)
        console.log(shiftDoc.data().endTime)
        console.log(breakData.endTime)
        if (check) {
          console.log(check)
          shiftRef.update({

            endTime: breakData.endTime
          })
        } else if (shiftDoc.data().startTime > breakData.startTime) {
          shiftRef.update({

            startTime: breakData.startTime
          })
        }


      })


      var jobId = breakData.jobId
      shiftRef.collection("jobs").doc(jobId).get().then(function (jobdoc) {

        if (jobdoc.data().endTime < breakData.endTime) {
          shiftRef.update({

            endTime: breakData.endTime
          })
        } else if (jobdoc.data().startTime > breakData.startTime) {
          shiftRef.update({

            startTime: breakData.startTime
          })
        }

      })

      callbackFunction();

      return true;
    })
  })

}

function deleteBreak(breakRef){
  breakRef.delete().then(function() {
      console.log("Deleted the invalid break:" +  breakRef.id);
  }).catch(function(error) {
      console.error("Error removing invalid break: ", breakRef.id);
  });
}


exports.updateDeletedBreaks = updateDeletedBreaks
function updateDeletedBreaks(userID,breakID) {
  return new Promise((resolve, reject) => {
    var firestore = admin.firestore();
    var currentTime = new Date()
    var deletedThisYearRef = firestore.collection("users/" + userID + "/deletedBreaks/")
                              .doc(currentTime.getFullYear().toString());
    var segmentID = (currentTime.getMonth() + 1).toString();
    var getDoc = deletedThisYearRef.get().then(doc => {
        var data = {}
        if (!doc.exists) {
          data[segmentID] = [breakID]
          deletedThisYearRef.set(data).then(function () {
              resolve('creating new year bracket for the break: '+ breakID);
          }).catch(err=>{
              reject('Error deleting break in new record: ' +err);
          });
        } else {
          var deleted = []
          if(doc.get(segmentID)) {
            deleted = doc.get(segmentID)
          }
          deleted.push(breakID)
          data[segmentID] = deleted
          deletedThisYearRef.update(data).then(function () {
              resolve('deleted break added to record: '+breakID);
          }).catch (err=>{
            reject('Error deleting breakID' +err);
          });
        }
    })
    .catch(err => {
      reject('Error getting breakID' + err);
    });
  });

};
