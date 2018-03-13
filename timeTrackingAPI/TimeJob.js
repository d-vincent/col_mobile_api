'use strict';
let admin = require('firebase-admin');

const TimeSheetClass = require('./TimeSheet');

exports.verifyJobStart = function (jobRef) {
  checkForOpenJobs(jobRef.parent, function (openJobIds) {
    if (openJobIds.length == 1) { //the new job should the only open job
      if (jobRef.id != openJobIds[0]) {
        deleteJob(jobRef);
      } else {
        console.log("jobStartSuccessful");
      }
    } else {
      deleteJob(jobRef);
    }
  });
}


exports.verifyJobEnd = function (jobRef, oldJobData) {
  var shiftRef = jobRef.parent.parent
  updateJobDuration(shiftRef, jobRef)

  // shiftRef.collection("breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

  //   if (breakCollection.size != 0) {
  //     breakCollection.forEach(function (latestBreakDoc) {
  //       if (latestBreakDoc.data().endTime == null) {
  //         response.status(201).json({ error: "user is on break,  please end before ending the job" });
  //       } else {
  //         updateJobDuration(shiftRef, jobRef)
  //       }
  //     })
  //   } else {

  //     updateJobDuration(shiftRef, jobRef)
  //   }
  // })
}


//var jobsRef = dbRef.collection("users/" + conId + "/shifts/" + shiftID + "/jobs")
exports.start = function (dbRef, conId, shiftID, startTime, location, callBack) {
  checkForOpenJobs(dbRef, conId, shiftID, function (openJobIDs) {
    if (openShiftIDs.length == 0) {
      jobsRef.add({
        startTime: startTime,
        endTime: null,
        startLocation: location
      }).then(newJobRef => {
        newJobRef.get()
          .then(newJobSnap => {
            if (!newJobSnap.exists) {
              console.log('Create New Job Failed');
              callBack(false, "Unable to Create Job in database")
            } else {
              console.log("New Job Created:", newJobRef.id)
              callBack(true, { [newJobRef.id]: newJobSnap.data() })
            }
          })
          .catch(err => {
            console.log('Error getting document', err);
          });
      });
    } else {
      console.log("Error clocking in [Open Jobs]:", openJobIDs)
      callBack(false, openJobIDs)
    }
  });
}

//returns a collection of OpenJobs if there are any
exports.checkForOpenJobs = checkForOpenJobs
function checkForOpenJobs(jobsRef, callBack) {
  var openJobIDs = []
  jobsRef.where('endTime', '==', null).get()
    .then(snapshot => {
      snapshot.forEach(function (openJob) {
        openJobIDs.push(openJob.id);
      })
      console.log("Open Jobs:", openJobIDs)
      callBack(openJobIDs)
    })
    .catch(err => {
      console.log('Error getting open jobs', err);
      callBack(openJobIDs)
    });
}


//calculates duration for
exports.updateJobDuration = updateJobDuration
function updateJobDuration(shiftRef, jobRef) {
  console.log("updating job duration:" + jobRef.id);
  shiftRef.collection("breaks").where("jobId", "==", jobRef.id).get().then(function (breakCollection) {
    var totalBreakDuration = 0
    if (breakCollection.size != 0) {
      breakCollection.forEach(function (breakForJob) {
        totalBreakDuration += (breakForJob.data().endTime - breakForJob.data().startTime)
      })
    }


    jobRef.get().then(function (jobDoc) {
      console.log("got the job")
      var duration = jobDoc.data().endTime - jobDoc.data().startTime
      duration -= totalBreakDuration
      var seconds = duration / 1000

      var minutes = seconds / 60

      var hours = minutes / 60
      hours = (hours.toFixed(2))/1


      jobRef.update({
        duration: duration,
        hours: hours
      }).then(function () {

        TimeSheetClass.updateShiftDuration(shiftRef, jobDoc);
      })
    })


  })

}

function deleteJob(jobRef) {
  jobRef.delete().then(function () {
    console.log("Deleted the invalid job:" + jobRef.id);
  }).catch(function (error) {
    console.error("Error removing invalid job: ", jobRef.id);
  });
}


exports.updateDeletedJobs = updateDeletedJobs
function updateDeletedJobs(userID,jobID) {
  return new Promise((resolve, reject) => {
    var firestore = admin.firestore();
    var currentTime = new Date()
    var deletedThisYearRef = firestore.collection("users/" + userID + "/deletedJobs/")
                              .doc(currentTime.getFullYear().toString());
    var segmentID = (currentTime.getMonth() + 1).toString();
    var getDoc = deletedThisYearRef.get().then(doc => {
        var data = {}
        if (!doc.exists) {
          data[segmentID] = [jobID]
          deletedThisYearRef.set(data).then(function () {
              resolve('creating new year bracket for the job: '+ jobID);
          }).catch(err=>{
              reject('Error deleting job in new record: ' +err);
          });
        } else {
          var deleted = []
          if(doc.get(segmentID)) {
            deleted = doc.get(segmentID)
          }
          deleted.push(jobID)
          data[segmentID] = deleted
          deletedThisYearRef.update(data).then(function () {
              resolve('deleted job added to record: '+jobID);
          }).catch (err=>{
            reject('Error deleting jobID' +err);
          });
        }
    })
    .catch(err => {
      reject('Error getting jobID' + err);
    });
  });

};
