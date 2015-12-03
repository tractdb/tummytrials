// reminders.js     Schedule reminders and keep icon badge up to date
//
// Assumptions: there are some small number of reminders per day, of
// different types. Some types are just "pure" reminders that display a
// notification at a certain time. Other types are asking the user to
// make a report, where the report is given the same type as the
// reminder. Each type of reminder happens at a different time of day,
// but at the same time every day.
//
// This code manages local notifications and the badge on the app icon.
// The badge shows the number of reports that are due, even when the app
// isn't running.
//
// For things to work, you have to call sync() any time there is new
// information about reminders or reports. Examples of such times:
//
//     App startup
//     User creates a study
//     User submits a report
//     User sets new reminder times
//     After a replication
//
// For testing you can call accelerate() to establish a fictional
// timeline that elapses faster than real time. (Not yet implemented.)
//
// You can call list() to get a list of current reminders, though this
// is also intended for testing.
//
// Note 1: $cordovaLocalNotification supports two types of
// notifications, one-shot and repeating. We use only one-shot
// notifications. Repeating notifications are too inflexible for what we
// want to do--only a few predefined repeat intervals are allowed.
//
// Note 2: If reports are due that haven't been filed, we want to
// schedule reminders for the past. The idea is to get them posted in
// the iOS Notification Center. Unfortunately, there are bugs and
// inconsistencies in the way they're handled (probably the bug is in
// $cordovaLocalNotification). So currently we schedule at most one such
// reminder (the most recently triggered one).
//

'use strict';

(angular.module('tractdb.reminders', [ 'tractdb.tdate', 'ngCordova' ])

.factory('Reminders', function($ionicPlatform, $rootScope, $q,
                                $cordovaLocalNotification, $cordovaBadge,
                                TDate) {
    var g_nextid = 1;       // Next notification id to use
    var c_remstate;         // Cached reminder state for internal use
    var c_report_cts;       // Cached report counts for internal use
    var g_notifs_seen = {}; // (See reminder_triggered.)

    function by_at(a, b)
    {
        if (a.at < b.at) return -1;
        if (a.at > b.at) return 1;
        return 0;
    }

    function sec_after_midnight()
    {
        // How many seconds after midnight is it right now?
        //
        var now = new TDate();
        return (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    }
    
    function study_duration(remstate)
    {
        // Return the duration (in days) of the study.
        //
        var d = remstate.end_time - remstate.start_time;
        return Math.round(d / (60 * 60 * 24));
    }

    function study_day(remstate, date)
    {
        // Return the day of the study on the given date: 1, 2, 3, ... N
        //
        // Note that the result can be <= 0 if the date is before the
        // study, and can be > N if the study is concluded before the
        // given date.
        //
        // Also recall that remstate.start_time is an Epoch time,
        // 00:00:00 on the first day of the study.
        //
        var date0 =
            new TDate(date.getFullYear(), date.getMonth(), date.getDate());
        var d0ep = Math.trunc(date0.getTime() / 1000);
        return 1 + Math.round((d0ep - remstate.start_time) / 86400);
    }

    function study_day_today(remstate)
    {
        return study_day(remstate, new TDate());
    }

    function reminder_time(start, n, time)
    {
        // Return a reminder time as a Date object. Unlike all other
        // dates in this module, the Date object represents the "real"
        // time even if the study is accelerated.
        //
        // start: start of experiment (Epoch value, midnight of day 1)
        // n:     day of study (1, ...)
        // time:  time of reminder (seconds after midnight)
        //
        var startTime = new TDate(start * 1000);
        var h = Math.trunc(time / 3600);
        var m = Math.trunc((time % 3600) / 60);
        var s = Math.trunc(time % 60);
        var res = new TDate(startTime.getFullYear(), startTime.getMonth(),
                        startTime.getDate() + n - 1, // TDate will normalize
                        h, m, s);
        return res.inverse(); // (Inverse transform to "real" time.)
    }

    function notifications_now_p()
    {
        // Return a promise for the notifications that exist now. The
        // promise resolves to an array of local notifications with a
        // 'state' property that is either 'scheduled' or 'triggered'.
        //
        var res = [];

        return $cordovaLocalNotification.getAllScheduled()
        .then(function(notifs) {
            notifs.forEach(function(notif) {
                notif.state = 'scheduled';
                res.push(notif);
            });
            return $cordovaLocalNotification.getAllTriggered();
        })
        .then(function(notifs) {
            notifs.forEach(function(notif) {
                notif.state = 'triggered';
                res.push(notif);
            });
            return res;
        });
    }

    function notifications_new(remstate, descr_by_type, report_cts, app_badge)
    {
        // Return an array of notifications that follow from the given
        // new status:
        //
        // remstate:    Reminder state
        // report_cts:  Number of reports for each type
        // app_badge:   App's correct badge count now
        //
        var sday = study_day_today(remstate);
        var daysec = sec_after_midnight();

        // Duration of study in days.
        //
        var dur = study_duration(remstate);

        var notifs = [];
        remstate.descs.forEach(function(desc) {
            // Study day of next reminder of this type
            var nnext;
            if (sday <= 0)
                nnext = 1; // Study hasn't started yet
            else
                nnext = Math.min(dur + 1, sday + (daysec >= desc.time ? 1 : 0));

            // Head for day n
            function headn(n) {
                return desc.heads[Math.min(n, desc.heads.length) - 1];
            }
            // Body for day n
            function bodyn(n) {
                return desc.bodies[Math.min(n, desc.bodies.length) - 1];
            }
            // Notification for day n
            function notifn(n) {
                var notif = {};
                notif.title = headn(n);
                notif.text = bodyn(n);
                notif.at = reminder_time(remstate.start_time, n, desc.time);
                notif.data = desc.type;
                // Mark past times with negative ids.
                //
                notif.id = n < nnext ? -1 : 1;
                return notif;
            }

            if (desc.reminderonly) {
                for (var n = nnext; n <= dur; n++)
                    notifs.push(notifn(n));
            } else {
                // Notifications for past reminders with no reports yet.
                //
                var repct = report_cts[desc.type];
                var n;
                for (n = repct + 1; n < nnext; n++)
                    notifs.push(notifn(n));

                // (No reminders for reports submitted early.)
                //
                n = Math.max(nnext, repct + 1);

                for (; n <= dur; n++)
                    notifs.push(notifn(n));
            }
        });

        notifs.sort(by_at);

        // Assign ids and badge counts to notifications.
        //
        // Note that we use negative ids to mark notifications that are
        // for overdue reports. They will trigger immediately, but their
        // trigger event isn't interesting.
        //
        var notibadge = app_badge;
        notifs.forEach(function(notif) {
            notif.id *= g_nextid++;
            var descr = descr_by_type[notif.data];
            if (notif.id >= 0 && descr && !descr.reminderonly)
                notibadge++;
            notif.badge = notibadge;
        });

        // Seemingly $cordovaLocalNotification has a bug whereby
        // triggered reminders are rescheduled every time any new
        // reminder is scheduled. This causes notifications for N
        // overdue reports to pile up as (2^N-1) into a giant mess in
        // the Notification Center. But since (2^1-1) = 1, we can at
        // least keep the most recent one as long as we schedule it
        // last.
        //
        while (notifs.length > 1 && notifs[1].id < 0)
            notifs.splice(0, 1);
        if (notifs.length > 0 && notifs[0].id < 0) {
            var t = notifs.splice(0, 1);
            notifs.push(t[0]);
        }

        return notifs;
    }


    function reminder_triggered(event, notif, state)
    {
        // Handle $cordovaLocalNotification:trigger event: i.e., an
        // event was triggered while the app is active. May need to
        // recalculate badge numbers and text.
        //

        // A reminder triggered inside schedule() carries no new info,
        // so nothing to do.
        //
        if (notif.id < 0)
            return;

        // Reminders sometimes seem to be triggred more than once. For
        // extra safety, keep a record and handle them only one time.
        //
        if (notif.id in g_notifs_seen) {
            g_notifs_seen[notif.id]++; // For grins, count repeats
            return;
        }
        g_notifs_seen[notif.id] = 1;

        // Otherwise recalculate based on our latest info.
        //
        if (c_remstate && c_report_cts)
            sync_p(c_remstate, c_report_cts);
    }

    function schedule_p(notifs, i)
    {
        // Schedule given notifications one at a time.
        // Note: currently unused.
        //
        if (i >= notifs.length) {
            var def = $q.defer();
            def.resolve(null);
            return def.promise;
        }
        return $cordovaLocalNotification.schedule(notifs[i])
        .then(function(_) {
            return schedule_p(notifs, i + 1);
        });
    }

    function sync_p(remstate, report_cts)
    {
        // Return a promise to update notifications and badge count
        // according to the reminder state and the reports user has
        // filed. The promise resolves to null.
        //
        var dur = study_duration(remstate);
        var sday = study_day_today(remstate);
        var daysec;

        if (sday > dur) {
            // If it's after the end of the study, pretend it's very
            // late on the last day.
            //
            sday = dur;
            daysec = 60 * 60 * 24;
        } else {
            daysec = sec_after_midnight();
        }

        // Access reminder descriptors by type.
        //
        var descr_by_type = {};
        remstate.descs.forEach(function(desc) {
            descr_by_type[desc.type] = desc;
        });

        // Make sure report_cts has an entry for every reminder type.
        //
        remstate.descs.forEach(function(desc) {
            if (! (desc.type in report_cts))
                report_cts[desc.type] = 0;
        });

        // Figure out what the badge count should be for the app.
        //
        var app_badge = 0;
        remstate.descs.forEach(function(desc) {
            if (desc.reminderonly)
                return;
            var due = sday - (daysec >= desc.time ? 0 : 1);
            app_badge += Math.max(0, due - report_cts[desc.type]);
        });


        // Remove all old notifications, schedule new ones, set app
        // badge.
        //
        return $cordovaLocalNotification.cancelAll()
        .then(function(_) {
            var notifsn =
                notifications_new(remstate, descr_by_type, report_cts,
                                    app_badge);
            return $cordovaLocalNotification.schedule(notifsn);
        })
        .then(function(_) { return $cordovaBadge.set(app_badge); })
        .then(function(_) { return null; });
    }

    // Subscribe to 'trigger' events.
    //
    $rootScope.$on('$cordovaLocalNotification:trigger', reminder_triggered);

    return {
        sync: function(descs, start_time, end_time, report_cts) {
            // Return a promise to schedule the reminders for a study.
            // The promise resolves to null.
            //
            // descs       Descriptor of the reminders (below)
            // start_time  Start time (Epoch time, midnight 00:00:00 first day)
            // end_time    End time (Epoch time, midnight 23:59:59+1 last day)
            // report_cts  Counts of reports made by user
            //
            // descs is an array of descriptors that look like this:
            //
            // {
            //     type: type of reminder
            //     reminderonly: no report, just reminder (default false)
            //     time: time of reminder (number; seconds after midnight)
            //     heads: heading of reminder (array)
            //     bodies: body of reminder (array)
            // }
            //
            // The 'type' field of a descriptor gives the type of the
            // reminder, in essence a unique name. Example: 'morning'.
            //
            // The 'reminderonly' field, if present, is a boolean saying
            // whether this is a "pure" reminder with no associated
            // report. The default is a "reportable" reminder (false
            // value for the field).
            //
            // For a pure reminder the associated notifications are
            // created by this module and removed by the user.
            // Notifications for reportable reminders are removed by
            // this module when the report is made. (To make this work,
            // you must call sync() when reports are made.)
            //
            // The 'heads' and 'bodies' fields are arrays of text that
            // should be issued to the user as part of the reminder. If
            // the arrays have length 1, the same value is used for
            // every reminder. Otherwise the array length should be the
            // same as the study duration, giving a value for each day
            // of the study.
            //
            // 'report_cts' is a hash giving the number of reports of
            // each type that have been made. I.e., the keys are
            // reportable reminder types and the values are report
            // counts.
            //
            c_remstate = {};
            c_remstate.descs = angular.copy(descs);
            c_remstate.start_time = start_time;
            c_remstate.end_time = end_time;
            c_report_cts = angular.copy(report_cts);

            return sync_p(c_remstate, c_report_cts);
        },

        clear: function() {
            // Return a promise to remove all reminders. The promise
            // resolves to null.
            //
            return $cordovaLocalNotification.cancelAll()
            .then(function(_) { return null });
        },

        list: function() {
            // Return a promise to list all the local notifications. The
            // promise resolves to an array of notifications in the form
            // returned by $cordovaLocalNotification, with an added
            // 'state' field that is either 'triggered' (notification
            // has been delivered at least once) or 'scheduled'
            // (notification has never been delivered).
            //
            // The array is ordered chronologically by delivery time.
            //
            return notifications_now_p()
            .then(function(notifs) {
                notifs.sort(by_at);
                return notifs;
            });
        }
    };
})
);
