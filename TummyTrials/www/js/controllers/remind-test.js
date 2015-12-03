// remind-test.js     Some tests of the reminders module
//
// It's exceptionally tricky to test the reminder module because much of
// the behavior to be tested happens when the app is *not* active. Hence
// you can't run code to see if things worked right.
//
// We currently depend on cooperation of the user, and we run different
// parts of the test at separate startup times.
//
// To run the tests, currently need to start the app in the Xcode
// debugger three times. The third time is just for cleanup.
//

'use strict';

(angular.module('tummytrials.remind-test', [ 'tractdb.reminders' ])

.factory('RemindTest', function(Reminders) {
    var test_duration = 3; // Days in fake study

    var test_descs = [
        { type: 'testSyncA',
          time: 0, // Fix up in test_sync_0
          heads: ['First Reminder'],
          bodies: ['Badge goes to 1']
        },
        { type: 'testSyncB',
          reminderonly: true,
          time: 0, // Fix up in test_sync_1
          heads: ['Second Reminder', 'Tomorrow Head'],
          bodies: ['Badge stays at 1', 'Tomorrow Body']
        },
        { type: 'testSyncC',
          time: 0, // Fix up in test_sync_1
          heads: ['Third Reminder'],
          bodies: ['Badge goes to 2']
        }
    ];

    function by_at(a, b)
    {
        if (a.at < b.at) return -1;
        if (a.at > b.at) return 1;
        return 0;
    }

    function study_start_time()
    {
        // The study start time for the tests is midnight at the
        // beginning of today. (Don't run the tests just before
        // midnight.)
        //
        var d = new Date(); // Now
        var m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.trunc(m.getTime() / 1000); // Epoch time
    }

    function study_end_time(duration)
    {
        // The study end time for the tests is midnight at the beginning
        // of duration days from now. (Don't run the tests just before
        // daylight savings switchover.)
        //
        return study_start_time() + duration * 24 * 60 * 60;
    }


    function at_time(start_time, n, time)
    {
        var s = new Date(start_time * 1000);
        var a = new Date(s.getFullYear(), s.getMonth(), s.getDate() + n - 1,
                         Math.trunc(time / 3600),
                         Math.trunc((time % 3600) / 60),
                         Math.trunc(time % 60));
        return Math.trunc(a.getTime() / 1000);
    }

    function descr_by_type(descs, ty)
    {
        for (var i = 0; i < descs.length; i++)
            if (descs[i].type == ty)
                return descs[i];
        return null;
    }

    function test_remind(descr, start_time, n, state)
    {
        // Return a notification object for the given reminder
        // descriptor and other state. The return value looks like what
        // Reminders.list() returns.
        //
        function nthstr(a) {
            if (n > a.length) return a[a.length-1]; else return a[n-1];
        }
        var remind = {};
        remind.badge = 0; // Caller should fix up later
        remind.data = descr.type;
        remind.id = 0; // Caller should fix up later
        remind.title = nthstr(descr.heads);
        remind.text = nthstr(descr.bodies);
        remind.at = at_time(start_time, n, descr.time);
        remind.sound = 'res://platform_default';
        remind.state = state;
        return remind;
    }

    function validate_reminds_equal(saw, exp, tag)
    {
        if (false) {
            // (For debugging.)
            //
            console.log('validate_reminds_equal, saw',
                        JSON.stringify(saw, null, 4));
            console.log('validate_reminds_equal, expected',
                        JSON.stringify(exp, null, 4));
        }
        if (!angular.equals(saw, exp)) {
            console.log('validate_reminds_equal<' + tag + '>: failure');
            throw new Error('validate_reminds_equal<' + tag + '>');
        }
        console.log('validate_reminds_equal<' + tag + '>: success');
    }

    function expected_reminders(descs, startt, endt, report_cts, baseid, moment)
    {
        // Return the expected reminders after syncing at the given
        // moment, given the supplied reminder state. Times are sec
        // since Unix epoch.
        //
        var daysec = 24 * 60 * 60; // Seconds in a day
        var dayct = Math.round((endt - startt) / daysec);

        // Make sure all types are represented in report_cts.
        //
        descs.forEach(function(d) {
            if (!(d.type in report_cts))
                report_cts[d.type] = 0;
        });

        // Which day of the study is it?
        //
        var dos;
        if (moment < startt)
            dos = 0;
        else
            dos = 1 + Math.trunc((moment - startt) / daysec);

        // How many seconds past midnight is the moment?
        //
        var md = new Date(moment * 1000);
        var mtime = md.getHours() * 3600 + md.getMinutes() * 60 +
                    md.getSeconds();

        // Cumulated badge count.
        //
        var badgect = 0;

        var expected = [];
        descs.forEach(function(desc) {
            var n0; // Day of next reminder of the type
            if (dos <= 0)
                n0 = 1; // Study hasn't started yet
            else
                n0 = Math.min(dayct + 1, dos + (mtime < desc.time ? 0 : 1));
            // Previously issued reminders with no reports.
            //
            if (!desc.reminderonly)
                for (var n = report_cts[desc.type] + 1; n < n0; n++) {
                    expected.push(test_remind(desc, startt, n, 'triggered'));
                    badgect++;
                }

            // Reminders to be issued in the future.
            //
            var n;
            if (desc.reminderonly)
                n = n0;
            else
                // (Reports might conceivably come in early.)
                //
                n = Math.max(n0, report_cts[desc.type] + 1);
            for (; n <= dayct; n++)
                expected.push(test_remind(desc, startt, n, 'scheduled'));
        });

        expected.sort(by_at);

        // We keep only the latest overdue reminder, due to
        // $cordovaLocalNotification bug (see reminders.js).
        //
        while (expected.length > 1 && expected[1].state == 'triggered')
            expected.splice(0, 1);

        // Set ids and badge counts.
        //
        expected.forEach(function(n) {
            n.id = baseid++;
            if (n.state == 'triggered')
                n.id = -n.id;
            var descr = descr_by_type(descs, n.data);
            if (n.state == 'scheduled' && descr && !descr.reminderonly)
                badgect++;
            n.badge = badgect;
        });

        return expected;
    }

    function test_sync_1(notifs0)
    {
        var d = new Date(); // Now
        var nowsec =
            d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

        test_descs[0].time = nowsec + 30; // 30 seconds from now
        test_descs[1].time = nowsec + 50; // 20 seconds after that
        test_descs[2].time = nowsec + 70; // 20 seconds after that

        var st = study_start_time();
        var et = study_end_time(test_duration);
        var mom = Math.floor(Date.now() / 1000);

        return Reminders.clear()
        .then(function(_) { return Reminders.sync(test_descs, st, et, []); })
        .then(function(_) { return Reminders.list(); })
        .then(function(notifs) {
            var expected = expected_reminders(test_descs, st, et, {}, 1, mom);
            validate_reminds_equal(notifs, expected, 'testSync 1');
            console.log('Please exit to home screen (touch home button)');
            console.log('You should see three notifications');
            console.log('Badge should go to 1 -- 1 -- 2');
            console.log('Notification center should contain all 3');
        })
    }

    function test_sync_2(notifs0)
    {
        var st = study_start_time();
        var et = study_end_time(test_duration);
        var nowepoch = Math.trunc(Date.now() / 1000);

        // Use time of first notification as a base for the expected
        // times of the rest.
        //
        if (notifs0.length < 1)
            throw new Error("testSync 2 A (no notifications)");
        if (notifs0[0].at < nowepoch - 600)
            console.log('testSync 2 notifications suspiciously old');
        var time0 = (notifs0[0].at - st) - 30;
        var id0 = Math.abs(notifs0[0].id);

        // Reestablish the times used in test_sync_1;
        //
        test_descs[0].time = time0 + 30;
        test_descs[1].time = time0 + 50;
        test_descs[2].time = time0 + 70;

        // Current moment (trust that it's after all three reminder
        // times).
        //
        var mom = Math.floor(Date.now() / 1000);

        // Verify that we see what we expect (before syncing). Basically
        // any reminders scheduled for before the current moment should
        // be in the 'triggered' state.
        //
        var expected = expected_reminders(test_descs, st, et, {}, id0, time0);
        expected.forEach(function(notif) {
            if (notif.at <= mom)
                notif.state = 'triggered';
        });
        validate_reminds_equal(notifs0, expected, 'testSync 2 before');

        // Make all reports that are due, then check again.
        //
        var repcts = {};
        test_descs.forEach(function(desc) {
            if (!desc.reminderonly)
                repcts[desc.type] = 1;
        });

        return Reminders.sync(test_descs, st, et, repcts)
        .then(function(_) { return Reminders.list(); })
        .then(function(notifs) {
            var expected = expected_reminders(test_descs, st, et, repcts,
                                                id0, mom);
            validate_reminds_equal(notifs, expected, 'testSync 2 after');
            console.log('Please exit to home screen (touch home button)');
            console.log('Badge should have disappeared');
            console.log('Notification center should have no reminders');
        });
    }

    function test_sync_cleanup(notifs0)
    {
        return Reminders.clear()
        .then(function(_) {
            console.log('Test notifications have been cleared');
        });
    }

    return {
        testSync: function() {
            // Return a promise to perform one of three tests. (A) If
            // there are no test notifications, set up some
            // notifications and ask user to see if they get delivered
            // as expected. (B) If there is a test notification for an
            // overdue report, simulate the report. Then ask user to see
            // whether the badge has changed. (C) If there are
            // notifications, but none for an overdue report, clean up
            // by removing all the notifications.
            //
            return Reminders.list()
            .then(function(notifs) {
                var testnotif = -1, testnotiftrig = -1;

                for (var i = 0; i < notifs.length; i++) {
                    var desc = descr_by_type(test_descs, notifs[i].data);
                    if (notifs[i].data.search(/^testSync/) >= 0) {
                        if (testnotif < 0)
                            testnotif = i;
                        if (notifs[i].state == 'triggered' &&
                            desc &&
                            !desc.reminderonly &&
                            testnotiftrig < 0) {
                            testnotiftrig = i;
                            break;
                        }
                    }
                }
                if (testnotif < 0)
                    return test_sync_1(notifs);
                if (testnotiftrig >= 0)
                    return test_sync_2(notifs);
                return test_sync_cleanup(notifs);
            })
        },

        validateSync: function(descs, startt, endt, report_cts) {
            // Return a promise to validate that the currently scheduled
            // reminders are correct for the given descriptors, start
            // time, end time, and reports.
            //
            // The promise resolves to null; results are written to the
            // console.
            //

            return Reminders.list()
            .then(function(notifs) {
                // We are not concerned with pure reminders that have
                // been triggered. In theory users will deal with them
                // at their leisure.
                //
                for (var j = notifs.length - 1; j >= 0; j--) {
                    var desc = descr_by_type(descs, notifs[j].data);
                    if (notifs[j].state == 'triggered' &&
                        desc && desc.reminderonly)
                        notifs.splice(j, 1);
                }

                var baseid = notifs.length > 0 ? Math.abs(notifs[0].id) : 0;
                var m = Math.trunc(Date.now() / 1000);
                var exp = expected_reminders(descs, startt, endt, report_cts,
                                             baseid, m);
                validate_reminds_equal(notifs, exp, 'validateSync');
                return null;
            });
        }
    };
})

)
