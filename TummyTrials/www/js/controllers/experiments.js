// experiments.js     TummyTrials experiments
//
// (Should eventually converge on a consistent name. The GUI uses
// "trial" and "study". This module uses "experiment" but is trying to
// to migrate to "study".)
//

'use strict';

var STUDY_VIEWKEY = 'start_time';
var STUDY_TYPEDESC = {
    doctype: { name: 'activity', version: 1 },
    datatype: { name: 'tummytrials_experiment', version: 1 },
    viewkeys: [ STUDY_VIEWKEY ]
};

var LOG_VIEWKEY = 'start_time';
var LOG_TYPEDESC = {
    doctype: { name: 'log', version: 1 },
    datatype: { name: 'tummytrials_log', version: 1 },
    viewkeys: [ LOG_VIEWKEY ]
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

/* The following study fields have a known meaning right now:
 *
 *   Activity properties:
 *     name:         Name of activity (string)
 *     start_time:   Start time (sec since 1970, start of first day)
 *     end_time:     Scheduled end time (sec since 1970, end of last day)
 *     status:       One of 'active', 'ended', 'abandoned'
 *     id:           Unique identifier [managed by CouchDB class]
 *
 *   Tummytrials experiment properties:
 *     abstring:     String of As & Bs, one for each test day (more below)
 *     symptoms:     Symptoms (array of string)
 *     trigger:      Trigger (string)
 *     remdescrs:    Reminder descriptors (array of object, see reminders.js)
 *     reports:      User reports (array of object, below)
 *     reason:       Reason for abandonment
 *     comment:      Free form comment
 *     ttransform:   Time transform for accelerated testing (object, below)
 *
 * The id is managed by the CouchDB module, not supplied by callers. In
 * fact it's the CouchDB id of the document.
 *
 * Any other fields supplied by caller are preserved.
 */

/* The abstring shows which for which days the trigger is to be present
 * (the 'A' days) and absent (the 'B' days). For example, A days might
 * be days when caffeine is consumed at breakfast and B days when
 * caffeine is not consumed.
 */

/* A report currently looks like this:
 *
 * { study_day:             day to which the report applies (number, 1 .. N)
 *   morning_reminded:      (bool) responded to morning reminder (opened app)
 *   morning_reminded_time: morning reminder response time (sec since 1970)
 *   breakfast_compliance:  (bool)
 *   breakfast_report_time: time of breakfast report (number, sec since 1970)
 *   breakfast_history:     array of former breakfast reports (see below)
 *   lunch_compliance:      (bool)
 *   lunch_report_time:     time of lunch report (number, sec since 1970)
 *   lunch_history:         array of former lunch reports (see below)
 *   symptom_scores:        (array of { name: string, score: number })
 *   symptom_report_time:   time of symptom report (number, sec since 1970)
 *   symptom_history:       array of former symptom reports (see below)
 *   note:                  (string)
 *   note_time:             time of note (number, sec since 1970)
 *   note_history:          array of former note reports (see below)
 *   comment:               (string)
 * }
 *
 * If breakfast_compliance is absent or null, no breakfast report has
 * been made. (More likely the report object simply won't exist,
 * however.)
 *
 * If lunch_compliance is absent or null, no lunch report has
 * been made.
 *
 * If symptom_scores is absent, null, or empty, no symptom report has
 * been made.
 *
 * If note is absent or null, no note has been made.
 *
 * The user is allowed to change their breakfast, lunch, symptom, and
 * note reports throughout the day until a cutoff time in the evening.
 * Old reports are retained for analysis.
 *
 * breakfast_history is an array of previous breakfast reports for the
 * day. Each entry in the array looks like this:
 *
 * { report_time: (sec since 1970),
 *   compliance: bool
 * }
 *
 * lunch_history is an array of previous lunch reports for the day. Each
 * entry in the array looks like this:
 *
 * { report_time: (sec since 1970),
 *   compliance: bool
 * }
 *
 * symptom_history is an array of previous symptom reports for the day.
 * Each entry in the array looks like this:
 *
 * { report_time: (sec since 1970),
 *   scores: (array of { name: string, score: number })
 * }
 *
 * note_history is an array of previous notes for the
 * day. Each entry in the array looks like this:
 *
 * { note_time: (sec since 1970),
 *   note: string
 * }
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

/* The following log fields have a known meaning right now.
 *
 *   Log properties:
 *     start_time:   creation time of the log (sec since 1970)
 *     messages:     array of string, the log messages
 *     id:           unique identifier [managed by CouchDB class]
 *
 *   Tummytrials log properties:
 *     (none)
 */

.factory('Experiments', function($q, TDate, CouchDB) {
    var db = new CouchDB("tractdb", [ STUDY_TYPEDESC, LOG_TYPEDESC ]);

    function const_p(k)
    {
        // Return a promise that resolves to k.
        //
        var def = $q.defer();
        def.resolve(k);
        return def.promise;
    }

    function set_transform(curex)
    {
        // The given experiment is the current experiment. If it has a
        // transform, instantiate the transform in TDate. Otherwise
        // revert to the identity transform.
        //
        if (curex && 'ttransform' in curex &&
            !isNaN(curex.ttransform.speedup) &&
            !isNaN(curex.ttransform.offset)) {
            console.log('Experiments.set_transform',
                        curex.ttransform.speedup, curex.ttransform.offset);
            TDate.setTransform(curex.ttransform.speedup,
                                curex.ttransform.offset);
        } else {
            TDate.setTransform(1, 0);
        }
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

    function study_duration(exper) {
        // Return duration of the study in days.
        //
        return Math.round((exper.end_time - exper.start_time) / 86400);
    }

    function sec_after_midnight()
    {
        // How many seconds after midnight is it right now?
        //
        var now = new TDate();
        return (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    }

    function get_all_p()
    {
        return db.get_all_p(STUDY_TYPEDESC, STUDY_VIEWKEY,
                            { descending: true });
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

    function report_made(rep, repty)
    {
        // rep contains the reports for one day. Return true if a report
        // of type repty is present.
        //
        if (!rep)
            return false;
        switch(repty) {
            case 'morning':
                return !!rep.morning_reminded;
            case 'breakfast':
                return rep.breakfast_compliance === true ||
                        rep.breakfast_compliance === false;
            case 'symptomEntry':
                return (rep.lunch_compliance === true ||
                        rep.lunch_compliance === false) &&
                        Array.isArray(rep.symptom_scores) &&
                        rep.symptom_scores.length > 0;
            case 'evening':
                return report_made(rep, 'morning') &&
                       report_made(rep, 'breakfast') &&
                       report_made(rep, 'symptomEntry');
        }
        return false;
    }


    function publish(scope, studies)
    {
        // Publish current study information into the given scope. This
        // provides a standard set of variable names for use in page
        // templates.
        //
        // study_current       Current study (object or null)
        // study_previous      Previous studies (array of object)
        //
        // Callers must realize that this function modifies the given
        // array of studies.
        //

        // We want reminders to be listed in chronological order in the
        // UI.
        //
        studies.forEach(function(study) {
            if (!study.remdescrs)
                return;
            study.remdescrs.sort(by_time);
        });

        // Separate out current study (if any) from previous studies.
        //
        var cix = current_ix(studies);
        if (cix < 0) {
            scope.study_current = null;
        } else {
            scope.study_current = studies[cix];
            studies.splice(cix, 1);
        }
        scope.study_previous = studies;
    }

    function report_tally(exper)
    {
        // Figure out how many reports have been made of each type as of
        // the current moment. Since reports must be made by the end of
        // the day, this is a simple calculation. Determine whether
        // there's a report for today. If not, use yesterday's study day
        // number. Otherwise use today's study day number.
        //
        var sd = study_day(exper, new TDate());
        var dur = study_duration(exper);

        var yestsd = Math.max(0, sd - 1);
        var morning = yestsd;
        var breakfast = yestsd;
        var symptomEntry = yestsd;
        var evening = yestsd;

        function tally() {
            var res = {
                morning: morning,
                breakfast: breakfast,
                symptomEntry: symptomEntry,
                evening: evening
            };
            return res;
        }

        if (sd <= 0)
            // Study hasn't started yet.
            //
            return tally();
        if (sd > dur) {
            // Study is over. All reports are deemed to have been made.
            //
            morning = dur;
            breakfast = dur;
            symptomEntry = dur;
            evening = dur;
            return tally();
        }

        if (!exper.reports)
            return tally();

        var r = exper.reports[sd - 1];

        if (report_made(r, 'morning'))
            morning = sd;
        if (report_made(r, 'breakfast'))
            breakfast = sd;
        if (report_made(r, 'symptomEntry'))
            symptomEntry = sd;
        if (report_made(r, 'evening'))
            evening = sd;

        return tally();
    }

    function update_history(oldexper, newexper)
    {
        // Maintain history of breakfast compliance and symptom
        // severities.
        //
        var hist;

        if (!oldexper)
            return;

        if (oldexper.breakfast_report_time &&
            newexper.breakfast_report_time != oldexper.breakfast_report_time) {
            hist = {
                report_time: oldexper.breakfast_report_time,
                compliance: oldexper.breakfast_compliance
            };
            if (!newexper.breakfast_history)
                newexper.breakfast_history = [];
            newexper.breakfast_history.push(hist);
        }
        if (oldexper.lunch_report_time &&
            newexper.lunch_report_time != oldexper.lunch_report_time) {
            hist = {
                report_time: oldexper.lunch_report_time,
                compliance: oldexper.lunch_compliance
            };
            if (!newexper.lunch_history)
                newexper.lunch_history = [];
            newexper.lunch_history.push(hist);
        }
        if (oldexper.symptom_report_time &&
            newexper.symptom_report_time != oldexper.symptom_report_time) {
            hist = {
                report_time: oldexper.symptom_report_time,
                scores: angular.copy(oldexper.symptom_scores)
            };
            if (!newexper.symptom_history)
                newexper.symptom_history = [];
            newexper.symptom_history.push(hist);
        }
        if (oldexper.note_time &&
            newexper.note_time != oldexper.note_time) {
            hist = {
                report_time: oldexper.note_time,
                note: oldexper.note
            };
            if (!newexper.note_history)
                newexper.note_history = [];
            newexper.note_history.push(hist);
        }
    }

    function log_getall_p()
    {
        return db.get_all_p(LOG_TYPEDESC, LOG_VIEWKEY, { descending: true });
    }

    function log_getcurrent_p()
    {
        // Return a promise for the current log, which is the first one
        // (in reverse chronological order). If there are no logs, the
        // promise resolves to null.
        //
        return log_getall_p()
        .then(function(logs) {
            if (Array.isArray(logs) && logs.length > 0)
                return logs[0];
            return null;
        });
    }

    function log_add_p()
    {
        // Return a promise to create a new log. The promise resolves to
        // the id of the new log.
        //
        // Note 1: writing a log message (with log_addmsg_p()) creates
        // a log if there is none.
        //
        // Note 2: use Date rather than TDate here because the log
        // exists outside the "accelerated study" facility.
        // 
        var log = {
            start_time: Math.floor(Date.now() / 1000),
            messages: []
        };
        return db.add_p(LOG_TYPEDESC, log);
    }

    return {
        // Useful computations relating to experiments.
        //
        set_transform: set_transform,

        study_day: study_day,

        study_day_today: function(exper) {
            return study_day(exper, new TDate());
        },

        study_duration: study_duration,

        report_new: function(study_day) {
            // Return an empty report for the given study day.
            //
            return { study_day: study_day };
        },

        report_made: report_made, 

        // Useful services for controllers.
        //
        set_study_context(scope, studies) {
            // Set the context for the current set of studies:
            //
            // A. Publish study objects into the given scope under
            //    standard names (for use by page templates).
            //
            // B. If there is a current study, initialize its
            //    accelerated time transform (if any).
            //
            publish(scope, studies);
            set_transform(scope.study_current);
        },

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
            .then(function(studies) {
                publish(scope, studies);
                set_transform(scope.study_current);
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
            return db.add_p(STUDY_TYPEDESC, experiment);
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

        setAbandon_p: function(experimentId, newStatus, newReason) {
            // Return a promise to set the reason for abandonment of the 
            // experiment with the given id. newReason should be a text field.
            //
            // The promise resolves to the new status and reason.
            //

            return db.get_p(experimentId)
            .then(function(exper) {
                exper.reason = newReason;
                exper.status = newStatus;
                return db.put_p(experimentId, exper);
            })
            .then(function(_) {
                return newReason;
            })
            .then(function(__) {
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
                update_history(exper.reports[report.study_day - 1], report);
                exper.reports[report.study_day - 1] = report;
                return db.put_p(experimentId, exper);
            });
        },

//      add_activity_p: function(experimentId, s)
//      {
//          // Add the string to the activity log for the given
//          // experiment.
//          //
//          return db.get_p(experimentId)
//          .then(function(exper) {
//              if (!Array.isArray(exper.activity_log))
//                  exper.activity_log = [];
//              exper.activity_log.push(s);
//              return db.put_p(experimentId, exper);
//          });
//      },

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

        // Operations on logs. These are separate from studies, so that
        // log entries can be made at any time (even when there is no
        // current study).
        //
        // A log is created by log_add_p(), or by the first call to
        // log_addmsg_p() when there is no log.
        //

        log_getall_p: log_getall_p,

        log_get_p: function(logId) {
            // Return a promise for the log with the given id.
            //
            return db.get_p(logId);
        },

        log_getcurrent_p: log_getcurrent_p,

        log_addmsg_p: function(s) {
            // Return a promise to add a message to the current log. If
            // there's no current log, create one first. The promise
            // resolves to null.
            //
            return log_getcurrent_p()
            .then(function(curlog) {
                if (curlog)
                    return curlog;
                return log_add_p()
                .then(function(_) { return log_get_current_p(); });
            })
            .then(function(curlog) {
                curlog.messages.push(s);
                return db.put_p(curlog.id, curlog);
            });
        },

        log_add_p: log_add_p,

        log_delete_p: function(logId) {
            return db.delete_p(logId);
        },

        // Secret values used in testing.
        //
        _test_docversion: 1,
        _test_doctype: STUDY_TYPEDESC.doctype,
        _test_datatype: STUDY_TYPEDESC.datatype
    };
})
);
