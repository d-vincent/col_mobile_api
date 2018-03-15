'use strict';

let admin = require('firebase-admin');


exports.verifyClockIn = function(shiftRef){
  checkForOpenShifts(shiftRef.parent,function(openShiftIDs){
    if (openShiftIDs.length == 1){ //the new shift should the only openshift
      if (shiftRef.id != openShiftIDs[0]) {
        deleteShift(shiftRef);
      }else{
        console.log("clock in shift Successful");
      }
    }else{
      deleteShift(shiftRef);
    }
  });
}

/**
 * verifies if allowed to clockout
 * should get list of jobs, make sure no open jobs
 * should get list of open breaks, make sure no open breaks
 * if everything is good then update duration
 * else use the old shiftData to revert everything back
 */
exports.verifyClockOut = function(shiftRef, oldShiftData ){
  console.log("clockOut triggered");

  shiftRef.collection("breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

    console.log("Checked for breaks")
    if (breakCollection.size != 0) {

      breakCollection.forEach(function (latestBreakDoc) {
        if (latestBreakDoc.data().endTime == null) {
          shiftRef.update(oldShiftData)
          return;

        } else {

          shiftRef.collection("jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobsCollection) {
            if (jobsCollection.size != 0) {

              jobsCollection.forEach(function (latestJobDoc) {
                if (latestJobDoc.data().endTime == null) {
                  shiftRef.update(oldShiftData)
                  return;

                } else {

                  updateShiftDuration(shiftRef)
                }
              })

            } else {
              updateShiftDuration(shiftRef)
            }
          })
        }
      })
    }else {
      shiftRef.collection("jobs").orderBy("startTime", "desc").limit(1).get().then(function (jobsCollection) {
        console.log("Checking for jobs")
        if (jobsCollection.size != 0) {

          console.log("found a job")
          jobsCollection.forEach(function (latestJobDoc) {
            if (latestJobDoc.data().endTime == null) {
              shiftRef.update(oldShiftData)
              return;

            } else {

              updateShiftDuration(shiftRef)
            }
          })

        } else {
          updateShiftDuration(shiftRef)
        }
      })
    }
  })
}




/**
 * returns a collection of openshift if there are anys
 * endTime must be null to show up, when time sheeet is inserted
 */
exports.checkForOpenShifts = checkForOpenShifts
function checkForOpenShifts (shiftsRef,callBack) {
  var openShiftIDs = []
  //console.log(shiftsRef);
  shiftsRef.where('endTime', '==', null).get()
    .then(snapshot => {
      snapshot.forEach(function (openShift) {
        openShiftIDs.push(openShift.id);
      })
      callBack(openShiftIDs)
      console.log("Open Shifts:", openShiftIDs)
    })
    .catch(err => {
      callBack(openShiftIDs)
      console.log('Error getting openshifts', err);
    });
}

//calculates duration for
exports.updateShiftDuration = updateShiftDuration
function updateShiftDuration(shiftRef, jobDoc) {
  console.log("updating shift:" + shiftRef.id);
  shiftRef.get().then(function (shiftDoc) {

    var duration
    if (shiftDoc.data().endTime == null) {
      duration = null;
      return;
    }
    if (jobDoc != null && shiftDoc.data().endTime < jobDoc.data().endTime) {
      shiftRef.update({ endTime: jobDoc.data().endTime })
    } else if (jobDoc != null && jobDoc.data().startTime < shiftDoc.data().startTime) {

      shiftRef.update({
        startTime: jobDoc.data().startTime
      })
    }
     else {
      duration = (shiftDoc.data().endTime - shiftDoc.data().startTime)

      shiftRef.collection("breaks").get().then(function (shiftBreaks) {

        shiftBreaks.forEach(function (shiftBreakDoc) {

          duration -= shiftBreakDoc.data().duration
        })
        shiftRef.collection("jobs").get().then(function (shiftJobs) {

          var generalDuration = duration
          shiftJobs.forEach(function (shiftJobDoc) {

            generalDuration -= shiftJobDoc.data().duration

            if (shiftDoc.data().endTime < shiftJobDoc.data().endTime) {
              shiftJobDoc.ref.update({
                endTime: shiftDoc.data().endTime
              })
            }

            if (shiftDoc.data().startTime > shiftJobDoc.data().startTime) {
              shiftJobDoc.ref.update({
                startTime: shiftDoc.data().startTime
              })
            }

          })

          var seconds = duration / 1000
          var minutes = seconds / 60
          var hours = minutes / 60
          hours = (hours.toFixed(2)) / 1

          var generalSeconds = generalDuration / 1000
          var generalMinutes = generalSeconds / 60
          var generalHours = generalMinutes / 60
          generalHours = (generalHours.toFixed(2)) / 1
          if (generalHours == NaN) {
            generalHours = null
          }

          shiftRef.update({
            duration: duration,
            generalDuration: generalDuration,
            hours: hours,
            generalHours, generalHours
          }).then(function () {
            return;
          })
        })
      })
    }
    })


}

function deleteShift(shiftRef){
  shiftRef.delete().then(function() {
      console.log("Deleted the invalid shift:" +  shiftRef.id);
  }).catch(function(error) {
      console.error("Error removing invalid shift: ", shiftRef.id);
  });
}


exports.updateDeletedShifts = updateDeletedShifts
function updateDeletedShifts(userID,shiftID) {
  return new Promise(
    (resolve, reject) => {
      var firestore = admin.firestore();
      var currentTime = new Date()
      var deletedThisYearRef = firestore.collection("users/" + userID + "/deletedShifts/")
                                .doc(currentTime.getFullYear().toString());
      var segmentID = (currentTime.getMonth() + 1).toString();
      var getDoc = deletedThisYearRef.get().then(doc => {
          var data = {}
          if (!doc.exists) {
            data[segmentID] = [shiftID]
            deletedThisYearRef.set(data).then(function () {
                resolve('creating new year bracket for the doc: '+ shiftID);
            }).catch(err=>{
                reject('Error deleting document in new record: ' +err);
            });
          } else {
            var deleted = []
            if(doc.get(segmentID)) {
              deleted = doc.get(segmentID)
            }
            deleted.push(shiftID)
            data[segmentID] = deleted
            deletedThisYearRef.update(data).then(function () {
                resolve('deleted shift added to record: '+shiftID);
            }).catch (err=>{
              reject('Error deleting document' +err);
            });
          }
      })
      .catch(err => {
        reject('Error getting document' + err);
      });
    }
  );

};
