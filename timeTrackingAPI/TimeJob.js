'use strict';


const TimeSheetClass = require('./TimeSheet');

exports.verifyJobStart = function (jobRef) {
  checkForOpenJobs(jobRef.parent, function (openJobIds) {
    if (openJobIds.length == 1) { //the new job should the only open job
      if (jobRef.id != openShiftIDs[0]) {
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

  shiftRef.collection("breaks").orderBy("startTime", "desc").limit(1).get().then(function (breakCollection) {

    if (breakCollection.size != 0) {
      breakCollection.forEach(function (latestBreakDoc) {
        if (latestBreakDoc.data().endTime == null) {
          response.status(201).json({ error: "user is on break,  please end before ending the job" });
        } else {
          updateJobDuration(shiftRef, jobRef)
        }
      })
    } else {
      
      updateJobDuration(shiftRef, jobRef)
    }
  })
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
exports.checkForOpenJobs = function (jobsRef, callBack) {
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
      var duration = jobDoc.data().endTime - jobDoc.data().startTime
      duration -= totalBreakDuration
      var seconds = duration / 1000

      var minutes = seconds / 60

      var hours = minutes / 60
      hours = hours.toFixed(2)

      jobRef.update({
        duration: duration,
        hours: hours
      }).then(function () { 

        TimeSheetClass.updateShiftDuration(shiftRef);
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
