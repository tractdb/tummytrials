// studyfmt.js     Human-readable properties of a study
//
// (The idea is that these functions might be useful in more than one
// controller.)
//

'use strict';

(angular.module('tummytrials.studyfmt',
                [ 'tummytrials.lc', 'tummytrials.text' ])

.factory('StudyFmt', function(LC, Text) {

    // Constructor (private). Callers should use new_p().
    //
    function StudyFmt(study)
    {
        this.study = study;
    }


    StudyFmt.prototype = {};

    // Public class method.
    //
    StudyFmt.new_p = function(study) {
        // Return a promise for a new study formatter.
        //
        return Text.all_p()
        .then(function(text) {
            var studyfmt = new StudyFmt(study);
            studyfmt.text = text;
            return studyfmt;
        });
    }

    // Public instance methods.
    //
    StudyFmt.prototype.topicQuestion = function() {
        // Return the question being studied, or null if there isn't
        // one. Example: "Does drinking caffeine affect my symptoms?"
        //
        if (!this.study.trigger)
            return null;
        var lowtrigger = this.study.trigger.toLowerCase();
        return this.text.setup5.topic.replace('{TRIGGER}', lowtrigger);
    }

    StudyFmt.prototype.dateRange = function() {
        var sd = new Date(this.study.start_time * 1000);
        // (Last day of study, not first day after study.)
        var ed = new Date((this.study.end_time - 8 * 60 * 60) * 1000);
        return LC.datestr(sd) + ' — ' + LC.datestr(ed);
    }

    StudyFmt.prototype.reminderTimes = function() {
        var res = {};

        if (this.study.remdescrs)
            this.study.remdescrs.forEach(function(remdescr) {
                res[remdescr.type] = LC.timestr(remdescr.time);
            });
        return res;
    }

    return StudyFmt;
})
)
