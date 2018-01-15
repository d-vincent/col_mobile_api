'use strict';



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
}



/**
 * returns a collection of openshift if there are anys
 * endTime must be null to show up, when time sheeet is inserted
 */
exports.checkForOpenShifts = checkForOpenShifts
function checkForOpenShifts (shiftsRef,callBack) {
  var openShiftIDs = []
  console.log(shiftsRef);
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
function updateShiftDuration(shiftRef){
  console.log("updating shift:" +  shiftRef.id);
}

function deleteShift(shiftRef){
  shiftRef.delete().then(function() {
      console.log("Deleted the invalid shift:" +  shiftRef.id);
  }).catch(function(error) {
      console.error("Error removing invalid shift: ", shiftRef.id);
  });
}
