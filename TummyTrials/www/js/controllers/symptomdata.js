// symptomdata.js     Shared data for symptom logging
//
// This absurdly simple service returns a single object to be shared
// among the screens for logging symptom severity.
//
// Currently the object has just one property, severity. It acts as a
// hash mapping from symptom names to severity levels.
//

'use strict';

(angular.module('tummytrials.symptomdata', [])
    .factory('SymptomData', function() {
        return { severity: {} };
    })
);
