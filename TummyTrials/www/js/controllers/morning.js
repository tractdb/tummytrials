// morning.js     Handling of morning reminder
//
// The morning reminder is acknowledged by opening or resuming the app
// after the reminder has been delivered. This module takes care of the
// details.
//
// This module is autonomous, driven by lifecycle events and by the
// reminderTriggered event broadcast by Reminders.
//

'use strict';


function sec_after_midnight(TDate)
{
    // How many seconds after midnight is it right now?
    //
    var now = new TDate();
    return (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
}


function set_reminded_p(TDate, Reminders, Experiments)
{
    // If the morning reminder hasn't been acknowledged for the day,
    // acknowledge it. Then resynchronize the reminder mechanism (to
    // clear the badge).
    //
    // This function is called whenever the app is restarted or resumed.
    // As an edge case, it's also called if the app is already running
    // when the morning reminder is delivered.
    //
    return Experiments.getCurrent()
    .then(function(curex) {
        if (!curex || !curex.remdescrs)
            return null;

        // (Make sure transform is current.)
        //
        Experiments.set_transform(curex);

        var dur = Experiments.study_duration(curex);
        var sd = Experiments.study_day_today(curex);
        if (sd < 1 || sd > dur)
            return null;
        var i;
        for (i = 0; i < curex.remdescrs.length; i++)
            if (curex.remdescrs[i].type == 'morning' &&
                !curex.remdescrs[i].reminderonly)
                break;
        if (i >= curex.remdescrs.length)
            return null; // No morning reminder: not really possible
        if (sec_after_midnight(TDate) < curex.remdescrs[i].time)
            return null; // Reminder not issued yet
        var rep;
        if (!Array.isArray(curex.reports) || !curex.reports[sd - 1])
            rep = Experiments.report_new(sd);
        else
            rep = curex.reports[sd - 1];
        if (rep.morning_reminded)
            return null; // Already confirmed the reminder
        rep.morning_reminded = true;
        rep.morning_reminded_time = Math.floor(TDate.now() / 1000);
        return Experiments.put_report_p(curex.id, rep)
        .then(function(_) {
            // Get current experiment with new report.
            //
            return Experiments.getCurrent();
        })
        .then(function(curex2) {
            if (!curex2)
                return null; // Shouldn't happen; but nothing to sync
            var rd = curex2.remdescrs;
            var st = curex2.start_time;
            var et = curex2.end_time;
            var rt = Experiments.report_tally(curex2);
            return Reminders.sync(rd, st, et, rt);
        });
    });
}

(angular.module('tummytrials.morning',
    [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.experiments' ])

.run(function($ionicPlatform, $rootScope, TDate, Reminders, Experiments) {
    $ionicPlatform.ready(function() {

        // Check now (at app startup).
        //
        set_reminded_p(TDate, Reminders, Experiments);

        // Check whenever the app resumes.
        //
        $rootScope.$on('appResume',
            function(ev) {
                set_reminded_p(TDate, Reminders, Experiments);
            }
        );

        // Check when a reminder is triggered while the app is active.
        //
        $rootScope.$on('reminderTriggered',
            function(ev) {
                set_reminded_p(TDate, Reminders, Experiments);
            }
        );
    });
})
);
