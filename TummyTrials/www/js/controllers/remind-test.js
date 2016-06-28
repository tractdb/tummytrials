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

    // Descriptors for when the user is behind for all actions.
    //
    var behind_descs = [
       { type: 'sync1_A',
          time: 0, // Fix up in test_sync_1
          badge: 'count',
          heads_all: ['First Reminder'],
          bodies_all: ['Badge goes to 1']
        },
       { type: 'sync1_B',
          time: 0, // Fix up in test_sync_1
          badge: 'pass',
          heads_all: ['Second Reminder'],
          bodies_all: ['Badge stays at 1']
        },
       { type: 'sync1_C',
          time: 0, // Fix up in test_sync_1
          badge: 'pass',
          heads_ge: ['Hidden Reminder'],
          bodies_ge: ['This reminder should not appear']
        },
       { type: 'sync1_D',
          time: 0, // Fix up in test_sync_1
          badge: 'count',
          heads_lt: ['Third Reminder'],
          bodies_lt: ['Badge goes to 2']
        },
       { type: 'sync1_E',
          time: 0, // Fix up in test_sync_1
          badge: 'pass',
          heads_lt: ['Fourth Reminder'],
          bodies_lt: ['Badge stays at 2'],
          heads_ge: ['Hidden Reminder'],
          bodies_ge: ['This reminder should not appear']
        },
       { type: 'sync1_F',
          time: 0, // Fix up in test_sync_1
          badge: 'pass',
          heads_lt: ['Fifth Reminder'],
          bodies_lt: ['Badge stays at 2']
        },
       { type: 'sync1_G',
          time: 0, // Fix up in test_sync_1
          badge: 'count',
          heads_lt: ['Sixth Reminder'],
          bodies_lt: ['Badge goes to 3'],
          heads_ge: ['Hidden Reminder'],
          bodies_ge: ['This reminder should not appear']
        },
       { type: 'sync1_H',
          time: 0, // Fix up in test_sync_1
          badge: 'count',
          heads_ge: ['Hidden Reminder'],
          bodies_ge: ['This reminder should not appear']
        }
    ];

    var stays0 = ['Badge stays at 0'];

    var caughtup_descs = [
       { type: 'sync2_A',
          time: 0, // Fix up in test_sync_2
          badge: 'count',
          heads_all: ['First Reminder'],
          bodies_all: stays0
        },
       { type: 'sync2_B',
          time: 0, // Fix up in test_sync_2
          badge: 'pass',
          heads_all: ['Second Reminder'],
          bodies_all: stays0
        },
       { type: 'sync2_C',
          time: 0, // Fix up in test_sync_2
          badge: 'pass',
          heads_ge: ['Third Reminder'],
          bodies_ge: stays0
        },
       { type: 'sync2_D',
          time: 0, // Fix up in test_sync_2
          badge: 'count',
          heads_lt: ['Hidden Reminder'],
          bodies_lt: ['This reminder should not appear']
        },
       { type: 'sync2_E',
          time: 0, // Fix up in test_sync_2
          badge: 'pass',
          heads_lt: ['Hidden Reminder'],
          bodies_lt: ['This reminder should not appear'],
          heads_ge: ['Fourth Reminder'],
          bodies_ge: stays0
        },
       { type: 'sync2_F',
          time: 0, // Fix up in test_sync_2
          badge: 'pass',
          heads_lt: ['Hidden Reminder'],
          bodies_lt: ['This reminder should not appear']
        },
       { type: 'sync2_G',
          time: 0, // Fix up in test_sync_2
          badge: 'count',
          heads_lt: ['Hidden Reminder'],
          bodies_lt: ['This reminder should not appear'],
          heads_ge: ['Fifth Reminder'],
          bodies_ge: stays0
        },
       { type: 'sync2_H',
          time: 0, // Fix up in test_sync_2
          badge: 'count',
          heads_ge: ['Sixth Reminder'],
          bodies_ge: stays0
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

    function test_remind(descr, start_time, actct, n, state)
    {
        // Return a notification object for the given reminder
        // descriptor and other state. The return value looks like what
        // Reminders.list() returns. If there is no reminder for the
        // given state, return null. (For example, there's usually no
        // reminder if the action has already been performed.)
        //
        function nthstr(a) {
            if (n > a.length) return a[a.length-1]; else return a[n-1];
        }
        var remind = {};
        remind.badge = 0; // Caller should fix up later
        remind.data = { type: descr.type, sd: n };
        remind.id = 0; // Caller should fix up later
        remind.title = null;
        if (descr.heads_all) {
            remind.title = nthstr(descr.heads_all);
            remind.text = nthstr(descr.bodies_all);
        } else if (actct < n && descr.heads_lt) {
            remind.title = nthstr(descr.heads_lt);
            remind.text = nthstr(descr.bodies_lt);
        } else if (actct >= n && descr.heads_ge) {
            remind.title = nthstr(descr.heads_ge);
            remind.text = nthstr(descr.bodies_ge);
        }

        // If there's no title, no reminder for this situation.
        // 
        if (remind.title === null)
            return null;

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

    function expected_reminders(descs, startt, endt, action_cts, baseid, moment)
    {
        // Return the expected reminders after syncing at the given
        // moment, given the supplied reminder state. Times are sec
        // since Unix epoch.
        //
        // In essence this duplicates the code in reminders.js that
        // calculates the current reminders. The hope is that the two
        // independent implementations can find errors in each other.
        //
        var daysec = 24 * 60 * 60; // Seconds in a day
        var dayct = Math.round((endt - startt) / daysec);

        // Make sure all types are represented in action_cts.
        //
        descs.forEach(function(d) {
            if (!(d.type in action_cts))
                action_cts[d.type] = 0;
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

        var expected = [];
        descs.forEach(function(desc) {
            var n0; // Day of next reminder of the type
            if (dos <= 0)
                n0 = 1; // Study hasn't started yet
            else
                n0 = Math.min(dayct + 1, dos + (mtime < desc.time ? 0 : 1));

            var actct = action_cts[desc.type];
            for (var n = n0; n <= dayct; n++) {
                var r = test_remind(desc, startt, actct, n, 'scheduled');
                if (r != null)
                    expected.push(r);
            }
        });


        expected.sort(by_at);

        // We keep only the latest overdue reminder, due to
        // $cordovaLocalNotification bug (see reminders.js).
        //
        // while (expected.length > 1 && expected[1].state == 'triggered')
        //     expected.splice(0, 1);

        // Set ids and badge counts.
        //
        var badgect = 0;
        expected.forEach(function(n) {
            n.id = baseid++;
            if (n.state == 'triggered')
                n.id = -n.id;
            var descr = descr_by_type(descs, n.data.type);
            if (n.state == 'scheduled' && descr &&
                descr.badge == 'count' && action_cts[descr.type] < n.data.sd)
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

        for (var i = 0; i < behind_descs.length; i++) {
            behind_descs[i].time = nowsec + 30 + i * 20;
        }

        var st = study_start_time();
        var et = study_end_time(test_duration);
        var mom = Math.floor(Date.now() / 1000);

        return Reminders.clear()
        .then(function(_) { return Reminders.sync(behind_descs, st, et, {}); })
        .then(function(_) { return Reminders.list(); })
        .then(function(notifs) {
            var expected = expected_reminders(behind_descs, st, et, {}, 1, mom);
            validate_reminds_equal(notifs, expected, 'testSync 1');
            console.log('Please exit to home screen (touch home button)');
            console.log('You should see six notifications');
            console.log('Badge should go to 1 -- 1 -- 2 -- 2 -- 2 -- 3');
            console.log('Notification center should contain all 6');
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
            throw new Error("testSync 2 no notifications");
        if (notifs0[0].at < nowepoch - 600)
            console.log('testSync 2 notifications suspiciously old');
        var time0 = (notifs0[0].at - st) - 30;
        var id0 = Math.abs(notifs0[0].id);

        // Reestablish the times used in test_sync_1;
        //
        for (var i = 0; i < behind_descs.length; i++) {
            behind_descs[i].time = time0 + 30 + i * 20;
        }

        // Current moment (trust that it's after all reminder times).
        //
        var mom = Math.floor(Date.now() / 1000);

        // Verify that we see what we expect (before syncing). Basically
        // any reminders scheduled for before the current moment should
        // be in the 'triggered' state.
        //
        var expected = expected_reminders(behind_descs, st, et, {}, id0, time0);
        expected.forEach(function(notif) {
            if (notif.at <= mom)
                notif.state = 'triggered';
        });
        validate_reminds_equal(notifs0, expected, 'testSync 2 before');

        // Now see what notifications are generated when all actions
        // have been performed.
        //
        //
        var d = new Date(); // Now
        var nowsec =
            d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

        for (var i = 0; i < caughtup_descs.length; i++) {
            caughtup_descs[i].time = nowsec + 30 + i * 20;
        }

        var actcts = {};
        caughtup_descs.forEach(function(desc) {
            actcts[desc.type] = 1;
        });

        return Reminders.clear()
        .then(function(_) {
            return Reminders.sync(caughtup_descs, st, et, actcts);
        })
        .then(function(_) { return Reminders.list(); })
        .then(function(notifs) {
            var expected = expected_reminders(caughtup_descs, st, et, actcts,
                                                1, mom);
            validate_reminds_equal(notifs, expected, 'testSync 2 after');
            console.log('Please exit to home screen (touch home button)');
            console.log('Badge should have disappeared');
            console.log('You should see six notifications');
            console.log('Badge should stay gone');
            console.log('Notification center should contain all 6');
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
            // Return a promise to perform one of three test steps. If
            // there's no trace of previous steps, do step 1:
            // test_sync_1. If step 1 has been done but not step t, do
            // step 2: test_sync_2. If step 2 has been done, clean up.
            //
            return Reminders.list()
            .then(function(notifs) {
                var sync1_residue = 0, sync2_residue = 0;

                for (var i = 0; i < notifs.length; i++) {
                    if (notifs[i].data.type.search(/^sync1_/) >= 0)
                        sync1_residue++;
                    else if (notifs[i].data.type.search(/^sync2_/) >= 0)
                        sync2_residue++;
                }
                if (sync2_residue > 0)
                    return test_sync_cleanup(notifs);
                if (sync1_residue > 0)
                    return test_sync_2(notifs);
                return test_sync_1(notifs);
            })
        },

        validateSync: function(descs, startt, endt, action_cts) {
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
                    var desc = descr_by_type(descs, notifs[j].data.type);
                    if (notifs[j].state == 'triggered' &&
                        desc && desc.reminderonly)
                        notifs.splice(j, 1);
                }

                var baseid = notifs.length > 0 ? Math.abs(notifs[0].id) : 0;
                var m = Math.trunc(Date.now() / 1000);
                var exp = expected_reminders(descs, startt, endt, action_cts,
                                             baseid, m);
                validate_reminds_equal(notifs, exp, 'validateSync');
                return null;
            });
        }
    };
})

)
