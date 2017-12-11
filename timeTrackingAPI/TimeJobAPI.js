'use strict';

exports.clockIn = function(request, response, admin) {
    var conId = request.body.conId
    var location = request.body.location
    var firestore = admin.firestore();
    const start = admin.firestore.FieldValue.serverTimestamp()
    var jobsRef = dbRef.collection("users/" + conId + "/shifts/" + shiftID + "/jobs")
    TimSheet.clockIn(jobsRef,start,location,function(success, jobOrOpenJobs){
      if(success){
        response.status(200).end(JSON.stringify(jobOrOpenJobs))
      }else{
        response.status(201).end(JSON.stringify(jobOrOpenJobs))
      }
    })
};
