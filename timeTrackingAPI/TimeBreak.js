'use strict';


/**
 * returns a collection of openshift if there are anys
 * endTime must be null to show up, when time sheeet is inserted
 */


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
  console.log("updating break duration:" +  breakRef.id);
}

function deleteBreak(breakRef){
  breakRef.delete().then(function() {
      console.log("Deleted the invalid break:" +  breakRef.id);
  }).catch(function(error) {
      console.error("Error removing invalid break: ", breakRef.id);
  });
}
