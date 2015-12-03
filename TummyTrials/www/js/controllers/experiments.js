// experiments.js     TummyTrials experiments
//
// (Want to pick a consistent name. The GUI uses "trial" and "study".
// Only this module uses "experiment".)
//

'use strict';

var VIEWKEY = 'start_time';
var TYPEDESC = {
    doctype: { name: 'activity', version: 1 },
    datatype: { name: 'tummytrials_experiment', version: 1 },
    viewkeys: [ VIEWKEY ]
};

function by_time(a, b)
{
    var na = Number(a.time);
    var nb = Number(b.time);

    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
}

(angular.module('tummytrials.experiments',
                [ 'tractdb.tdate', 'tractdb.couchdb' ])

/* The following fields have a known meaning right now:
 *
 *   Activity properties:
 *     name:        Name of activity (string)
 *     start_time:  Start time (sec since 1970, start of first day)
 *     end_time:    Scheduled end time (sec since 1970, end of last day)
 *     status:      One of 'active', 'ended', 'abandoned'
 *     id:          Unique identifier [managed by CouchDB class]
 *
 *   Tummytrials experiment properties:
 *     comment:     Free form comment (string)
 *     symptoms:    Symptoms (array of string)
 *     trigger:     Trigger (string)
 *     remdescrs:   Reminder descriptors (array of object, see reminders.js)
 *     reports:     User reports (array of object, below)
 *     ttransform:  Time transform for accelerated testing (object, below)
 *
 * The id is managed by the CouchDB module, not supplied by callers. In
 * fact it's the CouchDB id of the document.
 *
 * Any other fields supplied by caller are preserved.
 */

/* A report might look something like this:
 *
 * { study_day:             day to which the report applies (number, 1 .. N)
 *   breakfast_compliance:  (bool)
 *   breakfast_report_time: time of breakfast report (number, sec since 1970)
 *   symptom_scores:        (array of { name: string, score: number })
 *   symptom_report_time:   time of symptom report (number, sec since 1970)
 *   comment:               (string)
 * }
 *
 * If breakfast_compliance is absent or null, no breakfast report has
 * been made. (More likely the report object simply won't exist,
 * however.)
 *
 * If symptom_scores is absent, null, or empty, no symptom report has
 * been made. (This will be the usual case between the two report
 * times.)
 *
 * A time transform looks like this:
 *
 * { speedup:  speedup factor for acceleration
 *   offset:   offset from usual timeline
 * }
 *
 * The transform function looks like f(t) = speedup * t + offset. See
 * tdate.js for details.
 *
 * For flexibility, any additional fields supplied by caller are
 * preserved.
 */

/* The publish_p() function returns a promise to set variables in a
 * scope to publish the current state of the user's studies. It's called
 * from controllers to establish a standardized environment to be used
 * in page templates.
 *
 *     study_current     Current study (object, as above; null if none)
 *     study_previous    Previous studies (array of object)
 */

.factory('Experiments', function($q, TDate, CouchDB) {
    var db = new CouchDB("tractdb", [ TYPEDESC ]);

    function const_p(k)
    {
        // Return a promise that resolves to k.
        //
        var def = $q.defer();
        def.resolve(k);
        return def.promise;
    }

    function study_day(exper, date) {
        // Return the day of the study on the given date: 1, 2, 3,
        // ... N. The result can be 0 or negative if the date falls
        // before the beginning of the study.
        //
        // Recall that exper.start_time is an epoch time, 00:00:00 on
        // the first day of the study.
        //
        var date0 =
            new TDate(date.getFullYear(), date.getMonth(), date.getDate());
        var d0ep = Math.trunc(date0.getTime() / 1000);
        return 1 + Math.round((d0ep - exper.start_time) / 86400);
    }

    function get_all_p()
    {
        return db.get_all_p(TYPEDESC, VIEWKEY, { descending: true });
    }

    function current_ix(expers)
    {
        // Return index of current experiment, -1 if there isn't one.
        // Current experiment is defined as the most recent active
        // experiment. Caller warrants that expers[] is in reverse
        // chronological order of start_time.
        //
        for (var i = 0; i < expers.length; i++)
            if (expers[i].status == 'active')
                return i;
        return -1;
    }

    function report_tally(exper)
    {
        // Count the number of reports of each type. Note that if there
        // was no compliance at breakfast there's no need for symptom
        // entry. We handle this by treating the symptomEntry report as
        // present for such a day.
        //
        var tally = { breakfast: 0, symptomEntry: 0};

        if (!exper.reports)
            return tally;

        exper.reports.forEach(function(r) {
            if (    r.breakfast_compliance === true ||
                    r.breakfast_compliance === false)
                tally.breakfast++;
            if (    r.breakfast_compliance === false ||
                    (Array.isArray(r.symptom_scores) &&
                     r.symptom_scores.length > 0))
                tally.symptomEntry++;
        });

        return tally;
    }

    return {
        // Useful computations relating to experiments.
        //
        study_day: study_day,

        study_day_today: function(exper) {
            return study_day(exper, new TDate());
        },

        study_duration: function(exper) {
            // Return duration of study in days.
            //
            return Math.round((exper.end_time - exper.start_time) / 86400);
        },

        report_made: function(rep, repty) {
            // Return true if a report of the given type was made in the
            // given report.
            //
            if (!rep)
                return false;
            switch(repty) {
                case 'breakfast':
                    return rep.breakfast_compliance === false ||
                           rep.breakfast_compliance === true;
                case 'symptomEntry':
                    return rep.breakfast_compliance === false ||
                           (Array.isArray(rep.symptom_scores) &&
                            rep.symptom_scores.length > 0);
            }
            return false;
        },

        // Useful services for controllers.
        //
        publish_p: function(scope) {
            // Return a promise to publish current experiment
            // information into the given scope. This provides a
            // standard set of variable names for use in page templates.
            // The promise resolves to null.
            //
            // study_current       Current study (object or null)
            // study_previous      Previous studies (array of object)
            //
            return get_all_p()
            .then(function(expers) {
                // (We want reminders to be listed in chronological
                // order in the UI.)
                //
                expers.forEach(function(exper) {
                    if (!exper.remdescrs)
                        return;
                    exper.remdescrs.sort(by_time);
                });

                // Separate out current study (if any) from previous
                // studies.
                //
                var cix = current_ix(expers);
                if (cix < 0) {
                    scope.study_current = null;
                } else {
                    scope.study_current = expers[cix];
                    expers.splice(cix, 1);
                }
                scope.study_previous = expers;

                // If current experiment has time transform, start up
                // the transform. If not, revert to identity transform.
                //
                var curex = scope.study_current;
                if (    curex && 'ttransform' in curex &&
                        !isNaN(curex.ttransform.speedup) &&
                        !isNaN(curex.ttransform.offset)) {
                    console.log('Experiments.publish_p set transform',
                                curex.ttransform.speedup,
                                curex.ttransform.offset);
                    TDate.setTransform(curex.ttransform.speedup,
                                       curex.ttransform.offset);
                } else {
                    TDate.setTransform(1, 0);
                }

                return null;
            });
        },

        // Operations on experiments in DB.
        //
        all: function() {
            // Return a promise for all the experiments.
            //
            return get_all_p();
        },

        get: function(experimentId) {
            // Return a promise for the specified experiment.
            //
            return db.get_p(experimentId);
        },

        getCurrent: function() {
            // Return a promise for the current experiment, the active
            // experiment with the most recent start time. If there is
            // no active experiment, resolve to null.
            //
            return get_all_p()
            .then(function(expers) {
                var ix = current_ix(expers);
                if (ix >= 0)
                    return expers[ix];
                return null;
            });
        },

        report_tally: function(experiment) {
            // Tally the reports of the given experiment. Return a hash
            // with keys 'breakfast' and 'symptomEntry'. Values are the
            // number of reports of the type.
            //
            return report_tally(experiment);
        },

        add: function(experiment) {
            // Return a promise to add the specified experiment. The
            // promise resolves to the id of the experiment.
            //
            return db.add_p(TYPEDESC, experiment);
        },

        setStatus: function(experimentId, newStatus) {
            // Return a promise to set the status of the experiment with
            // the given id. newStatus should be 'active', 'ended', or
            // 'abandoned'.
            //
            // The promise resolves to the new status.
            //

            return db.get_p(experimentId)
            .then(function(exper) {
                exper.status = newStatus;
                return db.put_p(experimentId, exper);
            })
            .then(function(_) {
                return newStatus;
            });
        },

        getRemdescrs: function(experimentId) {
            // Return a promise for the current reminder descriptors of
            // the experiment. See reminders.js for a definition of a
            // reminder descriptor.
            //

            return db.get_p(experimentId)
            .then(function(exper) {
                return exper.remdescrs || [];
            });
        },

        setRemdescrs: function(experimentId, newRemdescrs) {
            // Return a promise to set the reminder descriptors of the
            // experiment with the given id. See reminders.js for a
            // definition of reminder descriptors.
            //
            // The promise resolves to the new reminder descriptors.
            //
            return db.get_p(experimentId)
            .then(function(exper) {
                exper.remdescrs = newRemdescrs;
                return db.put_p(experimentId, exper);
            })
            .then(function(_) {
                return newRemdescrs;
            });
        },

        get_reports_p: function(experimentId) {
            // Return a promise for an array of all the reports of the
            // given experiment. If there are no reports, the promise
            // resolves to a 0-length array.
            //
            // Reports are identified by day numbers, starting at 1.
            // The report for day n is at index (n - 1) in the returned
            // array. Note that the returned array will contain null
            // elements if reports have been skipped.
            //
            return db.get_p(experimentId)
            .then(function(exper) {
                if (!Array.isArray(exper.reports))
                    return [];
                return exper.reports;
            });
        },

        get_report_p: function(experimentId, studyDay) {
            // Return a promise for the given report of the given
            // experiment. There is one report for each day of the
            // study. An individual report is identified by its day
            // number (beginning with 1).
            //
            // If there is no such report, the promise resolves to null.
            //
            if (    typeof studyDay != 'number' ||
                    studyDay % 1 != 0 ||
                    studyDay < 1)
                return const_p(null); // Invalid study day
            return db.get_p(experimentId)
            .then(function(exper) {
                if (!Array.isArray(exper.reports))
                    return null;
                return exper.reports[studyDay - 1] || null;
            });
        },

        put_report_p: function(experimentId, report) {
            // Return a promise to store the given report in the given
            // experiment. It replaces any existing report for the same
            // study day. The promise resolves to null.
            //

            // We insist on a valid study day, a positive integer.
            //
            if (    typeof report.study_day != 'number' ||
                    report.study_day % 1 != 0 ||
                    report.study_day < 1) {
                var def = $q.defer();
                var err =
                    new Error("Experiments.put_report_p: invalid study_day");
                def.reject(err);
                return def.promise;
            }

            return db.get_p(experimentId)
            .then(function(exper) {
                if (!Array.isArray(exper.reports))
                    exper.reports = [];
                exper.reports[report.study_day - 1] = report;
                return db.put_p(experimentId, exper);
            });
        },

        set_ttransform_p: function(experimentId, speedup, offset) {
            // Return a promise to set the time transform of the
            // experiment to the given values. (This is for testing and
            // demonstration; real experiments will not be transformed.)
            // The promise resolves to null.
            //
            return db.get_p(experimentId)
            .then(function(exper) {
                exper.ttransform = { speedup: speedup, offset: offset };
                return db.put_p(experimentId, exper);
            });
        },

        delete: function(experimentId) {
            // Return a promise to delete the experiment with the given
            // id. The promise resolves to null.
            //
            return db.delete_p(experimentId);
        },

        valid_p: function(unpw) {
            // Return a promise to validate the given username and
            // password against the remote (central) DB. The promise
            // resolves to true if the credentials are valid, false if
            // not. The promise fails if validation can't be completed,
            // which is reasonably likely for a mobile app.
            //
            return db.valid_p(unpw);
        },

        replicate: function(unpw) {
            // Return a promise to start a bidirectional replication
            // process.
            //
            return db.replicate_p(unpw);
        },

        replicating: function() {
            // Return true if replication is in progress, false
            // otherwise.
            //
            return db.replicating();
        },

        // Secret values used in testing.
        //
        _test_docversion: 1,
        _test_doctype: TYPEDESC.doctype,
        _test_datatype: TYPEDESC.datatype
    };
})
);
