'use strict';

const TimeSheet = require('./TimeSheet');


exports.clockIn = function(request, response, admin) {
    var conId = request.body.conId
    var location = request.body.location
    var firestore = admin.firestore();
    const start = admin.firestore.FieldValue.serverTimestamp()

    var shiftsRef = dbRef.collection("users/" + conId + "/shift")
    TimSheet.clockIn(shiftsRef,start,location,function(success, shiftOrOpenShifts){
      if(success){
        response.status(200).end(JSON.stringify(shiftOrOpenShifts))
      }else{
        response.status(201).end(JSON.stringify(shiftOrOpenShifts))
      }
    })
};
