// experiments.js     TummyTrials experiments
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

(angular.module('tummytrials.experiments', ['tractdb.couchdb'])

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
 *
 * The id is managed by the CouchDB module, not supplied by callers. In
 * fact it's the CouchDB id of the document.
 *
 * Any other fields supplied by caller are preserved.
 */

/* A report might look something like this:
 *
 * { type:           Report type [coordinates with reminders]
 *   time:           Time of report (sec since 1970)
 *   adherence:      Adhered to the experiment today (bool)
 *   symptom_scores: (array of { name: string, score: number })
 *   notes:          string
 * }
 *
 * But any fields supplied by caller are preserved. The 'type' field is
 * also used to coordinate reports with reminders (see reminders.js).
 */

/* The publish_p() function returns a promise to set variables in a
 * scope to publish the current state of the user's studies. It's called
 * from controllers to establish a standardized environment to be used
 * in page templates.
 *
 *     study_current      Current study (object, as above; null if none)
 *     study_previous     Previous studies (array of object)
 */

.factory('Experiments', function($q, CouchDB) {
    var db = new CouchDB("tractdb", [ TYPEDESC ]);

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

    return {
        publish_p: function(scope) {
            // Return a promise to publish current experiment
            // information into the given scope. This provides a
            // standard set of variable names for use in page templates.
            // The promise resolves to null.
            //
            // study_current       Current study (object)
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

                return null;
            });
        },

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
            // the experiment. See reminder.js for a definition of a
            // reminder descriptor.
            //

            return db.get_p(experimentId)
            .then(function(exper) {
                return exper.remdescrs || [];
            });
        },

        setRemdescrs: function(experimentId, newRemdescrs) {
            // Return a promise to set the reminder descriptors of the
            // experiment with the given id. See reminder.js for a
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

        addReport: function(experimentId, report) {
            // Return a promise to add a report to the experiment with
            // the given id.
            //
            // The promise resolves to the updated number of reports.
            //
            var newct;

            return db.get_p(experimentId)
            .then(function(exper) {
                if (!Array.isArray(exper.reports))
                    // Ill formed experiment, not completely impossible.
                    exper.reports = [];
                newct = exper.reports.push(report);
                return db.put_p(experimentId, exper);
            })
            .then(function(_) {
                return newct;;
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
