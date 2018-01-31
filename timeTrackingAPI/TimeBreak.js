'use strict';


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
function updateBreakDuration(breakRef){
  console.log("updating break duration:" + breakRef.id);
  var shiftRef = breakRef.parent.parent

  breakRef.get().then(function (updatedBreak) {
    var breakData = updatedBreak.data()
    console.log("we got the break")
    var breakDuration = (breakData.endTime - breakData.startTime)

    var seconds = breakDuration / 1000
    var minutes = seconds / 60
    var hours = minutes / 60
    hours = hours.toFixed(2)

    breakRef.update({
      duration: breakDuration,
      hours: hours
    }).then(function () {

    
      shiftRef.get().then(function (shiftDoc) {
        var completedBreakDuration
        if (shiftDoc.data().completedBreakDuration == null) {
          completedBreakDuration = breakDuration
        } else {
          completedBreakDuration = (shiftDoc.data().completedBreakDuration) + breakDuration
        }
        shiftRef.update({
          completedBreakDuration: completedBreakDuration
        }).then(function () {
          shiftRef.collection("jobs/").orderBy("startTime", "desc").limit(1).get().then(function (jobsref) {
            if (jobsref.size != 0) {

              jobsref.forEach(function (jobdoc) {
                if (jobdoc.data().endTime == null) {

                  var jobCompletedBreakDuration
                  if (jobdoc.data().completedBreakDuration == null) {
                    jobCompletedBreakDuration = breakDuration
                  } else {
                    jobCompletedBreakDuration = (jobdoc.data().completedBreakDuration) + breakDuration
                  }

                  
                  jobdoc.ref.update({
                    completedBreakDuration: jobCompletedBreakDuration
                  })
                } else {
                 
                }
              })
            } else {
             
            }
          })
        })

      })


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
