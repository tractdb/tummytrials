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
    var sync_duration = 3; // Days in fake study

    var descs = [
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
        if (!descr.reminderonly) remind.every = 'day';
        remind.at = at_time(start_time, n, descr.time);
        remind.sound = 'res://platform_default';
        remind.state = state;
        return remind;
    }

    function validate_reminds_equal(as, bs, tag)
    {
        if (!angular.equals(as, bs)) {
            console.log('validate_reminds_equal<' + tag + '>: failure');
            throw new Error('validate_reminds_equal<' + tag + '>');
        }
        console.log('validate_reminds_equal<' + tag + '>: success');
    }

    function expected_round_1()
    {
        var start = study_start_time();
        var expected = [];
        for (var i = 0; i < descs.length; i++) {
            var reps = descs[i].reminderonly ? sync_duration : 1;
            for (var j = 1; j <= reps; j++)
                expected.push(test_remind(descs[i], start, j, 'scheduled'));
        }
        expected.sort(by_at);
        var badge = 0;
        expected.forEach(function(notif, ix) {
            notif.id = ix + 1;
            if (notif.every) badge++;
            notif.badge = badge;
        });
        return expected;
    }

    function test_sync_1(notifs0)
    {
        var d = new Date(); // Now
        var nowsec =
            d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        descs[0].time = nowsec + 30; // 30 seconds from now
        descs[1].time = nowsec + 50; // 20 seconds after that
        descs[2].time = nowsec + 70; // 20 seconds after that

        return Reminders.clear()
        .then(function(_) {
            return Reminders.sync(descs, study_start_time(),
                                    study_end_time(sync_duration), []);
        })
        .then(function(_) {
            return Reminders.list();
        })
        .then(function(notifs) {
            var expected = expected_round_1();
            validate_reminds_equal(notifs, expected, 'testSync 1');
            console.log('Please exit to home screen (touch home button)');
            console.log('You should see three notifications');
            console.log('Badge should go to 1 -- 1 -- 2');
            console.log('Notification center should contain all 3');
        })
    }

    function test_sync_2(notifs0)
    {
        var start = study_start_time();
        var end = study_end_time(sync_duration);
        var nowepoch = Math.trunc(Date.now() / 1000);

        // Use time of first notification as a base for the expected
        // times of the rest.
        //
        if (notifs0.length < 1)
            throw new Error("testSync 2 A (no notifications)");
        if (notifs0[0].at < nowepoch - 600)
            console.log('testSync 2 notifications suspiciously old');
        var time0 = notifs0[0].at - start;

        // Reestablish the times used in test_sync_1;
        //
        descs[0].time = time0;
        descs[1].time = time0 + 20;
        descs[2].time = time0 + 40;

        // Verify that we see what we expect. The only difference is
        // that the first three have now been triggered.
        //
        var expected = expected_round_1();
        for (var i = 0; i < 3; i++)
            expected[i].state = 'triggered';
        validate_reminds_equal(notifs0, expected, 'testSync 2 before');

        // Make all reports that are due, then check again.
        //
        var reps = [];

        descs.forEach(function(desc) {
            if (!desc.reminderonly)
                reps.push({ type: desc.type });
        });

        return Reminders.sync(descs, start, end, reps)
        .then(function(_) { return Reminders.list(); })
        .then(function(notifs) {
            var expected = [];
            notifs0.forEach(function(notif) {
                if (notif.state == 'triggered' && !notif.every) {
                    // This notification will be left in the
                    // Notification Center. So we expect to see it in
                    // the list.
                    //
                    expected.push(notif);
                }
            });
            for (var i = 0; i < descs.length; i++) {
                var reps = descs[i].reminderonly ? sync_duration : 2;
                for (var j = 2; j <= reps; j++)
                    expected.push(test_remind(descs[i], start, j,
                                    'scheduled'));
            }
            expected.sort(by_at);
            var badge = 0;
            var nextid = notifs.length + 1;
            expected.forEach(function(notif) {
                if(notif.id == 0) {
                    notif.id = nextid++;
                    if (notif.every) badge++;
                    notif.badge = badge;
                }
            });
            validate_reminds_equal(notifs, expected, 'testSync 2 after');
            console.log('Please exit to home screen (touch home button)');
            console.log('Badge should have disappeared');
            console.log('Notification center should have Second Reminder');
            console.log('(But it doesn\'t)');
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
            // Return a promise to perform one of three tests. If there
            // are no test notifications, set up some notifications and
            // ask user to see if they get delivered as expected. If
            // there is a test notification for a report that's due,
            // simulate the report. Then ask user to see whether the
            // badge has changed. If there are notifications, but none
            // for an undelivered report, clean up by removing all the
            // notifications.
            //
            return Reminders.list()
            .then(function(notifs) {
                var testnotif = -1, testnotiftrig = -1;

                for (var i = 0; i < notifs.length; i++)
                    if (notifs[i].data.search(/^testSync/) >= 0) {
                        if (testnotif < 0)
                            testnotif = i;
                        if (notifs[i].state == 'triggered' &&
                            notifs[i].every &&
                            testnotiftrig < 0) {
                            testnotiftrig = i;
                            break;
                        }
                    }
                    if (testnotif < 0)
                        return test_sync_1(notifs);
                    if (testnotiftrig >= 0)
                        return test_sync_2(notifs);
                    return test_sync_cleanup(notifs);
            })
        }
    };
})

)
