// reminders.js     Schedule reminders and keep icon badge up to date
//
// Assumptions
//
//   There are some small number of reminders per day, of different
//   types.
//
//   A reminder can be associated with a badge count. Conceptually this
//   means the reminder is asking the user to do some daily action in
//   the app, and the badge stays on until they do it.
//
//   Each type of reminder happens at a different time of day, but at
//   the same time every day.
//
// This code manages local notifications and the badge on the app icon.
// The badge shows the number of actions that are due, even when the app
// isn't running.
//
// There is really just one function in the interface, sync(), which
// must be called any time there is new information about reminders or
// actions. Examples of such times:
//
//     App startup/resumption
//     User creates a study
//     User performs an action (e.g., reports breakfast compliance)
//     User sets new reminder times
//     After a replication
//
// You can call clear() to remove all reminders, and list() to get a
// list of current reminders. These are intended for internal testing.
//
// Note 1: $cordovaLocalNotification supports two types of
// notifications, one-shot and repeating. We use only one-shot
// notifications. Repeating notifications are too inflexible for what we
// want to do--only a few predefined repeat intervals are allowed.
//
// Note 2: If actions are due that haven't been performed, we want to
// schedule reminders for the past. The idea is to get them posted in
// the iOS Notification Center. Unfortunately, there are bugs and
// inconsistencies in the way they're handled (probably the bug is in
// $cordovaLocalNotification). So currently we schedule at most one such
// reminder (the most recently triggered one).
//
// Note 3: It's debatable whether scheduling reminders in the past is
// worth the hassle and complexity. I think the badge is a sufficient
// motivator.
//

'use strict';

(angular.module('tractdb.reminders', [ 'tractdb.tdate', 'ngCordova' ])

.factory('Reminders', function($ionicPlatform, $rootScope, $q,
                                $cordovaLocalNotification, $cordovaBadge,
                                TDate) {
    var g_nextid = 1;       // Next notification id to use
    var c_remstate;         // Cached reminder state for internal use
    var c_action_cts;       // Cached action counts for internal use
    var g_notifs_seen = {}; // (See reminder_triggered.)

    function by_at(a, b)
    {
        // Compare two notifications by their "at" fields.
        //
        if (a.at < b.at) return -1;
        if (a.at > b.at) return 1;
        return 0;
    }

    function by_time(a, b)
    {
        // Compare two reminder descriptors by their "time" fields.
        //
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
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
            // If the data field isn't a string, it's encoded as JSON.
            // We'd rather see the underlying value, so decode it.
            //
            res.forEach(function(notif) {
                try {
                    var ob = JSON.parse(notif.data);
                    notif.data = ob;
                }
                finally {
                }
            });
            return res;
        });
    }

    function notifications_new(remstate, descr_by_type, action_cts, app_badge)
    {
        // Return an array of notifications that follow from the given
        // new status:
        //
        // remstate:      Reminder state
        // descr_by_type: Hash from reminder type -> descr
        // action_cts:    Number of actions for each type
        // app_badge:     App's correct badge count now
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

            // Head or body for day n
            function hbn(hb, n) {
                return hb[Math.min(n, hb.length) - 1];
            }
            // Notification for day n
            function notifn(heads, bodies, n) {
                var notif = {};
                notif.title = hbn(heads, n);
                notif.text = hbn(bodies, n);
                notif.at = reminder_time(remstate.start_time, n, desc.time);
                notif.data = { type: desc.type, sd: n };
                // Mark past times with negative ids.
                //
                notif.id = n < nnext ? -1 : 1;
                return notif;
            }

            var actct = action_cts[desc.type];
            for (var n = Math.min(actct + 1, nnext); n <= dur; n++) {
                if (n < nnext && desc.badge != 'count')
                    // Ignore past notifications with no badge count.
                    //
                    continue;
                if (desc.heads_all)
                    notifs.push(notifn(desc.heads_all, desc.bodies_all, n));
                else if (actct < n && desc.heads_lt)
                    notifs.push(notifn(desc.heads_lt, desc.bodies_lt, n));
                else if (actct >= n && desc.heads_ge)
                    notifs.push(notifn(desc.heads_ge, desc.bodies_ge, n));
            }
        });

        notifs.sort(by_at);

        // Assign ids and badge counts to notifications.
        //
        // Note that we use negative ids to mark notifications that are
        // for overdue actions. They will trigger immediately, but their
        // trigger event isn't interesting.
        //
        var notibadge = app_badge;
        notifs.forEach(function(notif) {
            notif.id *= g_nextid++;
            var desc = descr_by_type[notif.data.type];
            if (notif.id >= 0 && desc && desc.badge == 'count')
                if (action_cts[desc.type] < notif.data.sd)
                    notibadge++;
            notif.badge = notibadge;
        });

        // Seemingly $cordovaLocalNotification has a bug whereby
        // triggered reminders are rescheduled every time any new
        // reminder is scheduled. This causes notifications for N
        // overdue actions to pile up as (2^N-1) into a giant mess in
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

        // Otherwise broadcast the trigger event to interested parties.
        //
        $rootScope.$broadcast('reminderTriggered');

        // Recalculate reminders based on our latest info.
        //
        if (c_remstate && c_action_cts)
            sync_p(c_remstate, c_action_cts);
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

    function sync_p(remstate, action_cts)
    {
        // Return a promise to update notifications and badge count
        // according to the reminder state and the actions user has
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

        // Make sure action_cts has an entry for every reminder type.
        //
        remstate.descs.forEach(function(desc) {
            if (! (desc.type in action_cts))
                action_cts[desc.type] = 0;
        });

        // Figure out what the badge count should be for the app.
        //
        var app_badge = 0;
        remstate.descs.forEach(function(desc) {
            if (desc.badge == 'count') {
                var due = sday - (daysec >= desc.time ? 0 : 1);
                app_badge += Math.max(0, due - action_cts[desc.type]);
            }
        });

        // Remove all old notifications, schedule new ones, set app
        // badge.
        //
        return $cordovaLocalNotification.cancelAll()
        .then(function(_) {
            var notifsn =
                notifications_new(remstate, descr_by_type, action_cts,
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
        sync: function(descs, start_time, end_time, action_cts) {
            // Return a promise to schedule the reminders for a study.
            // The promise resolves to null.
            //
            // descs       Descriptor of the reminders (below)
            // start_time  Start time (Epoch time, midnight 00:00:00 first day)
            // end_time    End time (Epoch time, midnight 23:59:59+1 last day)
            // action_cts  Counts of actions by user
            //
            // descs is an array of descriptors that look like this:
            //
            // {
            //     type: type of reminder
            //     time: time of reminder (number; seconds after midnight)
            //     heads_lt: headings if action required
            //     bodies_lt: bodies if action required
            //     heads_ge: headings if no action required
            //     bodies_ge: bodies if no action required
            //     heads_all: headings for all cases
            //     bodies_all: bodies for all cases
            //     badge: 'count', 'pass'
            // }
            //
            // The 'type' field of a descriptor gives the type of the
            // reminder, in essence a unique name. Example: 'morning'.
            //
            // The 'heads_xxx' and 'bodies_xxx' fields are arrays of
            // text that are issued to the user as part of the reminder:
            //
            // If 'heads_all' is present, a reminder is always issued,
            // and 'heads_all' and 'bodies_all' are used for its text.
            // Otherwise, if 'heads_lt' is present, a reminder is issued
            // when the associated action hasn't been performed, using
            // 'heads_lt' and 'bodies_lt'. Similarly (if 'heads_all'
            // isn't present), if 'heads_ge' is present, a reminder is
            // issued when the associated action has been performed,
            // using 'heads_ge' and 'bodies_ge'.
            //
            // The 'badge' field tells how the reminder should affect
            // the badge. If the value is 'count', the number of
            // unperformed actions associated with the reminder is added
            // to the badge count. If the value is 'pass', the badge
            // count is unaffected by the reminder.
            // 
            // 'action_cts' is a hash giving the number of actions of
            // each type that have been performed. I.e., the keys are
            // reminder types and the values are action counts.
            //
            c_remstate = {};
            c_remstate.descs = angular.copy(descs);
            c_remstate.descs.sort(by_time);
            c_remstate.start_time = start_time;
            c_remstate.end_time = end_time;
            c_action_cts = angular.copy(action_cts);

            return sync_p(c_remstate, c_action_cts);
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
