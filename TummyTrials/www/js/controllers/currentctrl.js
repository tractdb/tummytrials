// currentctrl.js     Controller for 'Current Trial' tab
//

'use strict';

(angular.module('tummytrials.currentctrl',
                [ 'tummytrials.lc', 'tummytrials.text',
                  'tummytrials.experiments' ])

.controller('CurrentCtrl', function($scope, LC, Text, Experiments) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var text = $scope.text;
        var cur = $scope.study_current;
        $scope.study_reminders = [];
        if (cur && cur.remdescrs) {
            // Info for reminders.
            //     reportdue  report is due (bool)
            //     schedmsg   ex: 'Your breakfast reminder is set for 9 am.'
            //     logmsg     ex: 'Log Breakfast Compliance' (null => no button)
            //     disabled   button should be disabled (bool)
            //     logstate   ex: 'during' (angular-ui state for logging)
            //
            var rinfo = [];

            // If the user falls behind in reporting, there can be
            // reports due for days in the past. Or there can be reports
            // due now or sometime later today. We'll guide the user to
            // make the earliest such report. So figure out its type.
            //
            var rep_type = null; // Next report to make; null => done thru today
            var sdn = Math.min(Experiments.study_day_today(cur),
                               Experiments.study_duration(cur));

            found: for (var sd = 1; sd <= sdn; sd++) {
                if (!cur.reports || !cur.reports[sd - 1]) {
                    // No report object at all; so, first report of day
                    // is earliest report due.
                    //
                    for (var i = 0; i < cur.remdescrs.length; i++) {
                        if (!cur.remdescrs[i].reminderonly) {
                            rep_type = cur.remdescrs[i].type;
                            break found;
                        }
                    }
                    break found; // (No reportable reminders at all?)
                }
                var rsd = cur.reports[sd - 1];
                for (var i = 0; i < cur.remdescrs.length; i++) {
                    if (cur.remdescrs[i].reminderonly)
                        continue;
                    var ty = cur.remdescrs[i].type;
                    if (!Experiments.report_made(rsd, ty)) {
                        rep_type = ty;
                        break found;
                    }
                }
            }

            var rep_tally = Experiments.report_tally(cur);

            cur.remdescrs.forEach(function(rd) {
                var info = {};
                info.reportdue =
                    !rd.reminderonly &&
                    rep_tally[rd.type] < Experiments.study_day_today(cur);
                info.disabled = rd.type != rep_type;
                var msg, name;
                msg = text.current.reminder_schedule_template;
                name = text.current[rd.type + '_reminder_name'] || rd.type;
                msg = msg.replace('{NAME}', name);
                msg = msg.replace('{WHEN}', LC.timestr(rd.time || 0));
                info.schedmsg = msg;
                if (rd.reminderonly) {
                    info.logmsg = null;
                    info.logstate = 'none';
                } else {
                    info.logmsg = text.current[rd.type + '_reminder_logmsg'];
                    info.logmsg = info.logmsg || ('Log ' + rd.type);
                    switch(rd.type) {
                        case 'breakfast': info.logstate = 'during'; break;
                        case 'symptomEntry': info.logstate = 'post'; break;
                        default: info.logstate = 'none'; break;
                    }
                }
                rinfo.push(info);
            });

            $scope.study_reminders = rinfo;
        }
    });
})

);
