// experiments.js     Experiments as Couchbase Lite documents
//

'use strict';

var VIEWKEY = 'start_time';
var TYPEDESC = {
    doctype: { name: 'activity', version: 1 },
    datatype: { name: 'tummytrials_experiment', version: 1 },
    viewkeys: [ VIEWKEY ]
};

(angular.module('tummytrials.experiments', ['tractdb.couchdb'])

/* The following fields have a known meaning right now:
 *
 *   Activity properties:
 *     name:        Name of activity (string)
 *     start_time:  Start time (sec since 1970, start of first day)
 *     end_time:    Scheduled end time (sec since 1970, end of last day)
 *     status:      One of 'active', 'ended', 'abandoned'
 *     id:          Unique identifier 
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
 * {
 * type:           Report type
 * time:           Time of report (sec since 1970)
 * adherence:      Adhered to the experiment today (bool)
 * symptom_scores: (array of { name: string, score: number })
 * notes:          string
 * }
 *
 * But any fields supplied by caller are preserved. The 'type' field is
 * also used to coordinate reports with reminders (see reminders.js).
 */

.factory('Experiments', function($q, CouchDB) {
    var db = new CouchDB("tractdb", [ TYPEDESC ]);

    function get_all_p()
    {
        return db.get_all_p(TYPEDESC, VIEWKEY, { descending: true });
    }

    return {
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
                for (var i = 0; i < expers.length; i++)
                    if (expers[i].status == 'active')
                        return expers[i];
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
