'use strict';

exports.clockIn = function(request, response, admin) {
    var conId = request.body.conId
    var location = request.body.location
    var firestore = admin.firestore();

    const start = admin.firestore.FieldValue.serverTimestamp()
    clockIn(firestore,conId,start,location,function(success, sheetOrOpenShift){
      if(success){
        response.status(200).end(JSON.stringify(sheetOrOpenShift))
      }else{
        response.status(201).end(JSON.stringify(sheetOrOpenShift))
      }
    })
};


function clockIn(dbRef,conId,startTime,location,callBack){
  checkForOpenShifts(dbRef,conId,function(openShiftIDs){
    if (openShiftIDs.length == 0){
      dbRef.collection("users/" + conId + "/shift").add({
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
var checkForOpenShifts = function( dbRef, conId,callBack) {
  var shiftsRef = dbRef.collection("users/" + conId + "/shift")
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
