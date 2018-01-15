'use strict';

//var jobsRef = dbRef.collection("users/" + conId + "/shifts/" + shiftID + "/jobs")
exports.start = function(dbRef,conId,shiftID,startTime,location,callBack){
  checkForOpenJobs(dbRef,conId,shiftID,function(openJobIDs){
    if (openShiftIDs.length == 0){
      jobsRef.add({
          startTime: startTime,
          endTime:null,
          startLocation: location
      }).then(newJobRef =>  {
          newJobRef.get()
            .then(newJobSnap => {
                if (!newJobSnap.exists) {
                    console.log('Create New Job Failed');
                    callBack(false, "Unable to Create Job in database")
                } else {
                  console.log("New Job Created:", newJobRef.id)
                  callBack(true, {[newJobRef.id]:newJobSnap.data()})
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
      });
    }else{
      console.log("Error clocking in [Open Jobs]:", openJobIDs)
      callBack(false, openJobIDs)
    }
  });
}

//returns a collection of OpenJobs if there are any
exports.checkForOpenJobs = function( jobsRef, callBack) {
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
function updateJobDuration(jobRef){
  console.log("updating job duration:" +  jobRef.id);
}

function deleteJob(jobRef){
  jobRef.delete().then(function() {
      console.log("Deleted the invalid job:" +  jobRef.id);
  }).catch(function(error) {
      console.error("Error removing invalid job: ", jobRef.id);
  });
}
