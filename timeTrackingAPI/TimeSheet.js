'use strict';

exports.clockIn = function(shiftsRef,startTime,location,callBack){
  checkForOpenShifts(shiftsRef,conId,function(openShiftIDs){
    if (openShiftIDs.length == 0){
      shiftsRef.add({
          startTime: startTime,
          endTime:null,
          startLocation: location
      }).then(newShiftRef =>  {
          newShiftRef.get()
            .then(newShiftSnap => {
                if (!newShiftSnap.exists) {
                    console.log('Create New Shift Failed');
                    callBack(false, "Unable to Create Shift in database")
                } else {
                  console.log("New Shift Created:", newShiftRef.id)
                  callBack(true, {[newShiftRef.id]:newShiftSnap.data()})
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
      });
    }else{
      console.log("Error clocking in [OpenShifts]:", openShiftIDs)
      callBack(false, openShiftIDs)
    }
  });
}

//returns a collection of openshift if there are any
exports.checkForOpenShifts = function(shiftsRef,callBack) {
  var openShiftIDs = []
  shiftsRef.where('endTime', '==', null).get()
    .then(snapshot => {
      snapshot.forEach(function (openShift) {
        openShiftIDs.push(openShift.id);
      })
      console.log("Open Shifts:", openShiftIDs)
      callBack(openShiftIDs)
    })
    .catch(err => {
      console.log('Error getting openshifts', err);
      callBack(openShiftIDs)
    });
}
//calculates duration for
function updateShiftDuration(){

}
